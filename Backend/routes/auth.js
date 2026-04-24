const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../data/db');

// ── Helpers ──────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// ── Auth Middlewares ─────────────────────────────────────────

/** Dành cho HR / Admin */
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'candidate') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
}

/** Dành cho ứng viên */
function candidateMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'candidate') {
      return res.status(403).json({ message: 'Chỉ dành cho ứng viên' });
    }
    req.candidate = decoded; // { id, application_id, email, full_name, role }
    next();
  } catch {
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
}

/** Cho phép cả HR lẫn ứng viên (dùng trong các route dùng chung) */
function anyAuthMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
}

// ── POST /api/auth/login ─────────────────────────────────────
// Login cho HR/Admin — không thay đổi
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query(
      'SELECT * FROM admins WHERE username = ?',
      [username]
    );
    if (!rows.length) {
      return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
    }
    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
    }
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, username: admin.username, role: admin.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/candidate/login ──────────────────────────
/**
 * Ứng viên đăng nhập bằng email.
 * Mật khẩu mặc định = email (plain text lần đầu, sau đó hash).
 * Hệ thống tự hash + lưu lại khi lần đầu đăng nhập.
 */
router.post('/candidate/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Thiếu email hoặc mật khẩu' });
    }

    // Tìm hồ sơ ứng viên theo email
    const [rows] = await pool.query(
      `SELECT id, full_name, email, status, password AS hashed_pw
       FROM applications
       WHERE email = ?
       LIMIT 1`,
      [email.trim().toLowerCase()]
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'Email không tồn tại trong hệ thống' });
    }

    const app = rows[0];

    // Ứng viên bị từ chối thì không cho login
    if (app.status === 'rejected') {
      return res.status(403).json({ message: 'Tài khoản không được phép truy cập' });
    }

    let passwordOk = false;

    if (!app.hashed_pw) {
      // --- Lần đầu login: pass mặc định = email ---
      passwordOk = (password.trim() === email.trim().toLowerCase());

      if (passwordOk) {
        // Hash và lưu vào DB ngay
        const hash = await bcrypt.hash(password.trim(), 10);
        await pool.query(
          'UPDATE applications SET password = ?, last_login = NOW() WHERE id = ?',
          [hash, app.id]
        );
      }
    } else {
      // --- Các lần sau: so với hash đã lưu ---
      passwordOk = await bcrypt.compare(password.trim(), app.hashed_pw);
      if (passwordOk) {
        await pool.query(
          'UPDATE applications SET last_login = NOW() WHERE id = ?',
          [app.id]
        );
      }
    }

    if (!passwordOk) {
      return res.status(401).json({ message: 'Mật khẩu không đúng' });
    }

    // Lấy danh sách bài test được assign (kèm status)
    const [assignments] = await pool.query(
      `SELECT ta.id AS assignment_id, t.title, t.type, t.time_limit,
              ta.status, ta.deadline
       FROM test_assignments ta
       JOIN tests t ON t.id = ta.test_id
       WHERE ta.application_id = ?
       ORDER BY ta.assigned_at DESC`,
      [app.id]
    );

    const token = jwt.sign(
      {
        role:           'candidate',
        application_id: app.id,
        email:          app.email,
        full_name:      app.full_name,
      },
      JWT_SECRET,
      { expiresIn: '8h' } // Token ngắn hơn HR vì chỉ dùng làm bài
    );

    res.json({
      token,
      role:        'candidate',
      full_name:   app.full_name,
      email:       app.email,
      assignments, // Trả về luôn để frontend hiển thị danh sách bài test
    });

  } catch (err) {
    console.error('candidate/login error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/auth/candidate/me ───────────────────────────────
// Ứng viên lấy thông tin + bài test của mình
router.get('/candidate/me', candidateMiddleware, async (req, res) => {
  try {
    const { application_id } = req.candidate;

    const [appRows] = await pool.query(
      'SELECT id, full_name, email, phone, position, status, last_login FROM applications WHERE id = ?',
      [application_id]
    );
    if (!appRows.length) {
      return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });
    }

    const [assignments] = await pool.query(
      `SELECT
         ta.id          AS assignment_id,
         t.id           AS test_id,
         t.title,
         t.type,
         t.time_limit,
         ta.status,
         ta.deadline,
         ta.started_at,
         ta.submitted_at,
         tr.percentage,
         tr.passed,
         tr.typing_wpm,
         tr.ai_summary
       FROM test_assignments ta
       JOIN tests t ON t.id = ta.test_id
       LEFT JOIN test_results tr ON tr.assignment_id = ta.id
       WHERE ta.application_id = ?
       ORDER BY ta.assigned_at DESC`,
      [application_id]
    );

    res.json({ ...appRows[0], assignments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/auth/users ──────────────────────────────────────
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, role, created_at FROM admins ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/users ─────────────────────────────────────
router.post('/users', authMiddleware, async (req, res) => {
  try {
    const { username, password, role = 'admin' } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Thiếu username hoặc password' });
    }
    const [existing] = await pool.query(
      'SELECT id FROM admins WHERE username = ?',
      [username]
    );
    if (existing.length) {
      return res.status(400).json({ message: 'Username đã tồn tại' });
    }
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO admins (username, password, role) VALUES (?, ?, ?)',
      [username, hash, role]
    );
    res.json({ id: result.insertId, username, role, message: 'Tạo tài khoản thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/auth/users/:id ──────────────────────────────────
router.put('/users/:id', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Thiếu password mới' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE admins SET password = ? WHERE id = ?', [hash, req.params.id]);
    res.json({ message: 'Cập nhật mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/auth/users/:id ───────────────────────────────
router.delete('/users/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ message: 'Không thể xóa tài khoản đang đăng nhập' });
    }
    await pool.query('DELETE FROM admins WHERE id = ?', [req.params.id]);
    res.json({ message: 'Xóa tài khoản thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
module.exports.authMiddleware      = authMiddleware;
module.exports.candidateMiddleware = candidateMiddleware;
module.exports.anyAuthMiddleware   = anyAuthMiddleware;