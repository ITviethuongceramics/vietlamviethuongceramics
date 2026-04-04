const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');
const { candidateEmailHtml, hrEmailHtml } = require('./email_templates');
const { uploadCV, appendToSheet } = require('../services/google');
// ── Multer config ────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'cv');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Chi chap nhan file PDF, Word hoac anh.'));
  },
});

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

// ── Middleware ───────────────────────────────────────────────
const handleUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    upload.single('cv')(req, res, next);
  } else {
    next();
  }
};

// ── Logging ──────────────────────────────────────────────────
function saveRecord(record) {
  try {
    const logDir  = path.join(__dirname, '..', 'data');
    const logPath = path.join(logDir, 'applications.json');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const list = fs.existsSync(logPath)
      ? JSON.parse(fs.readFileSync(logPath, 'utf8'))
      : [];
    list.push(record);
    fs.writeFileSync(logPath, JSON.stringify(list, null, 2));
    return list;
  } catch (err) {
    console.error('[LOG ERROR]', err.message);
    return null;
  }
}

function markEmailSent(record) {
  try {
    const logPath = path.join(__dirname, '..', 'data', 'applications.json');
    const list = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    const found = list.find(r => r.id === record.id);
    if (found) found.emailSent = true;
    fs.writeFileSync(logPath, JSON.stringify(list, null, 2));
  } catch (err) {
    console.error('[LOG UPDATE ERROR]', err.message);
  }
}

// ── POST /api/careers/apply ──────────────────────────────────
router.post('/apply', handleUpload, async (req, res) => {
  const { fullName, email, phone, position, experience, address, coverLetter } = req.body;
  const cvFile = req.file;

  // Normalize Unicode NFC — tránh dấu tiếng Việt bị tách (NFD) từ browser/OS
  const norm = s => (s ? String(s).normalize('NFC') : s);
  const [_fullName, _email, _phone, _position, _experience, _address, _coverLetter] = [
    fullName, email, phone, position, experience, address, coverLetter
  ].map(norm);

  // ── Validation ───────────────────────────────────────────
  const errors = {};
  if (!_fullName || !_fullName.trim())
    errors.fullName = 'Vui long nhap ho va ten.';
  if (!_email || !_email.trim()) {
    errors.email = 'Vui long nhap dia chi email.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(_email.trim())) {
    errors.email = 'Dia chi email khong hop le.';
  }
  if (!_phone || !_phone.trim()) {
    errors.phone = 'Vui long nhap so dien thoai.';
  } else if (!/^[0-9+\-\s]{8,15}$/.test(_phone.trim())) {
    errors.phone = 'So dien thoai khong hop le.';
  }
  if (!_position || !_position.trim())
    errors.position = 'Vui long chon vi tri ung tuyen.';

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Vui long dien day du thong tin bat buoc.',
      errors,
    });
  }

  const attachments = cvFile
    ? [{ filename: cvFile.originalname, path: cvFile.path }]
    : [];
// ── Upload CV lên Cloudinary ─────────────────────────────
let cvLink = null;
if (cvFile) {
  try {
cvLink = await uploadCV(cvFile.path, cvFile.originalname);
  } catch (err) {
    console.error('[UPLOAD ERROR]', err.message);
  }
} 
// ── Lưu hồ sơ ───────────────────────────────────────────
  const record = {
    id: Date.now(),
    fullName:    _fullName,
    email:       _email,
    phone:       _phone,
    position:    _position,
    experience:  _experience || '',
    address:     _address    || '',
   cvFileName: cvLink || 'Không có',
    receivedAt:  new Date().toISOString(),
  };

  appendToSheet(record).catch(err => console.error('[SHEETS ERROR]', err.message));

  res.json({ success: true });

  Promise.all([
    transporter.sendMail({
      from: `"=?UTF-8?B?${Buffer.from('Việt Hương Ceramics').toString('base64')}?=" <${process.env.GMAIL_USER}>`,
      to: _email,
      subject: `=?UTF-8?B?${Buffer.from('Xác nhận nhận hồ sơ ứng tuyển — Việt Hương Ceramics').toString('base64')}?=`,
      html: candidateEmailHtml({ fullName: _fullName, position: _position, experience: _experience, phone: _phone, address: _address, cvFile }),
      encoding: 'utf8',
    }),
    transporter.sendMail({
      from: `"=?UTF-8?B?${Buffer.from('Hệ thống tuyển dụng').toString('base64')}?=" <${process.env.GMAIL_USER}>`,
      to: process.env.HR_MAIL,
      subject: `=?UTF-8?B?${Buffer.from(`[Ứng tuyển mới] ${_fullName} — ${_position}`).toString('base64')}?=`,
      attachments,
      html: hrEmailHtml({ fullName: _fullName, email: _email, phone: _phone, position: _position, experience: _experience, address: _address, coverLetter: _coverLetter, cvFile }),
      encoding: 'utf8',
    }),
  ])
.then(() => {
  markEmailSent(record);
  if (cvFile) {
    try { fs.unlinkSync(cvFile.path); } catch {}
  }
})
.catch(err => console.error('[EMAIL ERROR] id:', record.id, '|', err.message));
});

// ── Warm up SMTP ─────────────────────────────────────────────
transporter.verify()
  .then(() => console.log('[SMTP] Ket noi Gmail san sang ✓'))
  .catch(err => console.error('[SMTP] Loi ket noi:', err.message));

module.exports = router;
