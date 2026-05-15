console.log('[DEBUG] BREVO_USER:', process.env.BREVO_USER);
console.log('[DEBUG] BREVO_PASS:', process.env.BREVO_PASS?.substring(0, 20));
const express = require('express');
const router = express.Router();
const pool = require('../data/db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { uploadCV, appendToSheet, appendOfferToSheet } = require('../services/google');
const { candidateEmailHtml, hrEmailHtml } = require('./email_templates');

// ── AUTH ─────────────────────────────────────────────────────
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


// Xóa:
// const nodemailer = require('nodemailer');
// const transporter = nodemailer.createTransport({...});

// ── EMAIL (Brevo HTTP API) ────────────────────────────────────
async function sendEmail({ to, subject, html, fromName = 'VIET HUONG CERAMICS - Phòng Nhân Sự', attachments = [] }) {
  const body = {
    sender:      { name: fromName, email: process.env.BREVO_FROM },
    to:          [{ email: to }],
    subject,
    htmlContent: html,
  };

  if (attachments.length > 0) {
    body.attachment = attachments
      .filter(a => fs.existsSync(a.path))
      .map(a => ({
        name:    a.filename,
        content: fs.readFileSync(a.path).toString('base64'),
      }));
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: {
      'api-key':      process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Brevo error: ${await res.text()}`);
  return res.json();
}

// ── MULTER ────────────────────────────────────────────────────
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

// Dòng này trong file backend
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // ✅ tăng từ 5MB lên 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Chỉ chấp nhận PDF, Word hoặc ảnh.'));
  },
});

// ── HELPERS ───────────────────────────────────────────────────
const formatMoney = (num) => new Intl.NumberFormat('vi-VN').format(num) + ' VNĐ';
const getHonorific = (name) => name?.toLowerCase().includes('chị') ? 'Chị' : 'Anh';

// ── EMAIL TEMPLATES ───────────────────────────────────────────
function getOfferEmailHTML({ app, position, formattedStartDate, work_location, probation_period, salary, probation_salary_percent, probationSalary, work_schedule }) {
  const h = getHonorific(app.full_name);
  const logoUrl = process.env.LOGO_URL || '';

  const rows = [
    ['1', 'Vị trí',                 position],
    ['2', 'Thời gian nhận việc',    formattedStartDate],
    ['3', 'Địa điểm làm thủ tục nhận việc',      work_location],
    ['4', 'Thời gian thử việc',     `${probation_period} tháng`],
    ['5', 'Lương Gross chính thức', `<strong style="color:#B91C1C;">${formatMoney(salary)}</strong>`],
    ['6', 'Lương thử việc',         `${probation_salary_percent}% lương Gross &nbsp;→&nbsp; <strong style="color:#B91C1C;">${formatMoney(probationSalary)}</strong>`],
    ['7', 'Thời gian làm việc',     work_schedule],
  ];

  const infoRows = rows.map((row, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#fdf6f6'};">
      <td width="32" style="padding:11px 0 11px 14px;vertical-align:top;">
        <div style="width:22px;height:22px;border-radius:50%;background:#B91C1C;color:#fff;font-size:11px;font-weight:700;font-family:Arial,sans-serif;text-align:center;line-height:22px;">${row[0]}</div>
      </td>
      <td width="185" style="padding:11px 8px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#B91C1C;vertical-align:top;">${row[1]}</td>
      <td style="padding:11px 14px 11px 0;font-size:14px;color:#222;vertical-align:top;line-height:1.7;">${row[2]}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0eded;font-family:'Times New Roman',Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0eded;padding:36px 0;">
  <tr><td align="center">
  <table width="660" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 6px 32px rgba(0,0,0,0.12);">
    <tr>
      <td style="background:#B91C1C;padding:22px 28px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;" width="55%">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle;">
                    <img src="${logoUrl}" alt="Việt Hương" width="58" height="58" style="display:block;border-radius:8px;background:#fff;padding:5px;object-fit:contain;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="color:#fff;font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.4px;line-height:1.4;">VIET HUONG CERAMICS</div>
                    <div style="color:rgba(255,255,255,0.72);font-family:Arial,sans-serif;font-size:11px;margin-top:2px;">Công ty cổ phần xây dựng gốm sứ Việt Hương</div>
                    <div style="color:rgba(255,255,255,0.60);font-family:Arial,sans-serif;font-size:10px;margin-top:1px;">133 Trung Lương 14, P. Hòa Xuân, TP. Đà Nẵng</div>
                  </td>
                </tr>
              </table>
            </td>
            <td style="vertical-align:top;text-align:right;" width="45%">
              <div style="color:rgba(255,255,255,0.95);font-family:Arial,sans-serif;font-size:11px;font-weight:700;line-height:1.6;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div style="color:rgba(255,255,255,0.80);font-family:Arial,sans-serif;font-size:11px;margin-right:32px;">Độc lập – Tự do – Hạnh phúc</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background:#B91C1C;padding:18px 28px 24px;text-align:center;">
        <div style="color:#fff;font-family:Arial,sans-serif;font-size:22px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">THƯ MỜI NHẬN VIỆC</div>
        <div style="width:56px;height:3px;background:rgba(255,255,255,0.45);margin:10px auto 0;border-radius:2px;"></div>
      </td>
    </tr>
    <tr>
      <td style="padding:30px 36px 12px;">
        <p style="margin:0 0 10px;font-size:15px;color:#111;"><strong>Kính gửi ${h}: ${app.full_name}</strong></p>
        <p style="margin:0 0 22px;font-size:14px;color:#555;line-height:1.9;">
          Lời đầu tiên, Viet Huong Ceramics chân thành cảm ơn ${h} đã quan tâm đến Công ty chúng tôi.
          Thông qua buổi trao đổi, trân trọng mời ${h} gia nhập đội ngũ Viet Huong Ceramics với thông tin nhận việc cụ thể như sau:
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 36px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #f5e0e0;">
          ${infoRows}
          <tr style="background:#ffffff;">
            <td width="32" style="padding:11px 0 11px 14px;vertical-align:top;">
              <div style="width:22px;height:22px;border-radius:50%;background:#B91C1C;color:#fff;font-size:11px;font-weight:700;font-family:Arial,sans-serif;text-align:center;line-height:22px;">8</div>
            </td>
            <td width="185" style="padding:11px 8px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#B91C1C;vertical-align:top;">Chính sách công ty</td>
            <td style="padding:11px 14px 11px 0;font-size:13px;color:#555;vertical-align:top;line-height:1.9;">
              Theo Luật Lao động VN, Nội quy lao động và Quy định tài chính của Công ty.<br>
              Nội dung cụ thể sẽ được thể hiện đầy đủ trên Hợp đồng lao động.
            </td>
          </tr>
          <tr style="background:#fdf6f6;">
            <td width="32" style="padding:11px 0 11px 14px;vertical-align:top;">
              <div style="width:22px;height:22px;border-radius:50%;background:#B91C1C;color:#fff;font-size:11px;font-weight:700;font-family:Arial,sans-serif;text-align:center;line-height:22px;">9</div>
            </td>
            <td width="185" style="padding:11px 8px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#B91C1C;vertical-align:top;">Hồ sơ cần bổ sung</td>
            <td style="padding:11px 14px 11px 0;font-size:13px;color:#555;vertical-align:top;line-height:2.1;">
              ✔ Sơ yếu lý lịch – 01 bản (có xác nhận địa phương)<br>
              ✔ Giấy khám sức khoẻ – 01 bản<br>
              ✔ Căn cước công dân – 02 bản photo công chứng<br>
              ✔ Ảnh thẻ 3×4 – 02 ảnh<br>
              ✔ Bằng cấp – 01 bản photo công chứng
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:22px 36px 10px;">
        <p style="font-size:14px;color:#555;line-height:1.9;margin:0 0 10px;">
          Khi đến nhận việc, ${h} vui lòng mang theo <strong>laptop cá nhân</strong> để phục vụ công việc.
        </p>
        <p style="font-size:14px;color:#555;line-height:1.9;margin:0 0 16px;">
          Chúng tôi hoan nghênh sự gia nhập của ${h} và hy vọng chúng ta sẽ có sự hợp tác tốt đẹp, lâu bền.
        </p>
        <p style="font-size:15px;color:#B91C1C;font-weight:700;margin:0 0 28px;font-style:italic;">Trân trọng!</p>
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff;padding:18px 28px;border-top:1px solid #f5e0e0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#555555;font-family:Arial,sans-serif;font-size:12px;line-height:1.9;">
              <strong style="color:#B91C1C;font-size:13px;">Công ty cổ phần xây dựng gốm sứ Việt Hương</strong><br>
              Trụ sở chính: 133 Trung Lương 14, P. Hòa Xuân, TP. Đà Nẵng<br>
              <a href="https://viethuongceramics.com" style="color:#B91C1C;text-decoration:none;">viethuongceramics.com</a> &nbsp;|&nbsp; 0905.386.888
            </td>
            <td style="text-align:right;vertical-align:middle;">
              <img src="${logoUrl}" width="50" height="50" style="border-radius:7px;border:1px solid #f5e0e0;padding:4px;object-fit:contain;" />
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  </td></tr>
</table>
</body>
</html>`;
}

function getRejectionEmailHTML({ app }) {
  const h = getHonorific(app.full_name);
  const logoUrl = process.env.LOGO_URL || '';

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0eded;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0eded;padding:36px 0;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 6px 32px rgba(0,0,0,0.12);">
    <tr>
      <td style="background:#B91C1C;padding:30px 28px;text-align:center;">
        <img src="${logoUrl}" alt="Việt Hương Ceramic" width="68" height="68" style="display:block;margin:0 auto 14px;border-radius:10px;background:#fff;padding:6px;object-fit:contain;" />
        <div style="color:#fff;font-size:19px;font-weight:700;letter-spacing:1px;">VIET HUONG CERAMICS</div>
        <div style="color:rgba(255,255,255,0.72);font-size:12px;margin-top:5px;">Công ty cổ phần xây dựng gốm sứ Việt Hương</div>
        <div style="width:50px;height:2px;background:rgba(255,255,255,0.40);margin:14px auto 0;border-radius:2px;"></div>
      </td>
    </tr>
    <tr>
      <td style="background:#fff7f7;padding:14px 28px;border-bottom:1px solid #fde8e8;text-align:center;">
        <div style="font-size:14px;font-weight:700;color:#B91C1C;letter-spacing:1.5px;">THÔNG BÁO KẾT QUẢ TUYỂN DỤNG</div>
      </td>
    </tr>
    <tr>
      <td style="padding:30px 36px 16px;">
        <p style="margin:0 0 16px;font-size:15px;color:#111;">Kính gửi <strong>${h} ${app.full_name}</strong>,</p>
        <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.9;">
          Trước tiên, Công ty cổ phần xây dựng gốm sứ Việt Hương xin chân thành cảm ơn ${h} đã quan tâm
          và dành thời gian ứng tuyển vào vị trí <strong style="color:#B91C1C;">${app.position}</strong> tại Công ty chúng tôi.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
          <tr>
            <td style="background:#fff7f7;border-left:4px solid #B91C1C;border-radius:0 8px 8px 0;padding:16px 20px;">
              <p style="margin:0;font-size:14px;color:#555;line-height:1.9;">
                Sau khi xem xét kỹ lưỡng hồ sơ và qua quá trình tuyển dụng, chúng tôi rất tiếc phải
                thông báo rằng hồ sơ của ${h} <strong style="color:#B91C1C;">chưa phù hợp</strong> với yêu cầu
                của vị trí này tại thời điểm hiện tại.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.9;">
          Quyết định này không phản ánh năng lực của ${h} mà chỉ đơn giản là sự phù hợp với yêu cầu cụ thể của vị trí tuyển dụng lần này.
        </p>
        <p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.9;">
          Chúng tôi rất trân trọng sự quan tâm của ${h} và hy vọng sẽ có cơ hội hợp tác trong tương lai khi có các vị trí phù hợp hơn.
        </p>
        <p style="margin:0 0 26px;font-size:14px;color:#555;line-height:1.9;">Chúc ${h} thành công trong sự nghiệp và tìm được công việc như ý!</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f5e0e0;padding-top:20px;">
          <tr>
            <td>
              <div style="font-size:14px;color:#333;font-weight:700;">Trân trọng,</div>
              <div style="font-size:13px;color:#777;margin-top:5px;">Phòng Nhân sự</div>
              <div style="font-size:13px;color:#B91C1C;font-weight:700;margin-top:2px;">Công ty cổ phần xây dựng gốm sứ Việt Hương</div>
            </td>
            <td style="text-align:right;vertical-align:bottom;">
              <img src="${logoUrl}" width="52" height="52" style="border-radius:8px;border:1px solid #fde8e8;padding:4px;object-fit:contain;" />
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff;padding:18px 28px;border-top:1px solid #f5e0e0;text-align:center;">
        <div style="color:#555555;font-size:12px;line-height:1.9;font-family:Arial,sans-serif;">
          <strong style="color:#B91C1C;font-size:13px;">Công ty cổ phần xây dựng gốm sứ Việt Hương</strong><br>
          Trụ sở chính: 133 Trung Lương 14, P. Hòa Xuân, TP. Đà Nẵng<br>
          <a href="https://viethuongceramics.com" style="color:#B91C1C;text-decoration:none;">viethuongceramics.com</a> &nbsp;|&nbsp; 0905.386.888
        </div>
      </td>
    </tr>
  </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── SEND OFFER ───────────────────────────────────────────────
router.post('/send-offer', authMiddleware, async (req, res) => {
  try {
    const {
      application_id, position, start_date, work_location,
      probation_period, salary, probation_salary_percent, work_schedule
    } = req.body;

    const [apps] = await pool.query('SELECT * FROM applications WHERE id = ?', [application_id]);
    if (apps.length === 0) return res.status(404).json({ message: 'Không tìm thấy ứng viên' });

    const app = apps[0];
    const startDateTime = new Date(start_date);
    const formattedStartDate = `${startDateTime.getHours()}h ngày ${String(startDateTime.getDate()).padStart(2, '0')}/${String(startDateTime.getMonth() + 1).padStart(2, '0')}/${startDateTime.getFullYear()}`;
    const probationSalary = Math.round(parseFloat(salary) * parseFloat(probation_salary_percent) / 100);

    const emailHTML = getOfferEmailHTML({
      app, position, formattedStartDate, work_location,
      probation_period, salary, probation_salary_percent, probationSalary, work_schedule
    });

    await sendEmail({
      to:      app.email,
      subject: `THƯ MỜI NHẬN VIỆC - ${position} - VIET HUONG CERAMICS`,
      html:    emailHTML,
    });

  
  appendOfferToSheet({
  fullName:               app.full_name,
  email:                  app.email,
  offerPosition:          position,
  startDate:              formattedStartDate,
  salary:                 parseFloat(salary),
  probationSalaryPercent: probation_salary_percent,
  probationSalary,
}).catch(err => console.error('[SHEET OFFER ERROR]', err.message));

    res.json({ message: 'Đã gửi thư mời nhận việc thành công' });
  } catch (err) {
    console.error('sendOffer error:', err);
    res.status(500).json({ message: err.message || 'Lỗi khi gửi email' });
  }
});

// ── SEND REJECTION ───────────────────────────────────────────
router.post('/send-rejection', authMiddleware, async (req, res) => {
  try {
    const { application_id } = req.body;

    const [apps] = await pool.query('SELECT * FROM applications WHERE id = ?', [application_id]);
    if (apps.length === 0) return res.status(404).json({ message: 'Không tìm thấy ứng viên' });

    const app = apps[0];
    const emailHTML = getRejectionEmailHTML({ app });

    await sendEmail({
      to:       app.email,
      subject:  'Thông báo kết quả tuyển dụng - Viet Huong Ceramics',
      html:     emailHTML,
      fromName: 'Viet Huong Ceramics - Phòng Nhân Sự',
    });

    res.json({ message: 'Đã gửi email thông báo kết quả' });
  } catch (err) {
    console.error('sendRejection error:', err);
    res.status(500).json({ message: err.message || 'Lỗi khi gửi email' });
  }
});

// ── MANUAL ADD ───────────────────────────────────────────────
router.post('/manual', authMiddleware, upload.single('cv'), async (req, res) => {
  const { full_name, email, phone, position, experience, address, cover_letter } = req.body;
  const cvFile = req.file;

  const errors = {};
  if (!full_name?.trim())  errors.full_name = 'Vui lòng nhập họ tên.';
  if (!email?.trim())      errors.email     = 'Vui lòng nhập email.';
  if (!phone?.trim())      errors.phone     = 'Vui lòng nhập số điện thoại.';
  if (!position?.trim())   errors.position  = 'Vui lòng chọn vị trí.';
  if (Object.keys(errors).length)
    return res.status(400).json({ success: false, errors });

  const id = Date.now();
  let cvLink = null;

  try {
    if (cvFile) {
      try {
        cvLink = await uploadCV(cvFile.path, cvFile.originalname);
      } catch (err) {
        console.error('[UPLOAD ERROR]', err.message);
      }
    }

    await pool.query(
      `INSERT INTO applications 
        (id, full_name, email, phone, position, experience, address, cover_letter, cv_link, email_sent, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
      [id, full_name, email, phone, position, experience || '', address || '', cover_letter || '', cvLink]
    );

    res.json({ success: true });

    (async () => {
      try {
        appendToSheet({
          id, fullName: full_name, email, phone, position,
          experience: experience || '', address: address || '',
          cvFileName: cvLink || 'Không có',
          receivedAt: new Date().toISOString(),
        }).catch(err => console.error('[SHEETS ERROR]', err.message));

      await sendEmail({
  to:      email,
  subject: 'Xác nhận nhận hồ sơ ứng tuyển — Viet Huong Ceramics',
  html:    candidateEmailHtml({ fullName: full_name, position, experience: experience || '', phone, address: address || '', cvFile }),
  fromName: 'Viet Huong Ceramics',
}).then(() => console.log('[EMAIL OK] Ứng viên:', email))
  .catch(err => console.error('[EMAIL LỖI] Ứng viên:', err.message));
        await pool.query('UPDATE applications SET email_sent = 1 WHERE id = ?', [id]);
        if (cvFile) { try { fs.unlinkSync(cvFile.path); } catch {} }
      } catch (err) {
        console.error('[MANUAL BACKGROUND ERROR]', err.message);
      }
    })();

  } catch (err) {
    console.error('[DB ERROR]', err.message);
    if (cvFile) { try { fs.unlinkSync(cvFile.path); } catch {} }
    return res.status(500).json({ success: false, message: 'Lỗi lưu dữ liệu.' });
  }
});

// ── GET ALL ──────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, position, search, location, department } = req.query;

    let query = `
      SELECT a.*, j.department, j.location AS job_location, j.experience AS job_experience
      FROM applications a
      LEFT JOIN jobs j ON a.position = j.title AND j.id = (SELECT MIN(id) FROM jobs WHERE title = a.position)
      WHERE 1=1
    `;
    const params = [];

    if (status)     { query += ' AND a.status = ?';                           params.push(status); }
    if (position)   { query += ' AND a.position = ?';                         params.push(position); }
    if (search)     { query += ' AND (a.full_name LIKE ? OR a.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (location)   { query += ' AND j.location = ?';                         params.push(location); }
    if (department) { query += ' AND j.department = ?';                       params.push(department); }

    query += ' ORDER BY a.received_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// ── THÊM ROUTE NÀY VÀO FILE BACKEND (applications.js) ────────
// Đặt TRƯỚC route PUT /:id hiện tại để tránh conflict

// Trong file applications.js, thay route PUT /:id/info bằng đoạn này:
// Cần thêm bcrypt ở đầu file nếu chưa có:
// const bcrypt = require('bcrypt');

router.put('/:id/info', authMiddleware, upload.single('cv'), async (req, res) => {
  const { id } = req.params;
  const { full_name, email, phone, position, experience, address, cover_letter } = req.body;
  const cvFile = req.file;

  const errors = {};
  if (!full_name?.trim())  errors.full_name = 'Vui lòng nhập họ tên.';
  if (!email?.trim())      errors.email     = 'Vui lòng nhập email.';
  if (!phone?.trim())      errors.phone     = 'Vui lòng nhập số điện thoại.';
  if (!position?.trim())   errors.position  = 'Vui lòng nhập vị trí ứng tuyển.';
  if (Object.keys(errors).length) {
    if (cvFile) { try { fs.unlinkSync(cvFile.path); } catch {} }
    return res.status(400).json({ success: false, errors });
  }

  try {
    const [rows] = await pool.query('SELECT cv_link, email FROM applications WHERE id = ?', [id]);
    if (rows.length === 0) {
      if (cvFile) { try { fs.unlinkSync(cvFile.path); } catch {} }
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ.' });
    }

    let cvLink = rows[0].cv_link;
    const oldEmail = rows[0].email;
    const emailChanged = email.trim().toLowerCase() !== oldEmail?.trim().toLowerCase();

    if (cvFile) {
      try {
        cvLink = await uploadCV(cvFile.path, cvFile.originalname);
      } catch (err) {
        console.error('[UPLOAD CV ERROR]', err.message);
        return res.status(500).json({ success: false, message: 'Không thể upload CV mới. Vui lòng thử lại.' });
      } finally {
        try { fs.unlinkSync(cvFile.path); } catch {}
      }
    }

    await pool.query(
      `UPDATE applications
       SET full_name = ?, email = ?, phone = ?, position = ?,
           experience = ?, address = ?, cover_letter = ?, cv_link = ?
       WHERE id = ?`,
      [
        full_name.trim(),
        email.trim(),
        phone.trim(),
        position.trim(),
        experience?.trim()    || '',
        address?.trim()       || '',
        cover_letter?.trim()  || '',
        cvLink,
        id,
      ]
    );

    // ── Nếu email thay đổi → cập nhật password = hash(email mới) ──
    if (emailChanged) {
      const bcrypt = require('bcrypt');
      const newPassword = email.trim(); // password mới = email mới
      const hashed = await bcrypt.hash(newPassword, 10);
      await pool.query(
        'UPDATE applications SET password_hash = ? WHERE id = ?',
        [hashed, id]
      );
      console.log(`[PASSWORD RESET] application ${id}: password đổi theo email mới`);
    }

    res.json({
      success: true,
      cv_link: cvLink,
      password_reset: emailChanged, // frontend có thể dùng để thông báo
    });
  } catch (err) {
    console.error('[UPDATE INFO ERROR]', err.message);
    if (cvFile) { try { fs.unlinkSync(cvFile.path); } catch {} }
    res.status(500).json({ success: false, message: 'Lỗi cập nhật hồ sơ.' });
  }
});


// ── UPDATE ───────────────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { status, note } = req.body;
    await pool.query('UPDATE applications SET status = ?, note = ? WHERE id = ?', [status, note, req.params.id]);
    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE ───────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM applications WHERE id = ?', [req.params.id]);
    res.json({ message: 'Xóa hồ sơ thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ERROR HANDLER ─────────────────────────────────────────────  ← THÊM VÀO ĐÂY
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File quá lớn, vui lòng upload file dưới 10MB.' });
  }
  if (err.message) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

module.exports = router;