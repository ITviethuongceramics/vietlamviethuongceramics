
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');


if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const pool = require('./data/db');
const jobRoutes         = require('./routes/jobs');
const authRoutes        = require('./routes/auth');
const careerRoutes      = require('./routes/careers');
const applicationRoutes = require('./routes/applications');
const branchRoutes      = require('./routes/branches');
const aboutRoutes       = require('./routes/about');
const imagesRoutes      = require('./routes/images');
const testsRouter = require('./routes/tests');
const gradingRouter = require('./routes/grading');

let rssRoutes;
try { rssRoutes = require('./routes/rss'); } catch (e) { rssRoutes = null; }

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://recruitment-viet-huong-1.onrender.com',
    'https://vieclam.viethuongceramics.com',
    process.env.CLIENT_URL,
  ].filter(Boolean),
  credentials: true,
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Gắn pool vào req.db
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Routes JSON
app.use('/api/jobs',         express.json(), jobRoutes);
app.use('/api/auth',         express.json(), authRoutes);
app.use('/api/careers',      express.json(), careerRoutes);
app.use('/api/applications', express.json(), applicationRoutes);
if (rssRoutes) app.use('/api/rss', express.json(), rssRoutes);

// Routes FormData (không dùng express.json())
app.use('/api/branches', branchRoutes);
app.use('/api/about',    aboutRoutes);
app.use('/api/images',   imagesRoutes);
app.use('/api/tests', express.json(), testsRouter);
app.use('/api/candidate', express.json(), require('./routes/candidate'));
app.use('/api/grading', gradingRouter);
app.get('/sitemap.xml', async (req, res) => {
  try {
    const [jobs] = await pool.query(
      'SELECT id, created_at FROM jobs WHERE status = "active" OR status IS NULL'
    );

    const staticUrls = [
      { loc: '/',           priority: '1.0', changefreq: 'weekly'  },
      { loc: '/tuyen-dung', priority: '0.9', changefreq: 'daily'   },
      { loc: '/gioi-thieu', priority: '0.8', changefreq: 'monthly' },
      { loc: '/lien-he',    priority: '0.7', changefreq: 'monthly' },
    ];

    const base = 'https://vieclam.viethuongceramics.com';
    const today = new Date().toISOString().split('T')[0];

    const staticXml = staticUrls.map(u => `
  <url>
    <loc>${base}${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <priority>${u.priority}</priority>
    <changefreq>${u.changefreq}</changefreq>
  </url>`).join('');

    const jobXml = jobs.map(job => `
  <url>
    <loc>${base}/tuyen-dung/${job.id}</loc>
    <lastmod>${job.created_at
      ? new Date(job.created_at).toISOString().split('T')[0]
      : today}</lastmod>
    <priority>0.8</priority>
    <changefreq>weekly</changefreq>
  </url>`).join('');

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
${jobXml}
</urlset>`);

  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('Sitemap generation failed');
  }
});
app.get('/', (req, res) => res.send('Việt Hương Ceramics API đang chạy'));

app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ message: 'Lỗi server nội bộ' });
});

async function initDB() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS jobs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      department VARCHAR(100),
      location VARCHAR(100),
      type VARCHAR(50),
      experience VARCHAR(100),
      salary VARCHAR(100),
      description TEXT,
      requirements TEXT,
      benefits TEXT,
      deadline DATE,
      status ENUM('active','inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS applications (
      id BIGINT PRIMARY KEY,
      full_name VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      position VARCHAR(255),
      experience VARCHAR(100),
      address VARCHAR(255),
      cv_link TEXT,
      cover_letter TEXT,
      status ENUM('pending','passed','failed') DEFAULT 'pending',
      note TEXT,
      received_at DATETIME,
      email_sent TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS branches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address TEXT,
      email VARCHAR(255),
      phone VARCHAR(50),
      lat DECIMAL(10,8),
      lng DECIMAL(11,8),
      image_url TEXT,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS about_dynamic (
      id INT AUTO_INCREMENT PRIMARY KEY,
      stats JSON,
      intro_eyebrow VARCHAR(255) DEFAULT '',
      intro_heading VARCHAR(255) DEFAULT '',
      intro_heading_span VARCHAR(255) DEFAULT '',
      intro_text1 TEXT,
      intro_text2 TEXT,
      intro_text3 TEXT,
      intro_pill VARCHAR(255) DEFAULT '',
      intro_image_url TEXT,
      vision_title VARCHAR(255) DEFAULT '',
      vision_points JSON,
      vision_image_url TEXT,
      mission_title VARCHAR(255) DEFAULT '',
      mission_text TEXT,
      mission_image_url TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);

    // Thêm cột nếu chưa có
    const alterCols = [
      "ALTER TABLE admins ADD COLUMN role VARCHAR(50) DEFAULT 'admin'",
      "ALTER TABLE applications ADD COLUMN email_sent TINYINT(1) DEFAULT 0",
      "ALTER TABLE about_dynamic ADD COLUMN vision_image_url TEXT",
      "ALTER TABLE about_dynamic ADD COLUMN intro_eyebrow VARCHAR(255) DEFAULT ''",
    ];
    for (const sql of alterCols) {
      try { await pool.query(sql); } catch (e) { /* đã tồn tại */ }
    }

    await pool.query("UPDATE admins SET role = 'superadmin' WHERE username = 'admin'");

    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', ['admin']);
    if (!rows.length) {
      const hash = await bcrypt.hash('admin123', 10);
      await pool.query("INSERT INTO admins (username, password, role) VALUES (?, ?, 'superadmin')", ['admin', hash]);
      console.log('✅ Admin created!');
    }

    console.log('✅ Database initialized!');
  } catch (err) {
    console.error('❌ DB init error:', err.message);
  }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  initDB();
});