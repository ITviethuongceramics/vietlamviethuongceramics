// routes/branches.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { authMiddleware } = require('./auth');

const upload = multer({ storage: multer.memoryStorage() });

async function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'branches' },
      (err, result) => (err ? reject(err) : resolve(result))
    ).end(buffer);
  });
}

// Helper kiểm tra kết nối DB
function checkDb(req, res) {
  if (!req.db || typeof req.db.query !== 'function') {
    console.error('❌ req.db not available');
    throw new Error('Database connection not initialized');
  }
}

// ─── GET /api/branches (public) ─────────────────────────────────
router.get('/', async (req, res) => {
  try {
    checkDb(req);
    const [rows] = await req.db.query(
      'SELECT * FROM branches ORDER BY sort_order ASC, id ASC'
    );
    // ✅ Luôn trả về mảng, kể cả khi rows là null/undefined
    res.json(rows || []);
  } catch (err) {
    console.error('[GET /api/branches] ERROR:', err);
    res.status(500).json({ 
      message: 'Lỗi server khi lấy danh sách chi nhánh',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ─── GET /api/branches/:id (public) ────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    checkDb(req);
    const [rows] = await req.db.query(
      'SELECT * FROM branches WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[GET /api/branches/:id] ERROR:', err);
    res.status(500).json({ 
      message: 'Lỗi server khi lấy chi nhánh',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ─── POST /api/branches (admin only) ───────────────────────────
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    checkDb(req);
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
    console.error('[POST /api/branches] ERROR:', err);
    res.status(500).json({ 
      message: 'Lỗi server khi tạo chi nhánh',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ─── PUT /api/branches/:id (admin only) ────────────────────────
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    checkDb(req);
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
    console.error('[PUT /api/branches/:id] ERROR:', err);
    res.status(500).json({ 
      message: 'Lỗi server khi cập nhật chi nhánh',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ─── DELETE /api/branches/:id (admin only) ─────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    checkDb(req);
    const [existing] = await req.db.query(
      'SELECT * FROM branches WHERE id = ?', [req.params.id]
    );
    if (!existing.length) {
      return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });
    }

    await req.db.query('DELETE FROM branches WHERE id = ?', [req.params.id]);
    res.json({ message: 'Đã xóa thành công', deleted: existing[0] });
  } catch (err) {
    console.error('[DELETE /api/branches/:id] ERROR:', err);
    res.status(500).json({ 
      message: 'Lỗi server khi xóa chi nhánh',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;