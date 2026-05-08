function nfc(str) {
  if (!str) return str;
  return String(str).normalize('NFC');
}

function normalizeLogoUrl(url) {
  if (!url) return '';
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  return url;
}
const LOGO_URL = normalizeLogoUrl(process.env.LOGO_URL);

const RED = '#C0392B';
const DARK = '#2c1a0e';

function candidateEmailHtml({ fullName, position, experience, phone, address, cvFile }) {
  fullName = nfc(fullName);
  position = nfc(position);
  experience = nfc(experience);
  phone = nfc(phone);
  address = nfc(address);

  const rows = [
    { label: 'V&#7883; tr&#237;', value: `<strong>${position}</strong>` },
    { label: 'Kinh nghi&#7879;m', value: experience || '&mdash;' },
    { label: '&#272;i&#7879;n tho&#7841;i', value: phone },
    { label: '&#272;&#7883;a ch&#7881;', value: address || '&mdash;' },
    {
      label: 'CV &#273;&#237;nh k&#232;m',
      value: cvFile
        ? `<span style="color:#27ae60;">&#10003; ${nfc(cvFile.originalname)}</span>`
        : `<span style="color:#bbb;">Kh&#244;ng c&#243;</span>`,
    },
  ];

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

  <tr>
    <td style="background:${RED};border-radius:14px 14px 0 0;padding:36px 40px;text-align:center;">
      ${LOGO_URL ? `<img src="${LOGO_URL}" alt="Viet Huong Ceramics" width="80" height="80" style="border-radius:50%;border:3px solid rgba(255,255,255,0.35);object-fit:cover;display:block;margin:0 auto 14px;" />` : ''}
      <h1 style="margin:0;color:#fff;font-size:20px;letter-spacing:3px;font-weight:normal;text-transform:uppercase;">
        Vi&#7879;t H&#432;&#417;ng Ceramics
      </h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:11px;letter-spacing:3px;text-transform:uppercase;">
        X&#225;c nh&#7853;n &#7913;ng tuy&#7875;n
      </p>
    </td>
  </tr>

  <tr>
    <td style="background:#ffffff;padding:40px 40px 32px;">
      <p style="margin:0 0 4px;font-size:11px;color:#aaa;letter-spacing:2px;text-transform:uppercase;">K&#237;nh g&#7917;i</p>
      <h2 style="margin:0 0 22px;font-size:22px;color:${DARK};font-weight:bold;">${fullName}</h2>
      <p style="margin:0 0 26px;font-size:15px;color:#555;line-height:1.85;">
        H&#7891; s&#417; &#7913;ng tuy&#7875;n c&#7911;a b&#7841;n &#273;&#227; &#273;&#432;&#7907;c
        <strong style="color:${RED};">Vi&#7879;t H&#432;&#417;ng Ceramics</strong>
        ghi nh&#7853;n th&#224;nh c&#244;ng. B&#7897; ph&#7853;n nh&#226;n s&#7921; s&#7869; xem x&#233;t v&#224;
        li&#234;n h&#7879; l&#7841;i trong
        <strong style="color:${DARK};">3&ndash;5 ng&#224;y l&#224;m vi&#7879;c</strong>
        n&#7871;u h&#7891; s&#417; ph&#249; h&#7907;p.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf5f4;border:1px solid #f0d5d2;border-radius:10px;margin-bottom:28px;">
        <tr>
          <td style="padding:18px 22px 10px;">
            <p style="margin:0 0 14px;font-size:10px;color:${RED};letter-spacing:2px;text-transform:uppercase;font-weight:bold;">
              Th&#244;ng tin &#273;&#227; &#273;&#259;ng k&#253;
            </p>
          </td>
        </tr>
        ${rows.map(r => `
        <tr>
          <td style="padding:0 22px 13px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="140" style="font-size:12px;color:#aaa;">${r.label}</td>
                <td style="font-size:13px;color:#333;">${r.value}</td>
              </tr>
            </table>
          </td>
        </tr>`).join('')}
        <tr><td style="padding:4px 0;"></td></tr>
      </table>

     <p style="margin:0;font-size:13px;color:#888;line-height:1.8;">
  Truy c&#7853;p v&#224;o trang website:
  <a href="https://vieclam.viethuongceramics.com" style="color:${RED};text-decoration:none;font-weight:bold;">vieclam.viethuongceramics.com</a>
</p>
    </td>
  </tr>

  <tr>
    <td style="background:#fdf5f4;border-top:1px solid #f0d5d2;padding:22px 40px;border-radius:0 0 14px 14px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0;font-size:13px;color:#aaa;">Tr&#226;n tr&#7885;ng,</p>
            <p style="margin:3px 0 0;font-size:14px;color:${DARK};font-weight:bold;">B&#7897; ph&#7853;n Nh&#226;n s&#7921;</p>
            <p style="margin:2px 0 0;font-size:13px;color:${RED};">Vi&#7879;t H&#432;&#417;ng Ceramics</p>
          </td>
          <td align="right" valign="bottom">
            <p style="margin:0;font-size:11px;color:#ccc;">${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
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

function hrEmailHtml({ fullName, email, phone, position, experience, address, coverLetter, cvFile }) {
  fullName = nfc(fullName);
  position = nfc(position);
  experience = nfc(experience);
  phone = nfc(phone);
  address = nfc(address);
  coverLetter = nfc(coverLetter);
  email = nfc(email);

  const rows = [
    { label: 'H&#7885; t&#234;n', value: `<strong style="color:${DARK};">${fullName}</strong>` },
    { label: 'Email', value: `<a href="mailto:${email}" style="color:${RED};text-decoration:none;">${email}</a>` },
    { label: '&#272;i&#7879;n tho&#7841;i', value: phone },
    { label: 'V&#7883; tr&#237;', value: `<strong style="color:${RED};">${position}</strong>` },
    { label: 'Kinh nghi&#7879;m', value: experience || '&mdash;' },
    { label: '&#272;&#7883;a ch&#7881;', value: address || '&mdash;' },
  ];

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body style="margin:0;padding:0;background:#1a1a1a;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;padding:40px 0;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

  <tr>
    <td style="background:#2c1a0e;border-radius:14px 14px 0 0;padding:26px 34px;border-bottom:3px solid ${RED};">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0;font-size:10px;color:${RED};letter-spacing:2px;text-transform:uppercase;">H&#7891; s&#417; &#7913;ng tuy&#7875;n m&#7899;i</p>
            <h2 style="margin:6px 0 2px;font-size:20px;color:#fff;">${fullName}</h2>
            <p style="margin:0;font-size:13px;color:${RED};">${position}</p>
          </td>
          <td align="right" valign="top">
            <span style="background:${RED};color:#fff;padding:5px 14px;border-radius:20px;font-size:11px;letter-spacing:1px;text-transform:uppercase;">M&#7899;i</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="background:#fff;padding:30px 34px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${rows.map((r, i) => `
        <tr style="${i > 0 ? 'border-top:1px solid #f5ecea;' : ''}">
          <td width="130" style="padding:12px 0;font-size:12px;color:#aaa;vertical-align:top;">${r.label}</td>
          <td style="padding:12px 0;font-size:13px;color:#333;">${r.value}</td>
        </tr>`).join('')}
        ${coverLetter ? `
        <tr style="border-top:1px solid #f5ecea;">
          <td width="130" style="padding:12px 0;font-size:12px;color:#aaa;vertical-align:top;">Th&#432; gi&#7899;i thi&#7879;u</td>
          <td style="padding:12px 0;font-size:13px;color:#333;line-height:1.75;">${coverLetter}</td>
        </tr>` : ''}
        <tr style="border-top:1px solid #f5ecea;">
          <td width="130" style="padding:12px 0;font-size:12px;color:#aaa;vertical-align:top;">CV &#273;&#237;nh k&#232;m</td>
          <td style="padding:12px 0;">
            ${cvFile
      ? `<span style="background:#edf7ed;color:#27ae60;padding:3px 10px;border-radius:20px;font-size:12px;">&#10003; ${nfc(cvFile.originalname)}</span>`
      : `<span style="color:#bbb;font-size:12px;">Kh&#244;ng c&#243;</span>`}
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="background:#fdf5f4;border-top:1px solid #f0d5d2;padding:18px 34px;border-radius:0 0 14px 14px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#bbb;">
        Nh&#7853;n l&#250;c: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
        &nbsp;&middot;&nbsp;
        H&#7879; th&#7889;ng tuy&#7875;n d&#7909;ng Vi&#7879;t H&#432;&#417;ng Ceramics
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

module.exports = { candidateEmailHtml, hrEmailHtml };