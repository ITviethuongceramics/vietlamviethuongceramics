const bcrypt = require('bcryptjs');
const pool = require('./data/db');

async function reset() {
  const hash = await bcrypt.hash('admin123', 10);
  console.log('Hash mới:', hash);
  const [result] = await pool.query(
    'UPDATE admins SET password = ? WHERE username = ?',
    [hash, 'admin']
  );
  console.log('Rows affected:', result.affectedRows);
  process.exit();
}

reset().catch(e => { console.error(e.message); process.exit(); });