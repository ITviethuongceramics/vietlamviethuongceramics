  const express = require('express');
  const cors = require('cors');
  const path = require('path');
  const bcrypt = require('bcryptjs');
  const rssRoutes = require('./routes/rss');
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
const imagesRoutes = require('./routes/images');
  const app = express();
app.use((req, res, next) => {
  req.db = pool;
  next();
});
  app.use(cors({
    origin: [
      'http://localhost:5173',
      'https://recruitment-viet-huong-1.onrender.com',
      process.env.CLIENT_URL,
    ].filter(Boolean),
    credentials: true,
  }));
  

  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.use('/api/jobs',         express.json(), jobRoutes);
  app.use('/api/auth',         express.json(), authRoutes);
  app.use('/api/careers',      express.json(), careerRoutes);
  app.use('/api/applications', express.json(), applicationRoutes);
  app.use('/api/rss',          express.json(), rssRoutes);

  // Routes dùng multipart/FormData → KHÔNG dùng express.json()
  app.use('/api/branches', branchRoutes); // ← thêm
  app.use('/api/about', aboutRoutes);
app.use('/api/images', imagesRoutes);
  app.get('/', (req, res) => res.send('Viet Huong Ceramics API đang chạy'));

  async function initDB() {
    try {
    

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
    mission_title VARCHAR(255) DEFAULT '',
    mission_text TEXT,
    mission_image_url TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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

      try {
        await pool.query('ALTER TABLE applications ADD COLUMN email_sent TINYINT(1) DEFAULT 0');
      } catch (e) { /* column đã tồn tại */ }

      // Tạo bảng branches nếu chưa có
      await pool.query(`CREATE TABLE IF NOT EXISTS branches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        email VARCHAR(255),
        phone VARCHAR(50),
        lat VARCHAR(50),
        lng VARCHAR(50),
        image_url TEXT,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      // Tạo bảng about_dynamic nếu chưa có
      await pool.query(`CREATE TABLE IF NOT EXISTS about_dynamic (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stats JSON,
        intro_eyebrow VARCHAR(255),
        intro_heading VARCHAR(255),
        intro_heading_span VARCHAR(255),
        intro_text1 TEXT,
        intro_text2 TEXT,
        intro_text3 TEXT,
        intro_pill VARCHAR(255),
        intro_image_url TEXT,
        vision_title VARCHAR(255),
        vision_points JSON,
        mission_title VARCHAR(255),
        mission_text TEXT,
        mission_image_url TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`);

      const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', ['admin']);
      if (!rows.length) {
        const hash = await bcrypt.hash('admin123', 10);
        await pool.query('INSERT INTO admins (username, password) VALUES (?, ?)', ['admin', hash]);
        console.log('Admin created!');
      }

      console.log('DB initialized!');
    } catch (err) {
      console.error('DB init error:', err.message);
    }
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server chạy tại http://localhost:${PORT}`);
    initDB();
  });