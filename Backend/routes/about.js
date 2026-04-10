const express = require('express');
const router = express.Router();
const pool = require('../data/db');
const { authMiddleware } = require('./auth');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM about_dynamic ORDER BY id DESC LIMIT 1');
    if (rows.length === 0) {
      return res.json({}); 
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/', authMiddleware, async (req, res) => {
  try {
    const {
      stats, intro_heading, intro_heading_span, intro_text1, intro_text2, intro_text3,
      intro_pill, intro_image_url, vision_title, vision_points, mission_title,
      mission_text, mission_image_url
    } = req.body;

    const [existing] = await pool.query('SELECT id FROM about_dynamic LIMIT 1');
    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO about_dynamic 
        (stats, intro_heading, intro_heading_span, intro_text1, intro_text2, intro_text3,
         intro_pill, intro_image_url, vision_title, vision_points, mission_title,
         mission_text, mission_image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          JSON.stringify(stats), intro_heading, intro_heading_span, intro_text1, intro_text2, intro_text3,
          intro_pill, intro_image_url, vision_title, JSON.stringify(vision_points), mission_title,
          mission_text, mission_image_url
        ]
      );
    } else {
      await pool.query(
        `UPDATE about_dynamic SET
          stats=?, intro_heading=?, intro_heading_span=?, intro_text1=?, intro_text2=?, intro_text3=?,
          intro_pill=?, intro_image_url=?, vision_title=?, vision_points=?, mission_title=?,
          mission_text=?, mission_image_url=?
        WHERE id=?`,
        [
          JSON.stringify(stats), intro_heading, intro_heading_span, intro_text1, intro_text2, intro_text3,
          intro_pill, intro_image_url, vision_title, JSON.stringify(vision_points), mission_title,
          mission_text, mission_image_url, existing[0].id
        ]
      );
    }
    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;