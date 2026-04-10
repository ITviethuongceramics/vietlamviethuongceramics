const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const rssRoutes = require('./routes/rss');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const pool = require('./data/db');        // pool kết nối database
const jobRoutes = require('./routes/jobs');
const authRoutes = require('./routes/auth');
const careerRoutes = require('./routes/careers');
const applicationRoutes = require('./routes/applications');

const app = express();

// ─── Middleware CORS ──────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://recruitment-viet-huong-1.onrender.com',
    'https://vieclam.viethuongceramics.com',
    process.env.CLIENT_URL,
  ].filter(Boolean),
  credentials: true,
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ⭐️ QUAN TRỌNG: Middleware gắn pool vào req.db cho tất cả route ⭐️
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/branches', require('./routes/branches'));   // đã sửa trong câu trước
app.use('/api/jobs', jobRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/careers', careerRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/rss', rssRoutes);
app.use('/api/about', require('./routes/about'));

app.get('/', (req, res) => res.send('Việt Hương Ceramics API đang chạy'));

// ─── Middleware xử lý lỗi toàn cục (bắt lỗi từ các route) ──────
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ message: 'Lỗi server nội bộ', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// ─── Khởi tạo database và chạy server ─────────────────────────
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Thêm cột email_sent nếu chưa có
    try {
      await pool.query('ALTER TABLE applications ADD COLUMN email_sent TINYINT(1) DEFAULT 0');
    } catch (e) { /* cột đã tồn tại */ }

    // Thêm cột role cho bảng admins
    try {
      await pool.query("ALTER TABLE admins ADD COLUMN role VARCHAR(50) DEFAULT 'admin'");
    } catch (e) { /* cột đã tồn tại */ }

    await pool.query("UPDATE admins SET role = 'superadmin' WHERE username = 'admin'");

    // Tạo tài khoản admin mặc định nếu chưa có
    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', ['admin']);
    if (!rows.length) {
      const hash = await bcrypt.hash('admin123', 10);
      await pool.query("INSERT INTO admins (username, password, role) VALUES (?, ?, 'superadmin')", ['admin', hash]);
      console.log('✅ Admin created!');
    }
    
    // ⭐️ Tạo bảng branches nếu chưa tồn tại ⭐️
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

    console.log(' Database initialized!');
  } catch (err) {
    console.error(' DB init error:', err.message);
  }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
  initDB();
});