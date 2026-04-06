const express = require('express');
const router = express.Router();
const pool = require('../data/db');
const jwt = require('jsonwebtoken');

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

// GET /api/applications — Danh sách ứng viên
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, position, search } = req.query;
    let query = 'SELECT * FROM applications WHERE 1=1';
    const params = [];
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (position) { query += ' AND position = ?'; params.push(position); }
    if (search) { query += ' AND (full_name LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY received_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/applications/:id — Cập nhật trạng thái + ghi chú
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { status, note } = req.body;
    await pool.query(
      'UPDATE applications SET status = ?, note = ? WHERE id = ?',
      [status, note, req.params.id]
    );
    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;