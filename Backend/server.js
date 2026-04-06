const express = require('express');
const cors = require('cors');
const path = require('path');
const applicationRoutes = require('./routes/applications');
const rssRoutes = require('./routes/rss');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// ── Import routes ────────────────────────────────────────────
const jobRoutes    = require('./routes/jobs');
const authRoutes   = require('./routes/auth');
const careerRoutes = require('./routes/careers');

const app = express();

// ── Middleware ───────────────────────────────────────────────
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

// ── Routes ───────────────────────────────────────────────────
app.use('/api/jobs',         jobRoutes);
app.use('/api/auth',         authRoutes);
app.use('/api/careers',      careerRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/rss',          rssRoutes);

app.get('/', (req, res) => res.send('Việt Hương Ceramics API đang chạy'));

// ── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});