const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const pool = require('./data/db');
const jobRoutes = require('./routes/jobs');
const authRoutes = require('./routes/auth');
const careerRoutes = require('./routes/careers');
const applicationRoutes = require('./routes/applications');

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://recruitment-viet-huong-1.onrender.com',
    process.env.CLIENT_URL,
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/jobs', jobRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/careers', careerRoutes);
app.use('/api/applications', applicationRoutes);

app.get('/', (req, res) => res.send('Việt Hương Ceramics API đang chạy'));

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

    // THÊM ĐOẠN NÀY
    try {
      await pool.query('ALTER TABLE applications ADD COLUMN email_sent TINYINT(1) DEFAULT 0');
    } catch (e) { /* column đã tồn tại */ }

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