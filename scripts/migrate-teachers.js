// Одноразовая миграция: переносит преподавателей из data/teachers.json в таблицу teachers.
// Запуск: node scripts/migrate-teachers.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

(async () => {
  const file = path.join(__dirname, '..', 'data', 'teachers.json');
  const list = JSON.parse(fs.readFileSync(file, 'utf8'));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS teachers (
      id       serial PRIMARY KEY,
      fio      text NOT NULL,
      subjects jsonb NOT NULL DEFAULT '[]'::jsonb,
      groups   jsonb NOT NULL DEFAULT '[]'::jsonb
    );
  `);

  // Идемпотентно: upsert по id, без удаления существующих данных
  for (const t of list) {
    await pool.query(
      `INSERT INTO teachers (id, fio, subjects, groups) VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET fio = EXCLUDED.fio,
         subjects = EXCLUDED.subjects, groups = EXCLUDED.groups`,
      [t.id, t.fio, JSON.stringify(t.subjects || []), JSON.stringify(t.groups || [])]
    );
  }

  // Сдвигаем sequence, чтобы новые id шли после максимального
  await pool.query(
    `SELECT setval(pg_get_serial_sequence('teachers','id'), (SELECT COALESCE(MAX(id),0) FROM teachers))`
  );

  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM teachers');
  console.log('MIGRATED teachers:', rows[0].n);
  await pool.end();
})().catch((e) => { console.error('MIGRATION_ERROR', e.message); process.exit(1); });
