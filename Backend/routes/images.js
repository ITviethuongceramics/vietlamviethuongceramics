const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { authMiddleware } = require('./auth'); // đổi tên nếu khác

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/homepage');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.key}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/images/homepage — trả về tất cả URL ảnh
router.get('/homepage', (req, res) => {
  const dir = path.join(__dirname, '../uploads/homepage');
  if (!fs.existsSync(dir)) return res.json({});
  const files = fs.readdirSync(dir);
  const result = {};
  files.forEach(f => {
    const key = path.parse(f).name;
    result[key] = `${BASE_URL}/uploads/homepage/${f}`;
  });
  res.json(result);
});

// POST /api/images/homepage/:key — upload ảnh
router.post('/homepage/:key', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Không có file' });
  const url = `${BASE_URL}/uploads/homepage/${req.file.filename}`;
  res.json({ url });
});

// DELETE /api/images/homepage/:key — xóa về mặc định
router.delete('/homepage/:key', authMiddleware, (req, res) => {
  const dir = path.join(__dirname, '../uploads/homepage');
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => path.parse(f).name === req.params.key);
    files.forEach(f => fs.unlinkSync(path.join(dir, f)));
  }
  res.json({ message: 'Đã xóa' });
});

module.exports = router;