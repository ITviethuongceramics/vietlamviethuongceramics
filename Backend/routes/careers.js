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

async function sendMailToCandidate({ to, subject, html }) {
  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.sender      = { name: 'Viet Huong Ceramics', email: process.env.GMAIL_USER };
  email.to          = [{ email: to }];
  email.subject     = subject;
  email.htmlContent = html;
  return apiInstance.sendTransacEmail(email);
}

async function sendMailToHR({ subject, html, attachments }) {
  const email = new SibApiV3Sdk.SendSmtpEmail();
  email.sender      = { name: 'Việt Hương Ceramics', email: 'no-reply@viet-huong.brevo.com' };
  email.to          = [{ email: process.env.HR_MAIL }];
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
    const idx = list.findIndex(r => r.id === record.id);
    if (idx >= 0) list[idx] = record;
    else list.push(record);
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

  // ✅ Lưu record & trả về thành công NGAY, không chờ upload hay mail
  const record = {
    id:         Date.now(),
    fullName:   _fullName,
    email:      _email,
    phone:      _phone,
    position:   _position,
    experience: _experience || '',
    address:    _address    || '',
    cvFileName: 'Đang xử lý...',
    receivedAt: new Date().toISOString(),
  };

  saveRecord(record);
  res.json({ success: true }); // ← frontend nhận ngay lập tức

  // ✅ Mọi thứ nặng chạy ngầm phía sau
  (async () => {
    try {
      // Upload CV
      let cvLink = null;
      if (cvFile) {
        try {
          cvLink = await uploadCV(cvFile.path, cvFile.originalname);
          record.cvFileName = cvLink;
          saveRecord(record);
        } catch (err) {
          console.error('[UPLOAD ERROR]', err.message);
          record.cvFileName = 'Lỗi upload';
          saveRecord(record);
        }
      } else {
        record.cvFileName = 'Không có';
        saveRecord(record);
      }

      // Ghi Google Sheets
      appendToSheet(record).catch(err => console.error('[SHEETS ERROR]', err.message));

      // Gửi 2 mail song song
      await Promise.all([
        sendMailToCandidate({
          to:      _email,
          subject: 'Xác nhận nhận hồ sơ ứng tuyển — Việt Hương Ceramics',
          html:    candidateEmailHtml({ fullName: _fullName, position: _position, experience: _experience, phone: _phone, address: _address, cvFile }),
        }).then(() => console.log('[EMAIL OK] Ứng viên:', _email))
          .catch(err => console.error('[EMAIL LỖI] Ứng viên:', err.message)),

        sendMailToHR({
          subject:     `[Ứng tuyển mới] ${_fullName} — ${_position}`,
          html:        hrEmailHtml({ fullName: _fullName, email: _email, phone: _phone, position: _position, experience: _experience, address: _address, coverLetter: _coverLetter, cvFile }),
          attachments: cvFile ? [{ filename: cvFile.originalname, path: cvFile.path }] : [],
        }).then(() => console.log('[EMAIL OK] HR:', process.env.HR_MAIL))
          .catch(err => console.error('[EMAIL LỖI] HR:', err.message)),
      ]);

      markEmailSent(record);
      if (cvFile) { try { fs.unlinkSync(cvFile.path); } catch {} }

    } catch (err) {
      console.error('[BACKGROUND ERROR]', err.message);
    }
  })();
});

module.exports = router;