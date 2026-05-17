require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('Schema applied.');
  } catch (e) {
    console.error('Schema apply failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
