const mysql = require('mysql2/promise');

const host = process.env.DB_HOST || 'localhost';
const isAiven = host.includes('aivencloud.com');

const pool = mysql.createPool({
  host: host,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'viet_huong_recruitment',
  ssl: (isAiven || process.env.NODE_ENV === 'production') ? { rejectUnauthorized: false } : false,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
