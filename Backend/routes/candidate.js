const express = require('express');
const router = express.Router();
const pool = require('../data/db');
const { candidateMiddleware } = require('./auth');

// ============================================================
// GET /api/candidate/assignments
// Ứng viên xem danh sách bài test được assign
// ============================================================
router.get('/assignments', candidateMiddleware, async (req, res) => {
  try {
    const { application_id } = req.candidate;

    const [rows] = await pool.query(
      `SELECT
         ta.id          AS assignment_id,
         ta.status,
         ta.deadline,
         ta.started_at,
         ta.submitted_at,
ta.is_locked,
ta.violation_count,
t.id           AS test_id,
         t.title,
         t.type,
         t.time_limit,
         t.passing_score,
         tr.percentage,
         tr.passed,
         tr.typing_wpm,
         tr.ai_summary,
         tr.graded_at
       FROM test_assignments ta
       JOIN tests t ON t.id = ta.test_id
       LEFT JOIN test_results tr ON tr.assignment_id = ta.id
       WHERE ta.application_id = ?
       ORDER BY ta.assigned_at DESC`,
      [application_id]
    );

    // Tự động đánh dấu expired nếu quá deadline
    const now = new Date();
    for (const row of rows) {
      if (
        row.status === 'pending' &&
        row.deadline &&
        new Date(row.deadline) < now
      ) {
        await pool.query(
          "UPDATE test_assignments SET status = 'expired' WHERE id = ?",
          [row.assignment_id]
        );
        row.status = 'expired';
      }
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// GET /api/candidate/assignments/:assignment_id/start
// Ứng viên bắt đầu làm bài — trả về đề thi (ẩn correct_answer)
// ============================================================
router.get('/assignments/:assignment_id/start', candidateMiddleware, async (req, res) => {
  try {
    const { application_id } = req.candidate;
    const { assignment_id } = req.params;

    // Kiểm tra assignment thuộc về ứng viên này
    const [assignments] = await pool.query(
      `SELECT ta.*, t.title, t.type, t.time_limit, t.passing_score
       FROM test_assignments ta
       JOIN tests t ON t.id = ta.test_id
       WHERE ta.id = ? AND ta.application_id = ?`,
      [assignment_id, application_id]
    );

    if (!assignments.length) {
      return res.status(404).json({ message: 'Không tìm thấy bài test' });
    }

    const assignment = assignments[0];

    // Kiểm tra trạng thái
    if (assignment.status === 'submitted' || assignment.status === 'graded') {
      return res.status(400).json({ message: 'Bài test đã được nộp' });
    }
    if (assignment.status === 'expired') {
      return res.status(400).json({ message: 'Bài test đã hết hạn' });
    }

    // Kiểm tra deadline
    if (assignment.deadline && new Date(assignment.deadline) < new Date()) {
      await pool.query(
        "UPDATE test_assignments SET status = 'expired' WHERE id = ?",
        [assignment_id]
      );
      return res.status(400).json({ message: 'Bài test đã hết hạn' });
    }

    // Lần đầu bắt đầu → cập nhật started_at
    if (assignment.status === 'pending') {
      await pool.query(
        "UPDATE test_assignments SET status = 'in_progress', started_at = NOW() WHERE id = ?",
        [assignment_id]
      );
      assignment.status = 'in_progress';
      assignment.started_at = new Date();
    }

    // Lấy câu hỏi — ẩn correct_answer và ai_rubric với ứng viên
    const [questions] = await pool.query(
      `SELECT
         id, question_type, \`order\`, content, options, points, ai_graded
       FROM test_questions
       WHERE test_id = ?
       ORDER BY \`order\` ASC`,
      [assignment.test_id]
    );

    // Parse options JSON — safe parse phòng data lỗi
    const safeParseOptions = (raw) => {
      if (!raw) return null;
      if (typeof raw === 'object') return raw; // MySQL 8 tự parse JSON column
      try { return JSON.parse(raw); } catch { return null; }
    };
    const parsedQuestions = questions.map(q => ({
      ...q,
      options: safeParseOptions(q.options)
    }));
    // Tính thời gian còn lại (giây) nếu đã started
    let remaining_seconds = null;
    if (assignment.started_at) {
      const elapsed = Math.floor(
        (new Date() - new Date(assignment.started_at)) / 1000
      );
      remaining_seconds = Math.max(0, assignment.time_limit * 60 - elapsed);
    }

    res.json({
      assignment_id: parseInt(assignment_id),
      test_id: assignment.test_id,
      title: assignment.title,
      type: assignment.type,
      time_limit: assignment.time_limit,
      passing_score: assignment.passing_score,
      status: assignment.status,
      started_at: assignment.started_at,
      deadline: assignment.deadline,
      is_locked: assignment.is_locked ? true : false,
      remaining_seconds,
      questions: parsedQuestions
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// POST /api/candidate/assignments/:assignment_id/submit
// Ứng viên nộp bài
// ============================================================
/**
 * Body:
 * {
 *   "answers": [
 *     { "question_id": 1, "answer": "A" },
 *     { "question_id": 2, "answer": "B,C" },
 *     { "question_id": 3, "answer": "Đây là câu trả lời tự luận..." },
 *     { "question_id": 4, "answer": "85" }  ← wpm cho typing
 *   ],
 *   "typing_wpm": 85,        ← chỉ với test typing
 *   "typing_accuracy": 96.5  ← chỉ với test typing
 * }
 */
router.post('/assignments/:assignment_id/submit', candidateMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { application_id } = req.candidate;
    const { assignment_id } = req.params;
    const { answers = [], typing_wpm, typing_accuracy } = req.body;

    if (!answers.length) {
      return res.status(400).json({ message: 'Không có câu trả lời nào được gửi' });
    }

    // Kiểm tra assignment
    const [assignments] = await conn.query(
      `SELECT ta.*, t.type, t.passing_score, t.title
       FROM test_assignments ta
       JOIN tests t ON t.id = ta.test_id
       WHERE ta.id = ? AND ta.application_id = ?`,
      [assignment_id, application_id]
    );

    if (!assignments.length) {
      return res.status(404).json({ message: 'Không tìm thấy bài test' });
    }

    const assignment = assignments[0];

    if (assignment.status === 'submitted' || assignment.status === 'graded') {
      return res.status(400).json({ message: 'Bài test đã được nộp rồi' });
    }
    if (assignment.status === 'expired') {
      return res.status(400).json({ message: 'Bài test đã hết hạn' });
    }

    // Lấy tất cả câu hỏi để chấm trắc nghiệm ngay
    const [questions] = await conn.query(
      'SELECT * FROM test_questions WHERE test_id = ?',
      [assignment.test_id]
    );

    const questionMap = {};
    questions.forEach(q => { questionMap[q.id] = q; });

    let auto_score = 0;   // Điểm trắc nghiệm chấm ngay
    let max_auto = 0;   // Tổng điểm trắc nghiệm
    let max_total = questions.reduce((sum, q) => sum + q.points, 0);
    let has_ai = false;
    let typing_wpm_val = typing_wpm || null;
    let typing_accuracy_val = typing_accuracy || null;
    // Lưu từng câu trả lời
    for (const ans of answers) {
      const { question_id, answer } = ans;
      const q = questionMap[question_id];
      if (!q) continue;

    
      let is_correct = null;
      let score = null;

      if (!q.ai_graded) {
        // Chấm tự động trắc nghiệm
        max_auto += q.points;

        if (q.question_type === 'multiple_choice') {
          is_correct = (answer?.trim().toUpperCase() === q.correct_answer?.trim().toUpperCase()) ? 1 : 0;
          score = is_correct ? q.points : 0;
          auto_score += score;

        } else if (q.question_type === 'multi_select') {
          // So sánh mảng đáp án
          const given = (answer || '').split(',').map(x => x.trim().toUpperCase()).sort().join(',');
          const correct = (q.correct_answer || '').split(',').map(x => x.trim().toUpperCase()).sort().join(',');
          is_correct = (given === correct) ? 1 : 0;
          score = is_correct ? q.points : 0;
          auto_score += score;

        } else if (q.question_type === 'typing_sample') {
          try {
            // TypingTest.jsx gửi kết quả dạng JSON string
            const typingResult = JSON.parse(answer || '{}');
            const wpm = typingResult.wpm || typing_wpm || 0;
            const accuracy = typingResult.accuracy || typing_accuracy || 0;

            const wpm_score = Math.min(wpm / 40, 1) * 0.5;   // 40 WPM chuẩn
            const acc_score = (accuracy / 100) * 0.5;
            score = Math.round(q.points * (wpm_score + acc_score));
            is_correct = score >= q.points * 0.6 ? 1 : 0;
            auto_score += score;

            // Lưu WPM để hiển thị sau
            typing_wpm_val = wpm;
            typing_accuracy_val = accuracy;
          } catch {
            score = 0; is_correct = 0;
          }
        }
      } else {
        has_ai = true; // Có câu AI chấm → chưa có kết quả ngay
      }

      // Upsert câu trả lời
      await conn.query(
        `INSERT INTO test_answers
           (assignment_id, question_id, answer, is_correct, score)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           answer     = VALUES(answer),
           is_correct = VALUES(is_correct),
           score      = VALUES(score)`,
        [assignment_id, question_id, answer || null, is_correct, score]
      );
    }

    // Cập nhật trạng thái assignment → submitted
    await conn.query(
      "UPDATE test_assignments SET status = 'submitted', submitted_at = NOW() WHERE id = ?",
      [assignment_id]
    );

    // Nếu không có câu AI chấm → lưu kết quả ngay
    let result = null;
    if (!has_ai) {
      const percentage = max_total > 0
        ? Math.round((auto_score / max_total) * 100)
        : 0;
      const passed = percentage >= assignment.passing_score ? 1 : 0;

      await conn.query(
        `INSERT INTO test_results
           (assignment_id, total_score, max_score, percentage, passed, typing_wpm, typing_accuracy)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           total_score     = VALUES(total_score),
           max_score       = VALUES(max_score),
           percentage      = VALUES(percentage),
           passed          = VALUES(passed),
           typing_wpm      = VALUES(typing_wpm),
           typing_accuracy = VALUES(typing_accuracy)`,
        [
          assignment_id,
          auto_score,
          max_total,
          percentage,
          passed,
          typing_wpm_val,
          typing_accuracy_val
        ]
      );

      // Cập nhật status → graded
      await conn.query(
        "UPDATE test_assignments SET status = 'graded' WHERE id = ?",
        [assignment_id]
      );

      result = { total_score: auto_score, max_score: max_total, percentage, passed };
    }

    await conn.commit();

    res.json({
      message: has_ai
        ? 'Nộp bài thành công. Bài đang chờ AI chấm điểm.'
        : 'Nộp bài thành công.',
      status: has_ai ? 'submitted' : 'graded',
      has_ai_grading: has_ai,
      result  // null nếu còn chờ AI chấm
    });

  } catch (err) {
    await conn.rollback();
    console.error('submit error:', err);
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

// ============================================================
// GET /api/candidate/assignments/:assignment_id/result
// Ứng viên xem kết quả sau khi đã chấm xong
// ============================================================
router.get('/assignments/:assignment_id/result', candidateMiddleware, async (req, res) => {
  try {
    const { application_id } = req.candidate;
    const { assignment_id } = req.params;

    const [assignments] = await pool.query(
      `SELECT ta.status, ta.submitted_at, t.title, t.type, t.passing_score
       FROM test_assignments ta
       JOIN tests t ON t.id = ta.test_id
       WHERE ta.id = ? AND ta.application_id = ?`,
      [assignment_id, application_id]
    );

    if (!assignments.length) {
      return res.status(404).json({ message: 'Không tìm thấy bài test' });
    }

    const assignment = assignments[0];

    if (!['submitted', 'graded'].includes(assignment.status)) {
      return res.status(400).json({ message: 'Bài test chưa được nộp' });
    }

    const [results] = await pool.query(
      'SELECT * FROM test_results WHERE assignment_id = ?',
      [assignment_id]
    );

    if (!results.length) {
      return res.json({
        status: 'submitted',
        message: 'Bài đang chờ AI chấm điểm, vui lòng chờ.'
      });
    }

    const result = results[0];

    // Lấy chi tiết từng câu (ẩn correct_answer với câu chưa chấm)
    const [answers] = await pool.query(
      `SELECT
         ans.question_id,
         ans.answer,
         ans.is_correct,
         ans.score,
         ans.ai_feedback,
         tq.content,
         tq.question_type,
         tq.points        AS max_points,
         tq.ai_graded,
         CASE WHEN ans.is_correct IS NOT NULL THEN tq.correct_answer ELSE NULL END AS correct_answer
       FROM test_answers ans
       JOIN test_questions tq ON tq.id = ans.question_id
       WHERE ans.assignment_id = ?
       ORDER BY tq.\`order\``,
      [assignment_id]
    );

    res.json({
      title: assignment.title,
      type: assignment.type,
      status: assignment.status,
      submitted_at: assignment.submitted_at,
      passing_score: assignment.passing_score,
      total_score: result.total_score,
      max_score: result.max_score,
      percentage: result.percentage,
      passed: result.passed,
      typing_wpm: result.typing_wpm,
      typing_accuracy: result.typing_accuracy,
      ai_summary: result.ai_summary,
      graded_at: result.graded_at,
      answers
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// POST /api/candidate/assignments/:id/violations — Ghi vi phạm
router.post('/assignments/:id/violations', candidateMiddleware, async (req, res) => {
  try {
    const { reason, count } = req.body;
    const vCount = count || 1;
    await pool.query(
      `UPDATE test_assignments 
       SET violation_count = ?, violations = ?, last_violation = ? 
       WHERE id = ? AND application_id = ?`,
      [vCount, vCount, reason, req.params.id, req.candidate.application_id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/assignments/:id/lock', candidateMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    await pool.query(
      `UPDATE test_assignments 
       SET is_locked = 1, status = 'submitted', lock_reason = ?, locked_at = NOW(),
           violation_count = GREATEST(IFNULL(violation_count, 0), 1),
           violations = GREATEST(IFNULL(violations, 0), 1)
       WHERE id = ? AND application_id = ?`,
      [reason, req.params.id, req.candidate.application_id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;