const express  = require('express');
const router   = express.Router();
const pool     = require('../data/db');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const nodemailer = require('nodemailer');
const { candidateMiddleware, authMiddleware } = require('./auth');
const { gradeTextAnswer, gradeSpeakingAnswer, generateSummary } = require('../services/gradingService');

// ── Multer config — lưu audio vào uploads/speaking/ ─────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/speaking');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `speaking_${req.params.assignment_id}_q${req.params.question_id}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/mp4', 'audio/mpeg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file audio'));
  }
});

// ── Email transporter ────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: { user: process.env.BREVO_USER, pass: process.env.BREVO_PASS }
});

// ============================================================
// POST /api/grading/assignments/:assignment_id/speaking/:question_id
// Ứng viên upload audio bài nói
// ============================================================
router.post(
  '/assignments/:assignment_id/speaking/:question_id',
  candidateMiddleware,
  upload.single('audio'),
  async (req, res) => {
    try {
      const { application_id } = req.candidate;
      const { assignment_id, question_id } = req.params;

      if (!req.file) return res.status(400).json({ message: 'Thiếu file audio' });

      // Kiểm tra assignment thuộc ứng viên này
      const [assignments] = await pool.query(
        'SELECT id FROM test_assignments WHERE id = ? AND application_id = ?',
        [assignment_id, application_id]
      );
      if (!assignments.length) {
        return res.status(404).json({ message: 'Không tìm thấy bài test' });
      }

      const audioUrl = `/uploads/speaking/${req.file.filename}`;

      // Lưu hoặc update câu trả lời với audio_url
      await pool.query(
        `INSERT INTO test_answers (assignment_id, question_id, audio_url, answered_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE audio_url = VALUES(audio_url), answered_at = NOW()`,
        [assignment_id, question_id, audioUrl]
      );

      res.json({
        message:   'Upload audio thành công',
        audio_url: audioUrl,
        question_id: parseInt(question_id)
      });
    } catch (err) {
      console.error('upload speaking error:', err);
      res.status(500).json({ message: err.message });
    }
  }
);


router.post('/assignments/:assignment_id/grade', async (req, res) => {
  // Cho phép cả candidate token lẫn HR token gọi endpoint này
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { assignment_id } = req.params;

    // Lấy thông tin assignment
    const [assignments] = await conn.query(
      `SELECT
         ta.*,
         ap.full_name, ap.email AS candidate_email,
         t.title AS test_title, t.type AS test_type,
         t.passing_score
       FROM test_assignments ta
       JOIN applications ap ON ap.id = ta.application_id
       JOIN tests         t  ON t.id  = ta.test_id
       WHERE ta.id = ?`,
      [assignment_id]
    );
    if (!assignments.length) {
      return res.status(404).json({ message: 'Không tìm thấy assignment' });
    }
    const assignment = assignments[0];

    if (!['submitted', 'graded'].includes(assignment.status)) {
      return res.status(400).json({ message: 'Bài chưa được nộp' });
    }

    // Lấy tất cả câu trả lời cần AI chấm
    const [answers] = await conn.query(
      `SELECT
         ans.*,
         tq.content, tq.question_type, tq.points,
         tq.ai_graded, tq.ai_rubric, tq.speaking_prompt,
         tq.correct_answer
       FROM test_answers ans
       JOIN test_questions tq ON tq.id = ans.question_id
       WHERE ans.assignment_id = ?`,
      [assignment_id]
    );

    let total_score = 0;
    let max_score   = 0;
    const gradedAnswers = [];

   for (const ans of answers) {
     const points = parseInt(ans.points, 10) || 0;
  max_score += Number(ans.points);
 console.log(`Câu ${ans.question_id}: type=${ans.question_type}, score=${ans.score}, ai_graded=${ans.ai_graded}, audio_url=${ans.audio_url}`);
      // Đã chấm rồi (trắc nghiệm) — cộng điểm luôn
      if (ans.score !== null && !ans.ai_graded && ans.question_type !== 'speaking') {
        total_score += ans.score || 0;
        gradedAnswers.push({
          question_type: ans.question_type,
          score:         ans.score,
          max_points:    ans.points,
          feedback:      null
        });
        continue;
      }

      // Chấm câu speaking bằng Gemini audio
      if (ans.question_type === 'speaking' && ans.audio_url) {
        const audioPath = path.join(__dirname, '..', ans.audio_url);
        if (!fs.existsSync(audioPath)) {
          // File không tồn tại → cho 0 điểm
          await conn.query(
            'UPDATE test_answers SET score = 0, is_correct = 0, ai_feedback = ? WHERE id = ?',
            ['Không tìm thấy file audio', ans.id]
          );
          gradedAnswers.push({ question_type: 'speaking', score: 0, max_points: ans.points, feedback: 'Không tìm thấy file audio' });
          continue;
        }

        const result = await gradeSpeakingAnswer({
          audioPath,
          prompt:    ans.speaking_prompt || ans.content,
          maxPoints: ans.points
        });

        await conn.query(
          `UPDATE test_answers
           SET score = ?, is_correct = ?, ai_feedback = ?
           WHERE id = ?`,
          [result.score, result.is_correct ? 1 : 0, result.feedback, ans.id]
        );

        total_score += result.score || 0;
        gradedAnswers.push({
          question_type: 'speaking',
          score:         result.score,
          max_points:    ans.points,
          feedback:      result.feedback,
          pronunciation_percent: result.pronunciation_percent,
          transcription: result.transcription
        });
        continue;
      }

      // Chấm câu tự luận / đọc hiểu bằng Gemini text
      if (ans.ai_graded && ans.answer) {
        const lang = ['english'].includes(assignment.test_type) ? 'en'
                   : ['chinese'].includes(assignment.test_type) ? 'zh' : 'vi';

        const result = await gradeTextAnswer({
          question:  ans.content,
          answer:    ans.answer,
          rubric:    ans.ai_rubric,
          maxPoints: ans.points,
          language:  lang
        });

        await conn.query(
          `UPDATE test_answers
           SET score = ?, is_correct = ?, ai_feedback = ?
           WHERE id = ?`,
          [result.score, result.is_correct ? 1 : 0, result.feedback, ans.id]
        );

        total_score += result.score || 0;
        gradedAnswers.push({
          question_type: ans.question_type,
          score:         result.score,
          max_points:    ans.points,
          feedback:      result.feedback
        });
        continue;
      }

      // Câu chưa trả lời → 0 điểm
      total_score += 0;
      gradedAnswers.push({ question_type: ans.question_type, score: 0, max_points: ans.points, feedback: 'Không có câu trả lời' });
    }

    const percentage = max_score > 0
      ? Math.round((total_score / max_score) * 100) : 0;
    const passed = percentage >= assignment.passing_score ? 1 : 0;

    // Tạo nhận xét tổng hợp
    const ai_summary = await generateSummary({
      candidateName: assignment.full_name,
      testTitle:     assignment.test_title,
      testType:      assignment.test_type,
      answers:       gradedAnswers,
      totalScore:    total_score,
      maxScore:      max_score,
      percentage,
      passed,
      passingScore:  assignment.passing_score
    });

    await conn.query(
      `INSERT INTO test_results
         (assignment_id, total_score, max_score, percentage, passed, ai_summary)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_score = VALUES(total_score),
         max_score   = VALUES(max_score),
         percentage  = VALUES(percentage),
         passed      = VALUES(passed),
         ai_summary  = VALUES(ai_summary),
         graded_at   = NOW()`,
      [assignment_id, total_score, max_score, percentage, passed, ai_summary]
    );

    await conn.query(
      "UPDATE test_assignments SET status = 'graded' WHERE id = ?",
      [assignment_id]
    );

    await conn.commit();

    // Gửi email kết quả cho HR
    await notifyHR({
      assignment,
      total_score,
      max_score,
      percentage,
      passed,
      ai_summary,
      gradedAnswers,
      assignment_id
    });

    // Đánh dấu đã notify
    await pool.query(
      'UPDATE test_results SET notified_hr = 1 WHERE assignment_id = ?',
      [assignment_id]
    );

res.json({
  message:     'Chấm điểm hoàn tất',
  total_score,
  max_score,
  percentage,
  passed:      !!passed,
  ai_summary,
  details:     gradedAnswers
});

  } catch (err) {
    await conn.rollback();
    console.error('grading error:', err);
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

async function notifyHR({ assignment, total_score, max_score, percentage, passed, ai_summary, gradedAnswers, assignment_id }) {
  const passColor  = passed ? '#3B6D11' : '#A32D2D';
  const passBg     = passed ? '#EAF3DE' : '#FCEBEB';
  const passText   = passed ? 'ĐẠT' : 'KHÔNG ĐẠT';

  const answersHTML = gradedAnswers.map((a, i) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;font-size:13px;">Câu ${i + 1} (${a.question_type})</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:500;font-size:13px;">${a.score}/${a.max_points}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:13px;">${a.feedback || '—'}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
<div style="max-width:660px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;">
  <div style="background:#1a1a2e;padding:28px 32px;">
    <div style="font-size:20px;font-weight:bold;color:#fff;">Việt Hương Ceramics</div>
    <div style="font-size:13px;color:#aaa;margin-top:4px;">Kết quả bài test tuyển dụng</div>
  </div>
  <div style="padding:28px 32px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="padding:6px 0;color:#888;font-size:13px;width:40%;">Ứng viên</td>
        <td style="padding:6px 0;font-weight:500;font-size:14px;">${assignment.full_name}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#888;font-size:13px;">Email</td>
        <td style="padding:6px 0;font-size:13px;">${assignment.candidate_email}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#888;font-size:13px;">Bài test</td>
        <td style="padding:6px 0;font-size:13px;">${assignment.test_title}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#888;font-size:13px;">Tổng điểm</td>
        <td style="padding:6px 0;font-size:22px;font-weight:bold;">${total_score}/${max_score} <span style="font-size:15px;color:#888;">(${percentage}%)</span></td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#888;font-size:13px;">Kết quả</td>
        <td style="padding:6px 0;">
          <span style="background:${passBg};color:${passColor};padding:4px 14px;border-radius:20px;font-size:13px;font-weight:bold;">${passText}</span>
        </td>
      </tr>
    </table>

    <div style="background:#f8f9fa;border-left:4px solid #1a1a2e;padding:14px 16px;border-radius:0 6px 6px 0;margin-bottom:24px;">
      <div style="font-size:12px;color:#888;margin-bottom:6px;">Nhận xét của AI</div>
      <div style="font-size:14px;color:#333;line-height:1.7;">${ai_summary}</div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#f1f1f1;">
          <th style="padding:10px 12px;text-align:left;font-weight:500;">Câu hỏi</th>
          <th style="padding:10px 12px;text-align:center;font-weight:500;">Điểm</th>
          <th style="padding:10px 12px;text-align:left;font-weight:500;">Nhận xét</th>
        </tr>
      </thead>
      <tbody>${answersHTML}</tbody>
    </table>

    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #eee;font-size:12px;color:#aaa;text-align:center;">
      Xem chi tiết tại hệ thống quản lý tuyển dụng · Assignment #${assignment_id}
    </div>
  </div>
</div>
</body></html>`;

  await transporter.sendMail({
    from:    `"Việt Hương Ceramics - Hệ thống tuyển dụng" <${process.env.BREVO_USER}>`,
    to:      process.env.HR_MAIL,
    subject: `[Kết quả test] ${assignment.full_name} — ${assignment.test_title} — ${passed ? 'ĐẠT' : 'KHÔNG ĐẠT'} (${percentage}%)`,
    html
  });
}
router.get('/assignments/:assignment_id/status', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ta.status, tr.percentage, tr.passed, tr.graded_at, tr.notified_hr, tr.ai_summary
       FROM test_assignments ta
       LEFT JOIN test_results tr ON tr.assignment_id = ta.id
       WHERE ta.id = ?`,
      [req.params.assignment_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.post('/assignments/:assignment_id/lock', candidateMiddleware, async (req, res) => {
  try {
    const { application_id } = req.candidate;
    const { assignment_id }  = req.params;
    const { reason }         = req.body;
 
    const [rows] = await pool.query(
      'SELECT id FROM test_assignments WHERE id = ? AND application_id = ?',
      [assignment_id, application_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy' });
 
    await pool.query(
      `UPDATE test_assignments
       SET is_locked = 1, lock_reason = ?, locked_at = NOW()
       WHERE id = ?`,
      [reason || 'violation', assignment_id]
    );
 
    res.json({ message: 'Đã khóa bài' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
 
// POST /api/candidate/assignments/:assignment_id/violations
// Ghi nhận vi phạm (rời tab, blur window...)
router.post('/assignments/:assignment_id/violations', candidateMiddleware, async (req, res) => {
  try {
    const { application_id } = req.candidate;
    const { assignment_id }  = req.params;
    const { reason, count }  = req.body;
 
    const [rows] = await pool.query(
      'SELECT id FROM test_assignments WHERE id = ? AND application_id = ?',
      [assignment_id, application_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy' });
 
    await pool.query(
      `UPDATE test_assignments
       SET violation_count = ?
       WHERE id = ?`,
      [count || 1, assignment_id]
    );
 
    res.json({ message: 'Ghi nhận vi phạm' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
 
module.exports = router;