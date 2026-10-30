const express = require('express');
const router  = express.Router();
const pool    = require('../data/db');
const { authMiddleware } = require('./auth');

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle — trả về mảng mới, không mutate */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tạo snapshot câu hỏi đã shuffle cho 1 ứng viên.
 * - Thứ tự câu hỏi bị xáo trộn
 * - Với câu trắc nghiệm / multi_select: thứ tự đáp án cũng bị xáo trộn
 * - correct_answer được map lại theo key mới sau khi shuffle đáp án
 * - KHÔNG lưu correct_answer vào snapshot (ứng viên không được biết)
 */
function buildShuffledSnapshot(questions) {
  const shuffledQs = shuffleArray(questions);

  return shuffledQs.map((q, newOrder) => {
    const base = {
      original_id:   q.id,           // để map câu trả lời về question_id gốc
      display_order: newOrder + 1,
      question_type: q.question_type,
      content:       q.content,
      points:        q.points,
      ai_graded:     q.ai_graded,
      ai_rubric:     q.ai_rubric     || null,
      speaking_prompt: q.speaking_prompt || null,
    };

    // Xáo trộn đáp án cho trắc nghiệm / multi_select
    if (['multiple_choice', 'multi_select'].includes(q.question_type) && q.options) {
      const originalOptions = typeof q.options === 'string'
        ? JSON.parse(q.options)
        : q.options;

      // Shuffle thứ tự các lựa chọn
      const shuffledOptions = shuffleArray(originalOptions);

      // Gán lại key A/B/C/D theo thứ tự mới
      const keys = ['A', 'B', 'C', 'D', 'E', 'F'];
      const remappedOptions = shuffledOptions.map((opt, idx) => ({
        key:         keys[idx],
        text:        opt.text,
        original_key: opt.key,   // lưu key gốc để chấm điểm sau này
      }));

      // Map correct_answer sang key mới (KHÔNG expose ra client)
      const originalCorrect = q.correct_answer; // "A" hoặc "A,B"
      const correctKeys     = originalCorrect ? originalCorrect.split(',').map(k => k.trim()) : [];
      const newCorrectKeys  = correctKeys.map(ck => {
        const found = remappedOptions.find(o => o.original_key === ck);
        return found ? found.key : ck;
      });

      base.options              = remappedOptions;
      base.correct_answer_mapped = newCorrectKeys.join(','); // dùng để chấm, KHÔNG gửi cho ứng viên
    } else {
      base.options               = null;
      base.correct_answer_mapped = q.correct_answer || null;
    }

    return base;
  });
}

// ============================================================
// TESTS — Quản lý bộ đề
// ============================================================

// GET /api/tests — Lấy danh sách bộ đề
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { type, is_active } = req.query;

    let query = `
      SELECT
        t.*,
        a.username   AS created_by_name,
        COUNT(DISTINCT tq.id)  AS question_count,
        COUNT(DISTINCT ta.id)  AS assigned_count
      FROM tests t
      LEFT JOIN admins          a  ON a.id  = t.created_by
      LEFT JOIN test_questions  tq ON tq.test_id = t.id
      LEFT JOIN test_assignments ta ON ta.test_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (type)                  { query += ' AND t.type = ?';      params.push(type); }
    if (is_active !== undefined) { query += ' AND t.is_active = ?'; params.push(is_active); }

    query += ' GROUP BY t.id ORDER BY t.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tests/:id — Chi tiết bộ đề + câu hỏi
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [tests] = await pool.query(
      `SELECT t.*, a.username AS created_by_name
       FROM tests t
       LEFT JOIN admins a ON a.id = t.created_by
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (!tests.length) return res.status(404).json({ message: 'Không tìm thấy bộ đề' });

    const [questions] = await pool.query(
      `SELECT * FROM test_questions WHERE test_id = ? ORDER BY \`order\` ASC`,
      [req.params.id]
    );

    res.json({ ...tests[0], questions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tests — Tạo bộ đề mới (kèm câu hỏi)
router.post('/', authMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      title,
      type          = 'custom',
      time_limit    = 30,
      passing_score = 60,
      questions     = []
    } = req.body;

    if (!title)            return res.status(400).json({ message: 'Thiếu tên bộ đề' });
    if (!questions.length) return res.status(400).json({ message: 'Bộ đề cần ít nhất 1 câu hỏi' });

    const validTypes = ['excel_word', 'typing', 'english', 'chinese', 'custom'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: `type phải là: ${validTypes.join(' | ')}` });
    }

    const [result] = await conn.query(
      `INSERT INTO tests (title, type, time_limit, passing_score, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [title, type, time_limit, passing_score, req.user.id]
    );
    const testId = result.insertId;

    for (const q of questions) {
      const {
        question_type  = 'multiple_choice',
        order          = 1,
        content,
        options        = null,
        correct_answer = null,
        points         = 10,
        ai_graded      = 0,
        ai_rubric      = null
      } = q;

      if (!content) throw new Error('Câu hỏi thiếu nội dung (content)');

      if (['multiple_choice', 'multi_select'].includes(question_type) && !correct_answer) {
        throw new Error(`Câu hỏi trắc nghiệm thứ ${order} thiếu correct_answer`);
      }

      if (question_type === 'typing_sample') {
        const typingCount = questions.filter(x => x.question_type === 'typing_sample').length;
        if (typingCount > 1) throw new Error('Bộ đề typing chỉ được có 1 đoạn văn mẫu');
      }

      await conn.query(
        `INSERT INTO test_questions
           (test_id, question_type, \`order\`, content, options, correct_answer, points, ai_graded, ai_rubric)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          testId, question_type, order, content,
          options ? JSON.stringify(options) : null,
          correct_answer, points, ai_graded ? 1 : 0, ai_rubric
        ]
      );
    }

    await conn.commit();

    const [newTest]      = await conn.query('SELECT * FROM tests WHERE id = ?', [testId]);
    const [newQuestions] = await conn.query(
      'SELECT * FROM test_questions WHERE test_id = ? ORDER BY `order`',
      [testId]
    );

    res.status(201).json({
      message: 'Tạo bộ đề thành công',
      test: { ...newTest[0], questions: newQuestions }
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

// PUT /api/tests/:id — Cập nhật thông tin bộ đề (không sửa câu hỏi)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, time_limit, passing_score, is_active } = req.body;
    await pool.query(
      `UPDATE tests SET
         title         = COALESCE(?, title),
         time_limit    = COALESCE(?, time_limit),
         passing_score = COALESCE(?, passing_score),
         is_active     = COALESCE(?, is_active)
       WHERE id = ?`,
      [title, time_limit, passing_score, is_active, req.params.id]
    );
    res.json({ message: 'Cập nhật bộ đề thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/tests/:id/full — Cập nhật bộ đề + toàn bộ câu hỏi
router.put('/:id/full', authMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      title, type, time_limit, passing_score, is_active,
      questions = []
    } = req.body;

    const [tests] = await conn.query('SELECT id FROM tests WHERE id = ?', [req.params.id]);
    if (!tests.length) return res.status(404).json({ message: 'Không tìm thấy bộ đề' });

    await conn.query(
      `UPDATE tests SET
         title         = COALESCE(?, title),
         type          = COALESCE(?, type),
         time_limit    = COALESCE(?, time_limit),
         passing_score = COALESCE(?, passing_score),
         is_active     = COALESCE(?, is_active)
       WHERE id = ?`,
      [title, type, time_limit, passing_score, is_active, req.params.id]
    );

    if (questions.length) {
      const toUpdate = questions.filter(q => q.id);
      const toInsert = questions.filter(q => !q.id);
      const keepIds  = toUpdate.map(q => q.id);

      if (keepIds.length) {
        await conn.query(
          `DELETE FROM test_questions WHERE test_id = ? AND id NOT IN (?)`,
          [req.params.id, keepIds]
        );
      } else {
        await conn.query('DELETE FROM test_questions WHERE test_id = ?', [req.params.id]);
      }

      for (const q of toUpdate) {
        await conn.query(
          `UPDATE test_questions SET
             question_type  = COALESCE(?, question_type),
             \`order\`      = COALESCE(?, \`order\`),
             content        = COALESCE(?, content),
             options        = COALESCE(?, options),
             correct_answer = COALESCE(?, correct_answer),
             points         = COALESCE(?, points),
             ai_graded      = COALESCE(?, ai_graded),
             ai_rubric      = COALESCE(?, ai_rubric)
           WHERE id = ? AND test_id = ?`,
          [
            q.question_type ?? null,
            q.order         ?? null,
            q.content       ?? null,
            q.options ? JSON.stringify(q.options) : null,
            q.correct_answer ?? null,
            q.points         ?? null,
            q.ai_graded !== undefined ? (q.ai_graded ? 1 : 0) : null,
            q.ai_rubric ?? null,
            q.id, req.params.id
          ]
        );
      }

      for (const q of toInsert) {
        if (!q.content) throw new Error('Câu hỏi mới thiếu nội dung (content)');
        await conn.query(
          `INSERT INTO test_questions
             (test_id, question_type, \`order\`, content, options, correct_answer, points, ai_graded, ai_rubric)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.params.id,
            q.question_type  ?? 'multiple_choice',
            q.order          ?? 1,
            q.content,
            q.options ? JSON.stringify(q.options) : null,
            q.correct_answer ?? null,
            q.points         ?? 10,
            q.ai_graded      ? 1 : 0,
            q.ai_rubric      ?? null
          ]
        );
      }
    }

    await conn.commit();

    const [updated]   = await conn.query('SELECT * FROM tests WHERE id = ?', [req.params.id]);
    const [updatedQs] = await conn.query(
      'SELECT * FROM test_questions WHERE test_id = ? ORDER BY `order`',
      [req.params.id]
    );

    res.json({
      message: 'Cập nhật bộ đề thành công',
      test: { ...updated[0], questions: updatedQs }
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

// DELETE /api/tests/:id — Xóa bộ đề (chỉ được xóa nếu chưa assign)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [assigned] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM test_assignments WHERE test_id = ?',
      [req.params.id]
    );
    if (assigned[0].cnt > 0) {
      return res.status(400).json({
        message: `Không thể xóa — bộ đề đã được assign cho ${assigned[0].cnt} ứng viên`
      });
    }
    await pool.query('DELETE FROM tests WHERE id = ?', [req.params.id]);
    res.json({ message: 'Đã xóa bộ đề' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// QUESTIONS — Quản lý câu hỏi trong bộ đề
// ============================================================

router.post('/:id/questions', authMiddleware, async (req, res) => {
  try {
    const {
      question_type  = 'multiple_choice',
      order          = 1,
      content,
      options        = null,
      correct_answer = null,
      points         = 10,
      ai_graded      = 0,
      ai_rubric      = null
    } = req.body;

    if (!content) return res.status(400).json({ message: 'Thiếu nội dung câu hỏi' });

    const [result] = await pool.query(
      `INSERT INTO test_questions
         (test_id, question_type, \`order\`, content, options, correct_answer, points, ai_graded, ai_rubric)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.id, question_type, order, content,
        options ? JSON.stringify(options) : null,
        correct_answer, points, ai_graded ? 1 : 0, ai_rubric
      ]
    );
    res.status(201).json({ message: 'Thêm câu hỏi thành công', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/questions/:qid', authMiddleware, async (req, res) => {
  try {
    const { content, options, correct_answer, points, ai_graded, ai_rubric, order } = req.body;
    await pool.query(
      `UPDATE test_questions SET
         content        = COALESCE(?, content),
         options        = COALESCE(?, options),
         correct_answer = COALESCE(?, correct_answer),
         points         = COALESCE(?, points),
         ai_graded      = COALESCE(?, ai_graded),
         ai_rubric      = COALESCE(?, ai_rubric),
         \`order\`      = COALESCE(?, \`order\`)
       WHERE id = ? AND test_id = ?`,
      [
        content,
        options ? JSON.stringify(options) : null,
        correct_answer, points,
        ai_graded !== undefined ? (ai_graded ? 1 : 0) : null,
        ai_rubric, order,
        req.params.qid, req.params.id
      ]
    );
    res.json({ message: 'Cập nhật câu hỏi thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/questions/:qid', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM test_questions WHERE id = ? AND test_id = ?',
      [req.params.qid, req.params.id]
    );
    res.json({ message: 'Đã xóa câu hỏi' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// ASSIGNMENTS — Phân công bài test cho ứng viên
// ============================================================

// GET /api/tests/assignments/list
router.get('/assignments/list', authMiddleware, async (req, res) => {
  try {
    const { application_id, test_id, status } = req.query;

    let query = `
      SELECT
        ta.*,
        ap.full_name, ap.email, ap.position,
        t.title      AS test_title,
        t.type       AS test_type,
        t.time_limit,
        tr.percentage,
        tr.passed,
        tr.typing_wpm,
        tr.ai_summary,
        tr.graded_at,
        a.username   AS assigned_by_name
      FROM test_assignments ta
      JOIN applications  ap ON ap.id = ta.application_id
      JOIN tests          t ON t.id  = ta.test_id
      LEFT JOIN test_results tr ON tr.assignment_id = ta.id
      LEFT JOIN admins        a ON a.id = ta.assigned_by
      WHERE 1=1
    `;
    const params = [];

    if (application_id) { query += ' AND ta.application_id = ?'; params.push(application_id); }
    if (test_id)        { query += ' AND ta.test_id = ?';        params.push(test_id); }
    if (status)         { query += ' AND ta.status = ?';         params.push(status); }

    query += ' ORDER BY ta.assigned_at DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── EMAIL GỬI BÀI TEST ──────────────────────────────────────────────
async function sendEmail({ to, subject, html, fromName = 'VIET HUONG CERAMICS - Phòng Nhân Sự' }) {
  const body = {
    sender: { name: fromName, email: process.env.BREVO_FROM },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Brevo error: ${await res.text()}`);
  return res.json();
}

function getTestAssignmentEmailHTML({ app, test, deadline }) {
  const logoIconUrl = process.env.LOGO_ICON_URL || 'https://res.cloudinary.com/kto2dghj/image/upload/v1793092335/viethuong/viethuong_logo_icon.png';
  const logoUrl = process.env.LOGO_URL || 'https://res.cloudinary.com/kto2dghj/image/upload/v1793092097/viethuong/viethuong_logo_full.png';

  const typeLabels = {
    excel_word: 'Kỹ năng Excel / Word',
    typing: 'Kiểm tra tốc độ đánh máy',
    english: 'Kiểm tra Tiếng Anh (Trắc nghiệm / Tự luận / Nói)',
    chinese: 'Kiểm tra Tiếng Trung',
    custom: 'Bài kiểm tra chuyên môn tổng hợp',
    multiple_choice: 'Trắc nghiệm kiến thức chuyên môn',
  };
  const testTypeLabel = typeLabels[test.type] || test.type || 'Kiểm tra năng lực chuyên môn';

  let formattedDeadline = 'Không giới hạn';
  if (deadline) {
    const d = new Date(deadline);
    if (!isNaN(d.getTime())) {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      formattedDeadline = `${hours}:${minutes} ngày ${day}/${month}/${year}`;
    }
  }

  const rows = [
    ['1', 'Vị trí ứng tuyển', app.position || 'Nhân sự'],
    ['2', 'Tên bài kiểm tra', `<strong>${test.title}</strong>`],
    ['3', 'Hình thức bài thi', testTypeLabel],
    ['4', 'Thời gian làm bài', `<strong style="color:#B91C1C;">${test.time_limit || 30} phút</strong> (tính từ lúc bắt đầu làm)`],
    ['5', 'Hạn chót nộp bài', `<strong style="color:#B91C1C;">${formattedDeadline}</strong>`],
    ['6', 'Tài khoản đăng nhập', `<strong>${app.email}</strong>`],
    ['7', 'Mật khẩu đăng nhập', 'Chính địa chỉ email của bạn <em>(hoặc mật khẩu bạn đã đổi)</em>'],
  ];

  const infoRows = rows.map((row, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#fdf6f6'};">
      <td width="32" style="padding:11px 0 11px 14px;vertical-align:top;">
        <div style="width:22px;height:22px;border-radius:50%;background:#B91C1C;color:#fff;font-size:11px;font-weight:700;font-family:Arial,sans-serif;text-align:center;line-height:22px;">${row[0]}</div>
      </td>
      <td width="185" style="padding:11px 8px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#B91C1C;vertical-align:top;">${row[1]}</td>
      <td style="padding:11px 14px 11px 0;font-size:14px;color:#222;vertical-align:top;line-height:1.7;">${row[2]}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f0eded;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0eded;padding:32px 0;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 6px 32px rgba(0,0,0,0.12);max-width:600px;width:100%;">

    <!-- HEADER -->
    <tr>
      <td style="padding:22px 28px 0;background:#ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="58" style="vertical-align:middle;">
              <img src="${logoIconUrl}" alt="Việt Hương Ceramic" width="54" height="54" style="display:block;border-radius:6px;object-fit:contain;" />
            </td>
            <td style="padding-left:14px;vertical-align:middle;">
              <div style="color:#B91C1C;font-size:13px;font-weight:800;letter-spacing:0.8px;font-family:Arial,sans-serif;text-transform:uppercase;">CÔNG TY CỔ PHẦN XÂY DỰNG GỐM SỨ VIỆT HƯƠNG</div>
              <div style="color:#888;font-size:11px;margin-top:3px;font-family:Arial,sans-serif;">Hệ thống tuyển dụng &amp; Đánh giá năng lực trực tuyến</div>
              <div style="color:#aaa;font-size:10px;margin-top:1px;font-family:Arial,sans-serif;">472 đường Hùng Vương, xã Nam Phước, thành phố Đà Nẵng, Việt Nam</div>
            </td>
          </tr>
        </table>
        <div style="height:2px;background:#B91C1C;margin-top:16px;"></div>
      </td>
    </tr>

    <!-- TITLE BANNER -->
    <tr>
      <td style="background:#B91C1C;padding:20px 24px 22px;text-align:center;">
        <div style="color:rgba(255,255,255,0.85);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:600;">THÔNG BÁO TỪ PHÒNG NHÂN SỰ</div>
        <div style="color:#ffffff;font-size:20px;font-weight:900;letter-spacing:1.5px;margin-top:6px;font-family:Arial,sans-serif;text-transform:uppercase;">THƯ MỜI LÀM BÀI KIỂM TRA NĂNG LỰC</div>
        <div style="color:rgba(255,255,255,0.9);font-size:13px;margin-top:5px;font-family:Arial,sans-serif;">Vị trí ứng tuyển: ${app.position || 'Nhân sự'}</div>
      </td>
    </tr>

    <!-- GREETING -->
    <tr>
      <td style="padding:28px 30px 10px;">
        <p style="margin:0 0 14px;font-size:15px;color:#111;font-family:Arial,sans-serif;">Kính gửi <strong>Anh/Chị ${app.full_name}</strong>,</p>
        <p style="margin:0 0 14px;font-size:14px;color:#444;line-height:1.85;font-family:Arial,sans-serif;">
          Lời đầu tiên, <strong>Việt Hương Ceramics</strong> xin chân thành cảm ơn Anh/Chị đã quan tâm và nộp hồ sơ ứng tuyển vào công ty chúng tôi.
        </p>
        <p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.85;font-family:Arial,sans-serif;">
          Để phục vụ công tác đánh giá chuyên môn và mức độ phù hợp cho vị trí <strong style="color:#B91C1C;">${app.position || 'ứng tuyển'}</strong>, Phòng Nhân sự trân trọng mời Anh/Chị tham gia hoàn thành bài kiểm tra năng lực trực tuyến với thông tin chi tiết dưới đây:
        </p>
      </td>
    </tr>

    <!-- TABLE INFO -->
    <tr>
      <td style="padding:0 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0d5d2;border-radius:8px;overflow:hidden;border-collapse:collapse;">
          ${infoRows}
        </table>
      </td>
    </tr>

    <!-- CTA BUTTON & ACCESS GUIDE -->
    <tr>
      <td style="padding:24px 30px;text-align:center;">
        <a href="https://vieclam.viethuongceramics.com/candidate" style="background:#B91C1C;color:#ffffff;text-decoration:none;padding:15px 36px;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;letter-spacing:0.5px;box-shadow:0 4px 14px rgba(185,28,28,0.35);font-family:Arial,sans-serif;">
          TRUY CẬP VÀO LÀM BÀI TEST NGAY &rarr;
        </a>
        <div style="font-size:12px;color:#777;margin-top:10px;font-family:Arial,sans-serif;">
          Hoặc truy cập trực tiếp qua liên kết: <a href="https://vieclam.viethuongceramics.com/candidate" style="color:#B91C1C;word-break:break-all;">https://vieclam.viethuongceramics.com/candidate</a>
        </div>
      </td>
    </tr>

    <!-- INSTRUCTIONS -->
    <tr>
      <td style="padding:0 30px 15px;">
        <div style="background:#fff7f7;border-left:4px solid #B91C1C;border-radius:0 8px 8px 0;padding:14px 18px;">
          <div style="font-size:13px;font-weight:700;color:#B91C1C;margin-bottom:6px;font-family:Arial,sans-serif;">QUY ĐỊNH &amp; LƯU Ý KHI LÀM BÀI:</div>
          <ul style="margin:0;padding-left:18px;font-size:13px;color:#555;line-height:1.75;font-family:Arial,sans-serif;">
            <li>Vui lòng sử dụng máy tính/laptop có kết nối mạng Internet ổn định và trình duyệt (Chrome, Cốc Cốc, Edge).</li>
            <li>Hệ thống có cơ chế tự động đếm ngược thời gian và giám sát bài thi (chống chuyển tab / mở ứng dụng khác).</li>
            <li>Hãy đảm bảo hoàn thành bài test trước thời hạn <strong>${formattedDeadline}</strong>.</li>
          </ul>
        </div>
      </td>
    </tr>

    <!-- SIGNATURE -->
    <tr>
      <td style="padding:15px 30px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f2e2e2;padding-top:18px;">
          <tr>
            <td>
              <div style="font-size:13px;color:#666;font-family:Arial,sans-serif;">Trân trọng,</div>
              <div style="font-size:14px;color:#111;font-weight:700;margin-top:4px;font-family:Arial,sans-serif;">Phòng Nhân sự &amp; Tuyển dụng</div>
              <div style="font-size:13px;color:#B91C1C;font-weight:700;margin-top:2px;font-family:Arial,sans-serif;">Công ty cổ phần xây dựng gốm sứ Việt Hương</div>
              <div style="font-size:12px;color:#888;margin-top:4px;font-family:Arial,sans-serif;">Hotline: 0905.386.888 &nbsp;|&nbsp; Email: itviethuong@viethuongceramics.com</div>
            </td>
            <td align="right" valign="bottom" width="100">
              <img src="${logoUrl}" alt="Logo" width="70" style="display:block;border-radius:6px;object-fit:contain;" />
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="background:#2c1a0e;padding:18px 24px;text-align:center;">
        <div style="color:rgba(255,255,255,0.7);font-size:11px;line-height:1.8;font-family:Arial,sans-serif;">
          &copy; ${new Date().getFullYear()} Công ty cổ phần xây dựng gốm sứ Việt Hương. All rights reserved.<br>
          Trụ sở chính: 472 đường Hùng Vương, xã Nam Phước, thành phố Đà Nẵng, Việt Nam<br>
          Website: <a href="https://vieclam.viethuongceramics.com" style="color:#f59e0b;text-decoration:none;">vieclam.viethuongceramics.com</a>
        </div>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;
}

// POST /api/tests/assignments — Assign bài test + tạo shuffled_questions
router.post('/assignments', authMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { application_id, application_ids, test_id, deadline } = req.body;

    if (!test_id) return res.status(400).json({ message: 'Thiếu test_id' });

    const appIds = application_ids?.length
      ? application_ids
      : application_id
        ? [application_id]
        : [];

    if (!appIds.length) {
      return res.status(400).json({ message: 'Thiếu application_id hoặc application_ids' });
    }

    // Kiểm tra test tồn tại và đang active
    const [tests] = await conn.query(
      'SELECT id, title, type, time_limit, passing_score FROM tests WHERE id = ? AND is_active = 1',
      [test_id]
    );
    if (!tests.length) {
      return res.status(404).json({ message: 'Bộ đề không tồn tại hoặc đã bị tắt' });
    }

    // Lấy toàn bộ câu hỏi của bộ đề (dùng để shuffle)
    const [questions] = await conn.query(
      'SELECT * FROM test_questions WHERE test_id = ? ORDER BY `order` ASC',
      [test_id]
    );

    const results = { success: [], skipped: [], errors: [] };

    for (const appId of appIds) {
      try {
        const [apps] = await conn.query(
          'SELECT id, full_name, email, position, status FROM applications WHERE id = ?',
          [appId]
        );
        if (!apps.length) {
          results.errors.push({ application_id: appId, reason: 'Không tìm thấy ứng viên' });
          continue;
        }

        if (apps[0].status !== 'interviewing') {
          results.errors.push({
            application_id: appId,
            name: apps[0].full_name,
            reason: 'Ứng viên chưa ở trạng thái "Chờ phỏng vấn" — không thể giao bài test'
          });
          continue;
        }

        // Kiểm tra đã assign chưa
        const [existing] = await conn.query(
          'SELECT id, status FROM test_assignments WHERE application_id = ? AND test_id = ?',
          [appId, test_id]
        );
        if (existing.length) {
          results.skipped.push({
            application_id: appId,
            name: apps[0].full_name,
            reason: `Đã assign rồi (status: ${existing[0].status})`
          });
          continue;
        }

        // ── Tạo snapshot câu hỏi đã shuffle riêng cho ứng viên này ──
        const shuffledSnapshot = buildShuffledSnapshot(questions);

        await conn.query(
          `INSERT INTO test_assignments
             (application_id, test_id, assigned_by, deadline, shuffled_questions)
           VALUES (?, ?, ?, ?, ?)`,
          [appId, test_id, req.user.id, deadline || null, JSON.stringify(shuffledSnapshot)]
        );

        results.success.push({
          application_id: appId,
          name:     apps[0].full_name,
          email:    apps[0].email,
          position: apps[0].position,
        });
      } catch (innerErr) {
        results.errors.push({ application_id: appId, reason: innerErr.message });
      }
    }

    await conn.commit();

    // ── Tự động gửi email mời làm bài test đến các ứng viên được assign thành công ──
    const testInfo = tests[0];
    for (const item of results.success) {
      try {
        const emailHTML = getTestAssignmentEmailHTML({
          app: { full_name: item.name, email: item.email, position: item.position },
          test: testInfo,
          deadline,
        });

        await sendEmail({
          to: item.email,
          subject: `THƯ MỜI LÀM BÀI KIỂM TRA NĂNG LỰC - ${testInfo.title.toUpperCase()} - VIET HUONG CERAMICS`,
          html: emailHTML,
        });
        console.log(`[TEST EMAIL OK] Đã gửi thư mời làm bài test đến: ${item.email}`);
      } catch (emailErr) {
        console.error(`[TEST EMAIL ERROR] Gửi thư cho ${item.email} thất bại:`, emailErr.message);
      }
    }

    res.status(201).json({
      message: `Assign thành công ${results.success.length}/${appIds.length} ứng viên`,
      test:    tests[0].title,
      results
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

// PUT /api/tests/assignments/:id — Cập nhật deadline hoặc reset bài
router.put('/assignments/:id', authMiddleware, async (req, res) => {
  try {
    const { deadline, status } = req.body;

    const allowedStatus = ['pending', 'expired'];
    if (status && !allowedStatus.includes(status)) {
      return res.status(400).json({
        message: `HR chỉ có thể set status: ${allowedStatus.join(' | ')}`
      });
    }

    await pool.query(
      `UPDATE test_assignments SET
         deadline = COALESCE(?, deadline),
         status   = COALESCE(?, status)
       WHERE id = ?`,
      [deadline, status, req.params.id]
    );
    res.json({ message: 'Cập nhật assignment thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/tests/assignments/:id — Hủy assignment (chỉ khi chưa làm)
router.delete('/assignments/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT status FROM test_assignments WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy assignment' });
    if (['submitted', 'graded'].includes(rows[0].status)) {
      return res.status(400).json({ message: 'Không thể hủy bài đã nộp hoặc đã chấm' });
    }
    await pool.query('DELETE FROM test_assignments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Đã hủy assignment' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tests/assignments/:id/answers — HR xem câu trả lời
router.get('/assignments/:id/answers', authMiddleware, async (req, res) => {
  try {
    const [assignment] = await pool.query(
      `SELECT ta.*, ap.full_name, ap.email, t.title AS test_title, t.type AS test_type
       FROM test_assignments ta
       JOIN applications ap ON ap.id = ta.application_id
       JOIN tests         t  ON t.id  = ta.test_id
       WHERE ta.id = ?`,
      [req.params.id]
    );
    if (!assignment.length) return res.status(404).json({ message: 'Không tìm thấy assignment' });

    const [answers] = await pool.query(
      `SELECT
         ans.*,
         tq.content, tq.question_type, tq.options,
         tq.correct_answer, tq.points, tq.ai_graded
       FROM test_answers ans
       JOIN test_questions tq ON tq.id = ans.question_id
       WHERE ans.assignment_id = ?
       ORDER BY tq.\`order\``,
      [req.params.id]
    );

    const [result] = await pool.query(
      'SELECT * FROM test_results WHERE assignment_id = ?',
      [req.params.id]
    );

    res.json({
      assignment: assignment[0],
      answers,
      result: result[0] || null
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tests/assignments/:id/questions — Ứng viên lấy câu hỏi đã shuffle
// Trả về snapshot đã shuffle, KHÔNG có correct_answer_mapped
router.get('/assignments/:id/questions', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ta.shuffled_questions, ta.status, ta.deadline,
              t.title, t.time_limit, t.type
       FROM test_assignments ta
       JOIN tests t ON t.id = ta.test_id
       WHERE ta.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy bài test' });

    const row = rows[0];

    if (row.status === 'expired') {
      return res.status(403).json({ message: 'Bài test đã hết hạn' });
    }

    // Parse snapshot
    let questions = row.shuffled_questions
      ? (typeof row.shuffled_questions === 'string'
          ? JSON.parse(row.shuffled_questions)
          : row.shuffled_questions)
      : [];

    // Xóa correct_answer_mapped trước khi gửi cho ứng viên
    questions = questions.map(({ correct_answer_mapped, ...q }) => q);

    res.json({
      assignment_id: req.params.id,
      title:         row.title,
      time_limit:    row.time_limit,
      type:          row.type,
      status:        row.status,
      deadline:      row.deadline,
      questions,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tests/assignments/:id/lock-status
router.get('/assignments/:id/lock-status', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         ta.id, ta.status, ta.is_locked, 
         GREATEST(IFNULL(ta.violation_count, 0), IFNULL(ta.violations, 0)) AS violation_count,
         ta.lock_reason, ta.locked_at,
         ap.full_name, ap.email,
         t.title AS test_title
       FROM test_assignments ta
       JOIN applications ap ON ap.id = ta.application_id
       JOIN tests         t  ON t.id  = ta.test_id
       WHERE ta.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tests/assignments/:id/reset — HR reset bài về pending
router.post('/assignments/:id/reset', authMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

const [rows] = await conn.query(
  'SELECT id, test_id FROM test_assignments WHERE id = ?',
  [req.params.id]
);
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy assignment' });

    // Xóa câu trả lời + kết quả cũ
    await conn.query('DELETE FROM test_answers WHERE assignment_id = ?',  [req.params.id]);
    await conn.query('DELETE FROM test_results WHERE assignment_id = ?',  [req.params.id]);

    // Tạo lại snapshot shuffle mới (để ứng viên không nhớ thứ tự cũ)
    const [questions] = await conn.query(
      'SELECT * FROM test_questions WHERE test_id = ? ORDER BY `order` ASC',
      [rows[0].test_id]
    );
    const newSnapshot = buildShuffledSnapshot(questions);

    // Reset assignment
    await conn.query(
      `UPDATE test_assignments
       SET status             = 'pending',
           started_at         = NULL,
           submitted_at       = NULL,
           is_locked          = 0,
           violation_count    = 0,
           violations         = 0,
           last_violation     = NULL,
           lock_reason        = NULL,
           locked_at          = NULL,
           shuffled_questions = ?
       WHERE id = ?`,
      [JSON.stringify(newSnapshot), req.params.id]
    );

    await conn.commit();
    res.json({ message: 'Reset bài thành công. Ứng viên có thể làm lại từ đầu.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

// DELETE /api/tests/assignments/:id/force — HR xóa hoàn toàn assignment
router.delete('/assignments/:id/force', authMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query('DELETE FROM test_results     WHERE assignment_id = ?', [req.params.id]);
    await conn.query('DELETE FROM test_answers     WHERE assignment_id = ?', [req.params.id]);
    await conn.query('DELETE FROM test_assignments WHERE id = ?',             [req.params.id]);

    await conn.commit();
    res.json({ message: 'Đã xóa hoàn toàn assignment' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;