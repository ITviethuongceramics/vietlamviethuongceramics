const { google } = require('googleapis');
const fs = require('fs');
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

async function uploadCV(filePath, fileName) {
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type:   'image',
    folder:          'cv-viet-huong',
    use_filename:    true,
    unique_filename: true,
  });

  const viewableUrl = result.secure_url.replace(
    '/raw/upload/',
    '/raw/upload/fl_attachment:false/'
  );

  return viewableUrl;
}


function formatDateTime(isoString) {
  const d = new Date(isoString);
  const vnDate = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const year    = vnDate.getUTCFullYear();
  const month   = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
  const day     = String(vnDate.getUTCDate()).padStart(2, '0');
  const hours   = String(vnDate.getUTCHours()).padStart(2, '0');
  const minutes = String(vnDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(vnDate.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatMoney(num) {
  return new Intl.NumberFormat('vi-VN').format(num) + ' VNĐ';
}


async function appendToSheet(record) {
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId:    process.env.GOOGLE_SHEET_ID,
    range:            'Trang tính1!A:I',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        record.id,
        record.fullName,
        record.email,
        "'" + record.phone,
        record.position,
        record.experience || '',
        record.address    || '',
        record.cvFileName || 'Không có',
        formatDateTime(record.receivedAt),
      ]],
    },
  });
}


async function appendOfferToSheet({ fullName, email, offerPosition, startDate, salary, probationSalaryPercent, probationSalary }) {
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId:    process.env.GOOGLE_SHEET_ID,
    range:            'Trang tính2!A:G',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        fullName,
        email,
        offerPosition,
        startDate,
        formatMoney(salary),
        `${probationSalaryPercent}% = ${formatMoney(probationSalary)}`,
        new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      ]],
    },
  });

  console.log(`[SHEET OFFER] Đã ghi offer cho ${email} vào Trang tính2`);
}

module.exports = { uploadCV, appendToSheet, appendOfferToSheet };