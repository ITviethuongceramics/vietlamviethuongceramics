const express  = require('express');
const router   = express.Router();
const pool     = require('../data/db');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { authMiddleware } = require('./auth');
const heicConvert = require('heic-convert');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/about');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    cb(null, file.fieldname + '_' + Date.now() + ext);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadFields = upload.fields([
  { name: 'intro_image',   maxCount: 1 },
  { name: 'mission_image', maxCount: 1 },
  { name: 'vision_image',  maxCount: 1 },
]);

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// ── GET ──────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM about_dynamic ORDER BY id DESC LIMIT 1');
    if (rows.length === 0) return res.json({});
    const row = rows[0];
    if (typeof row.stats         === 'string') row.stats         = JSON.parse(row.stats         || '[]');
    if (typeof row.vision_points === 'string') row.vision_points = JSON.parse(row.vision_points || '[]');
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT ──────────────────────────────────────────────────────
router.put('/', uploadFields, authMiddleware, async (req, res) => {
  try {
    console.log('body:', req.body);
    console.log('files:', req.files);

    const stats = req.body?.stats
      ? (Array.isArray(req.body.stats) ? req.body.stats : JSON.parse(req.body.stats))
      : [];

    const vision_points = req.body?.vision_points
      ? (Array.isArray(req.body.vision_points) ? req.body.vision_points : JSON.parse(req.body.vision_points))
      : [];

    const intro_eyebrow      = req.body?.intro_eyebrow      ?? '';
    const intro_heading      = req.body?.intro_heading      ?? '';
    const intro_heading_span = req.body?.intro_heading_span ?? '';
    const intro_text1        = req.body?.intro_text1        ?? '';
    const intro_text2        = req.body?.intro_text2        ?? '';
    const intro_text3        = req.body?.intro_text3        ?? '';
    const intro_pill         = req.body?.intro_pill         ?? '';
    const vision_title       = req.body?.vision_title       ?? '';
    const mission_title      = req.body?.mission_title      ?? '';
    const mission_text       = req.body?.mission_text       ?? '';

    let intro_image_url   = req.body?.intro_image_url   ?? '';
    let mission_image_url = req.body?.mission_image_url ?? '';
    let vision_image_url  = req.body?.vision_image_url  ?? '';

    if (req.files?.intro_image?.[0])
      intro_image_url = `${BASE_URL}/uploads/about/${req.files.intro_image[0].filename}`;
    if (req.files?.mission_image?.[0])
      mission_image_url = `${BASE_URL}/uploads/about/${req.files.mission_image[0].filename}`;
    if (req.files?.vision_image?.[0])
      vision_image_url = `${BASE_URL}/uploads/about/${req.files.vision_image[0].filename}`;

    // ✅ values theo đúng thứ tự cột trong query
    const values = [
      JSON.stringify(stats),
      intro_eyebrow,
      intro_heading,
      intro_heading_span,
      intro_text1,
      intro_text2,
      intro_text3,
      intro_pill,
      intro_image_url,
      vision_title,
      JSON.stringify(vision_points),
      vision_image_url,
      mission_title,
      mission_text,
      mission_image_url,
    ];

    const [existing] = await pool.query('SELECT id FROM about_dynamic LIMIT 1');

    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO about_dynamic
          (stats, intro_eyebrow, intro_heading, intro_heading_span,
           intro_text1, intro_text2, intro_text3, intro_pill, intro_image_url,
           vision_title, vision_points, vision_image_url,
           mission_title, mission_text, mission_image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values
      );
    } else {
      await pool.query(
        `UPDATE about_dynamic SET
          stats=?, intro_eyebrow=?, intro_heading=?, intro_heading_span=?,
          intro_text1=?, intro_text2=?, intro_text3=?, intro_pill=?, intro_image_url=?,
          vision_title=?, vision_points=?, vision_image_url=?,
          mission_title=?, mission_text=?, mission_image_url=?
         WHERE id=?`,
        [...values, existing[0].id]
      );
    }

    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;