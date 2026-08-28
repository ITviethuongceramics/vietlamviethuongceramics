const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { authMiddleware } = require('./auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req) => ({
    folder: 'viethuong/homepage',
    public_id: req.params.key,  // tên file = key (banner1, banner2...)
    overwrite: true,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  }),
});

const upload = multer({ storage });

// GET — trả về tất cả ảnh từ Cloudinary folder
router.get('/homepage', async (req, res) => {
  try {
    const result = await cloudinary.search
      .expression('folder:viethuong/homepage')
      .execute();
    const images = {};
    result.resources.forEach(r => {
      const key = r.public_id.replace('viethuong/homepage/', '');
      images[key] = r.secure_url;
    });
    res.json(images);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST — upload ảnh
router.post('/homepage/:key', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Không có file' });
  res.json({ url: req.file.path }); // Cloudinary trả về secure_url qua req.file.path
});

// DELETE — xóa ảnh
router.delete('/homepage/:key', authMiddleware, async (req, res) => {
  try {
    await cloudinary.uploader.destroy(`viethuong/homepage/${req.params.key}`);
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;