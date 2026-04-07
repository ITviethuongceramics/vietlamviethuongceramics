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

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, position, search, location, department } = req.query;

    let query = `
      SELECT 
        a.*,
        j.department,
        j.location   AS job_location,
        j.experience AS job_experience
      FROM applications a
      LEFT JOIN jobs j 
        ON a.position = j.title
        AND j.id = (
          SELECT MIN(id) FROM jobs WHERE title = a.position
        )
      WHERE 1=1
    `;
    const params = [];

    if (status)     { query += ' AND a.status = ?';     params.push(status); }
    if (position)   { query += ' AND a.position = ?';   params.push(position); }
    if (search)     { query += ' AND (a.full_name LIKE ? OR a.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (location)   { query += ' AND j.location = ?';   params.push(location); }
    if (department) { query += ' AND j.department = ?'; params.push(department); }

    query += ' ORDER BY a.received_at DESC';
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