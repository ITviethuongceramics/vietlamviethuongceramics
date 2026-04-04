const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const SibApiV3Sdk = require('@getbrevo/brevo');
const { candidateEmailHtml, hrEmailHtml } = require('./email_templates');
const { uploadCV, appendToSheet } = require('../services/google');

// ── Brevo API ────────────────────────────────────────────────
const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendMail({ to, subject, html, attachments }) {
  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.sender      = { name: 'Việt Hương Ceramics', email: process.env.GMAIL_USER };
  email.to          = [{ email: to }];
  email.subject     = subject;
  email.htmlContent = html;
  if (attachments && attachments.length > 0) {
    email.attachment = attachments.map(a => ({
      name: a.filename,
      content: fs.readFileSync(a.path).toString('base64'),
    }));
  }
  return apiInstance.sendTransacEmail(email);
}

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

  const norm = s => (s ? String(s).normalize('NFC') : s);
  const [_fullName, _email, _phone, _position, _experience, _address, _coverLetter] = [
    fullName, email, phone, position, experience, address, coverLetter
  ].map(norm);

  const errors = {};
  if (!_fullName || !_fullName.trim()) errors.fullName = 'Vui long nhap ho va ten.';
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
  if (!_position || !_position.trim()) errors.position = 'Vui long chon vi tri ung tuyen.';

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Vui long dien day du thong tin bat buoc.', errors });
  }

  // ── Upload CV ────────────────────────────────────────────
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
    id:         Date.now(),
    fullName:   _fullName,
    email:      _email,
    phone:      _phone,
    position:   _position,
    experience: _experience || '',
    address:    _address    || '',
    cvFileName: cvLink      || 'Không có',
    receivedAt: new Date().toISOString(),
  };

  saveRecord(record);
  appendToSheet(record).catch(err => console.error('[SHEETS ERROR]', err.message));
  res.json({ success: true });

  // ── Gửi email song song ──────────────────────────────────
  Promise.all([
    sendMail({
      to:      _email,
      subject: 'Xác nhận nhận hồ sơ ứng tuyển — Việt Hương Ceramics',
      html:    candidateEmailHtml({ fullName: _fullName, position: _position, experience: _experience, phone: _phone, address: _address, cvFile }),
    }).then(() => console.log('[EMAIL OK] Ứng viên:', _email))
      .catch(err => console.error('[EMAIL LỖI] Ứng viên:', err.message)),

    sendMail({
      to:          process.env.HR_MAIL,
      subject:     `[Ứng tuyển mới] ${_fullName} — ${_position}`,
      html:        hrEmailHtml({ fullName: _fullName, email: _email, phone: _phone, position: _position, experience: _experience, address: _address, coverLetter: _coverLetter, cvFile }),
      attachments: cvFile ? [{ filename: cvFile.originalname, path: cvFile.path }] : [],
    }).then(() => console.log('[EMAIL OK] HR:', process.env.HR_MAIL))
      .catch(err => console.error('[EMAIL LỖI] HR:', err.message)),
  ]).then(() => {
    markEmailSent(record);
    if (cvFile) { try { fs.unlinkSync(cvFile.path); } catch {} }
  });
});

module.exports = router;