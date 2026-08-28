import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_URL = 'https://recruitment-viet-huong-4g9o.onrender.com/api/jobs';
const BASE = 'https://vieclam.viethuongceramics.com';
const OUT  = path.join(__dirname, '../public/sitemap.xml');

https.get(API_URL, res => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', () => {
    // Kiểm tra trước khi parse
    if (!raw.trim().startsWith('[') && !raw.trim().startsWith('{')) {
      console.warn('⚠️ API chưa sẵn sàng, giữ nguyên sitemap.xml cũ');
      console.warn('Response:', raw.substring(0, 100));
      process.exit(0); // không báo lỗi, vẫn chạy vite build
      return;
    }

    const jobs = JSON.parse(raw);
    const today = new Date().toISOString().split('T')[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE}/</loc><lastmod>${today}</lastmod><priority>1.0</priority><changefreq>weekly</changefreq></url>
  <url><loc>${BASE}/tuyen-dung</loc><lastmod>${today}</lastmod><priority>0.9</priority><changefreq>daily</changefreq></url>
  <url><loc>${BASE}/gioi-thieu</loc><lastmod>${today}</lastmod><priority>0.8</priority><changefreq>monthly</changefreq></url>
  <url><loc>${BASE}/lien-he</loc><lastmod>${today}</lastmod><priority>0.7</priority><changefreq>monthly</changefreq></url>
${jobs.map(job => `  <url>
    <loc>${BASE}/tuyen-dung/${job.id}</loc>
    <lastmod>${today}</lastmod>
    <priority>0.8</priority>
    <changefreq>weekly</changefreq>
  </url>`).join('\n')}
</urlset>`;

    fs.writeFileSync(OUT, xml, 'utf8');
    console.log(`✅ Sitemap: ${jobs.length} jobs → public/sitemap.xml`);
  });
}).on('error', err => {
  console.warn('⚠️ Không kết nối được API, giữ nguyên sitemap cũ:', err.message);
  process.exit(0);
});