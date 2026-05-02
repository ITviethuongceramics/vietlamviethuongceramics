require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('BREVO_USER:', process.env.BREVO_USER);
console.log('BREVO_PASS:', process.env.BREVO_PASS?.substring(0, 20) + '...');
console.log('BREVO_FROM:', process.env.BREVO_FROM);

const transporter = nodemailer.createTransport({
  host:   'smtp-relay.brevo.com',
  port:   587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

transporter.verify((err, success) => {
  if (err) {
    console.log('❌ Lỗi:', err.message);
  } else {
    console.log('✅ Kết nối Brevo thành công!');
    // Thử gửi
    transporter.sendMail({
      from:    `"Test" <${process.env.BREVO_FROM}>`,
      to:      process.env.HR_MAIL,
      subject: 'Test Brevo',
      html:    '<p>Test email từ Brevo</p>',
    }, (err, info) => {
      if (err) console.log('❌ Gửi lỗi:', err.message);
      else console.log('✅ Gửi thành công:', info.messageId);
    });
  }
});