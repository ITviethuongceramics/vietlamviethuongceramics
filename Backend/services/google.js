const { google } = require('googleapis');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

let credentials;
try {
  credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
} catch (err) {
  console.error('[GOOGLE] Lỗi parse credentials:', err.message);
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// ─── Upload CV lên Cloudinary ───────────────────────────────────────────────
async function uploadCV(filePath, fileName) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type:   'auto',        // ✅ auto để nhận PDF/DOC/ảnh
      folder:          'cv-viet-huong',
      use_filename:    true,
      unique_filename: true,
    });
    return result.secure_url;
  } catch (err) {
    console.error('[CLOUDINARY ERROR]', err.message);
    throw err;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDateTime(isoString) {
  const d     = new Date(isoString);
  const vnDate = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const year   = vnDate.getUTCFullYear();
  const month  = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
  const day    = String(vnDate.getUTCDate()).padStart(2, '0');
  const hours  = String(vnDate.getUTCHours()).padStart(2, '0');
  const mins   = String(vnDate.getUTCMinutes()).padStart(2, '0');
  const secs   = String(vnDate.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
}

function formatMoney(num) {
  return new Intl.NumberFormat('vi-VN').format(num) + ' VNĐ';
}

// ─── Ghi hồ sơ ứng tuyển vào Trang tính1 ───────────────────────────────────
async function appendToSheet(record) {
  try {
    const client = await auth.getClient();                       
    const sheets = google.sheets({ version: 'v4', auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId:    process.env.GOOGLE_SHEET_ID,
      range:            'HoSo!A1',                         // ✅ chỉ định rõ ô bắt đầu
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          record.id,
          record.fullName,
          record.email,
          "'" + record.phone,
          record.position,
          record.experience  || '',
          record.address     || '',
          record.cvFileName  || 'Không có',
          formatDateTime(record.receivedAt),
        ]],
      },
    });

    console.log('[SHEET] Ghi hồ sơ thành công:', record.email);
  } catch (err) {
    console.error('[SHEET ERROR] appendToSheet:', err.message);
    throw err;
  }
}

// Thêm probationPeriod vào destructure
async function appendOfferToSheet({ fullName, email, offerPosition, startDate, salary, probationSalaryPercent, probationSalary, probationPeriod }) {
  try {
    const client = await auth.getClient();                        // ✅ resolve auth
    const sheets = google.sheets({ version: 'v4', auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId:    process.env.GOOGLE_SHEET_ID,
      range:            'OfferLetter!A1',                         // ✅ chỉ định rõ ô bắt đầu
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          fullName,
          email,
          offerPosition,
          startDate,
          formatMoney(salary),
          `${probationSalaryPercent}% = ${formatMoney(probationSalary)}`,
          `${probationPeriod} tháng`, 
          new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        ]],
      },
    });

    console.log('[SHEET OFFER] Ghi offer thành công:', email);
  } catch (err) {
    console.error('[SHEET ERROR] appendOfferToSheet:', err.message);
    throw err;
  }
}

module.exports = { uploadCV, appendToSheet, appendOfferToSheet };