const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../data/db');

// ── Auth Middleware ──────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    next();
  } catch {
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
}

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
    if (!rows.length) return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '7d' }
    );
    res.json({ token, username: admin.username, role: admin.role });
  } catch (err) {                          // ← thiếu dòng này
    res.status(500).json({ message: err.message });
  }                                        // ← và dòng này
});                                        // ← và dòng này

// ── GET /api/auth/users ──────────────────────────────────────
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, role, created_at FROM admins ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/users ─────────────────────────────────────
router.post('/users', authMiddleware, async (req, res) => {
  try {
    const { username, password, role = 'admin' } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Thiếu username hoặc password' });
    const [existing] = await pool.query('SELECT id FROM admins WHERE username = ?', [username]);
    if (existing.length) return res.status(400).json({ message: 'Username đã tồn tại' });
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