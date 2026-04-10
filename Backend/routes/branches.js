// routes/branches.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// ✅ SỬA DÒNG NÀY
const { authMiddleware } = require('./auth'); // ← Từ '../middleware/auth' → './auth'

const upload = multer({ storage: multer.memoryStorage() });

// ── Upload ảnh lên Cloudinary ──────────────────────────────────
async function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'branches' },
      (err, result) => (err ? reject(err) : resolve(result))
    ).end(buffer);
  });
}

// ── GET /api/branches — public ─────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await req.db.query(
      'SELECT * FROM branches ORDER BY sort_order ASC, id ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/branches/:id — public ────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await req.db.query(
      'SELECT * FROM branches WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/branches — admin only ───────────────────────────
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, address, email, phone, lat, lng, sort_order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Tên chi nhánh không được để trống' });
    }

    let image_url = req.body.image_url || '';
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      image_url = result.secure_url;
    }

    const [result] = await req.db.query(
      `INSERT INTO branches (name, address, email, phone, lat, lng, image_url, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        address || '',
        email   || '',
        phone   || '',
        lat     ? parseFloat(lat)        : null,
        lng     ? parseFloat(lng)        : null,
        image_url,
        sort_order ? parseInt(sort_order) : 0,
      ]
    );

    const [newRows] = await req.db.query(
      'SELECT * FROM branches WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(newRows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/branches/:id — admin only ────────────────────────
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, email, phone, lat, lng, sort_order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Tên chi nhánh không được để trống' });
    }

    const [existing] = await req.db.query(
      'SELECT * FROM branches WHERE id = ?', [id]
    );
    if (!existing.length) {
      return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });
    }

    let image_url = req.body.image_url !== undefined
      ? req.body.image_url
      : existing[0].image_url;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      image_url = result.secure_url;
    }

    await req.db.query(
      `UPDATE branches
       SET name=?, address=?, email=?, phone=?, lat=?, lng=?, image_url=?, sort_order=?
       WHERE id=?`,
      [
        name.trim(),
        address || '',
        email   || '',
        phone   || '',
        lat     ? parseFloat(lat)        : null,
        lng     ? parseFloat(lng)        : null,
        image_url,
        sort_order ? parseInt(sort_order) : 0,
        id,
      ]
    );

    const [updated] = await req.db.query(
      'SELECT * FROM branches WHERE id = ?', [id]
    );
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/branches/:id — admin only ─────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [existing] = await req.db.query(
      'SELECT * FROM branches WHERE id = ?', [req.params.id]
    );
    if (!existing.length) {
      return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });
    }

    await req.db.query('DELETE FROM branches WHERE id = ?', [req.params.id]);
    res.json({ message: 'Đã xóa thành công', deleted: existing[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;