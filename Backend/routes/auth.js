const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../data/db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', username, password);
    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
    console.log('Found rows:', rows.length);
    if (!rows.length) return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
    const admin = rows[0];
    console.log('Hash:', admin.password);
    const isMatch = await bcrypt.compare(password, admin.password);
    console.log('isMatch:', isMatch);
    if (!isMatch) return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
    const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET || 'secret123', { expiresIn: '7d' });
    res.json({ token, username: admin.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;