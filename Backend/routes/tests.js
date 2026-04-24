const express = require('express');
const router  = express.Router();
const pool    = require('../data/db');
const { authMiddleware } = require('./auth');

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

    if (type)      { query += ' AND t.type = ?';      params.push(type); }
    if (is_active !== undefined) {
                     query += ' AND t.is_active = ?'; params.push(is_active); }

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
/**
 * Body mẫu:
 * {
 *   "title": "Test Excel/Word cơ bản",
 *   "type": "excel_word",
 *   "time_limit": 30,
 *   "passing_score": 60,
 *   "questions": [
 *     {
 *       "question_type": "multiple_choice",
 *       "order": 1,
 *       "content": "Phím tắt để lưu file trong Excel là?",
 *       "options": [
 *         { "key": "A", "text": "Ctrl + S" },
 *         { "key": "B", "text": "Ctrl + P" },
 *         { "key": "C", "text": "Ctrl + Z" },
 *         { "key": "D", "text": "Alt + F4" }
 *       ],
 *       "correct_answer": "A",
 *       "points": 10,
 *       "ai_graded": 0
 *     },
 *     {
 *       "question_type": "reading",
 *       "order": 2,
 *       "content": "Read the following passage and answer...",
 *       "options": null,
 *       "correct_answer": null,
 *       "points": 20,
 *       "ai_graded": 1,
 *       "ai_rubric": "Chấm theo tiêu chí: hiểu đúng ý chính (10đ), dùng từ chính xác (10đ)"
 *     }
 *   ]
 * }
 */
router.post('/', authMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      title,
      type         = 'custom',
      time_limit   = 30,
      passing_score = 60,
      questions    = []
    } = req.body;

    if (!title) return res.status(400).json({ message: 'Thiếu tên bộ đề' });
    if (!questions.length) return res.status(400).json({ message: 'Bộ đề cần ít nhất 1 câu hỏi' });

    // Validate type
    const validTypes = ['excel_word', 'typing', 'english', 'chinese', 'custom'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: `type phải là: ${validTypes.join(' | ')}` });
    }

    // Tạo bộ đề
    const [result] = await conn.query(
      `INSERT INTO tests (title, type, time_limit, passing_score, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [title, type, time_limit, passing_score, req.user.id]
    );
    const testId = result.insertId;

    // Insert câu hỏi
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

      // Validate: câu trắc nghiệm phải có correct_answer
      if (['multiple_choice', 'multi_select'].includes(question_type) && !correct_answer) {
        throw new Error(`Câu hỏi trắc nghiệm thứ ${order} thiếu correct_answer`);
      }

      // Validate: typing_sample chỉ được có 1 câu trong bộ đề
      if (question_type === 'typing_sample') {
        const typingCount = questions.filter(x => x.question_type === 'typing_sample').length;
        if (typingCount > 1) throw new Error('Bộ đề typing chỉ được có 1 đoạn văn mẫu');
      }

      await conn.query(
        `INSERT INTO test_questions
           (test_id, question_type, \`order\`, content, options, correct_answer, points, ai_graded, ai_rubric)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          testId,
          question_type,
          order,
          content,
          options ? JSON.stringify(options) : null,
          correct_answer,
          points,
          ai_graded ? 1 : 0,
          ai_rubric
        ]
      );
    }

    await conn.commit();

    // Trả về bộ đề vừa tạo kèm câu hỏi
    const [newTest]  = await conn.query('SELECT * FROM tests WHERE id = ?', [testId]);
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

// POST /api/tests/:id/questions — Thêm câu hỏi vào bộ đề
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
        req.params.id,
        question_type,
        order,
        content,
        options ? JSON.stringify(options) : null,
        correct_answer,
        points,
        ai_graded ? 1 : 0,
        ai_rubric
      ]
    );
    res.status(201).json({ message: 'Thêm câu hỏi thành công', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/tests/:id/questions/:qid — Sửa câu hỏi
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
        correct_answer,
        points,
        ai_graded !== undefined ? (ai_graded ? 1 : 0) : null,
        ai_rubric,
        order,
        req.params.qid,
        req.params.id
      ]
    );
    res.json({ message: 'Cập nhật câu hỏi thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/tests/:id/questions/:qid — Xóa câu hỏi
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

// GET /api/tests/assignments/list — Danh sách tất cả assignment (HR xem)
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

// POST /api/tests/assignments — Assign bài test cho ứng viên
/**
 * Body: { application_id, test_id, deadline? }
 * Có thể assign nhiều ứng viên cùng lúc:
 * { application_ids: [1,2,3], test_id, deadline? }
 */
router.post('/assignments', authMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { application_id, application_ids, test_id, deadline } = req.body;

    if (!test_id) return res.status(400).json({ message: 'Thiếu test_id' });

    // Hỗ trợ assign 1 hoặc nhiều ứng viên cùng lúc
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
      'SELECT id, title FROM tests WHERE id = ? AND is_active = 1',
      [test_id]
    );
    if (!tests.length) {
      return res.status(404).json({ message: 'Bộ đề không tồn tại hoặc đã bị tắt' });
    }

    const results = { success: [], skipped: [], errors: [] };

    for (const appId of appIds) {
      try {
        // Kiểm tra ứng viên tồn tại
       // Sau chỗ check ứng viên tồn tại, thêm vào:
const [apps] = await conn.query(
  'SELECT id, full_name, email, status FROM applications WHERE id = ?',
  [appId]
);
if (!apps.length) {
  results.errors.push({ application_id: appId, reason: 'Không tìm thấy ứng viên' });
  continue;
}

// ← THÊM ĐOẠN NÀY
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

        await conn.query(
          `INSERT INTO test_assignments (application_id, test_id, assigned_by, deadline)
           VALUES (?, ?, ?, ?)`,
          [appId, test_id, req.user.id, deadline || null]
        );

        results.success.push({ application_id: appId, name: apps[0].full_name, email: apps[0].email });
      } catch (innerErr) {
        results.errors.push({ application_id: appId, reason: innerErr.message });
      }
    }

    await conn.commit();

    res.status(201).json({
      message: `Assign thành công ${results.success.length}/${appIds.length} ứng viên`,
      test: tests[0].title,
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

    // Chỉ cho phép HR set lại về pending (reset) hoặc expired
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

// GET /api/tests/assignments/:id/answers — HR xem câu trả lời của ứng viên
router.get('/assignments/:id/answers', authMiddleware, async (req, res) => {
  try {
    const [assignment] = await pool.query(
      `SELECT ta.*, ap.full_name, ap.email, t.title AS test_title
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
router.get('/assignments/:id/lock-status', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         ta.id, ta.status, ta.is_locked, ta.violation_count,
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
 
// POST /api/tests/assignments/:id/reset
// HR reset bài đang làm của ứng viên về pending
// Xóa toàn bộ câu trả lời + kết quả cũ, mở khóa nếu bị khóa
router.post('/assignments/:id/reset', authMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
 
    const [rows] = await conn.query(
      'SELECT id, status FROM test_assignments WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy assignment' });
 
    // Xóa câu trả lời cũ
    await conn.query('DELETE FROM test_answers WHERE assignment_id = ?', [req.params.id]);
 
    // Xóa kết quả cũ
    await conn.query('DELETE FROM test_results WHERE assignment_id = ?', [req.params.id]);
 
    // Reset assignment về pending, xóa lock + violation
    await conn.query(
      `UPDATE test_assignments
       SET status          = 'pending',
           started_at      = NULL,
           submitted_at    = NULL,
           is_locked       = 0,
           violation_count = 0,
           lock_reason     = NULL,
           locked_at       = NULL
       WHERE id = ?`,
      [req.params.id]
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
 
// DELETE /api/tests/assignments/:id/force
// HR xóa hoàn toàn assignment (kể cả đã nộp/chấm)
router.delete('/assignments/:id/force', authMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
 
    await conn.query('DELETE FROM test_results  WHERE assignment_id = ?', [req.params.id]);
    await conn.query('DELETE FROM test_answers  WHERE assignment_id = ?', [req.params.id]);
    await conn.query('DELETE FROM test_assignments WHERE id = ?',          [req.params.id]);
 
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