const express = require('express');
const router = express.Router();
const pool = require('../data/db');
const jwt = require('jsonwebtoken');

// Middleware xác thực admin
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

// GET /api/jobs — Lấy danh sách việc làm
router.get('/', async (req, res) => {
  try {
    const { search, location, type, experience } = req.query;
    let query = "SELECT * FROM jobs WHERE status = 'active'";
    const params = [];
    if (search) { query += ' AND title LIKE ?'; params.push(`%${search}%`); }
    if (location) { query += ' AND location = ?'; params.push(location); }
    if (type) { query += ' AND type = ?'; params.push(type); }
    if (experience) { query += ' AND experience = ?'; params.push(experience); }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, department, location, type, experience, salary, description, requirements, benefits, deadline } = req.body;
    const [result] = await pool.query(
      'INSERT INTO jobs (title, department, location, type, experience, salary, description, requirements, benefits, deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, department, location, type, experience, salary, description, requirements, benefits, deadline]
    );
    res.json({ id: result.insertId, message: 'Tạo thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, department, location, type, experience, salary, description, requirements, benefits, deadline, status } = req.body;
    await pool.query(
      'UPDATE jobs SET title=?, department=?, location=?, type=?, experience=?, salary=?, description=?, requirements=?, benefits=?, deadline=?, status=? WHERE id=?',
      [title, department, location, type, experience, salary, description, requirements, benefits, deadline, status, req.params.id]
    );
    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM jobs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Xóa thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;