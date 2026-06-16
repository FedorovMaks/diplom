// Одноразовая миграция: переносит специальности из data/groups.js в таблицу specialties.
// Запуск: node scripts/migrate-groups.js
require('dotenv').config();
const { SPECIALTIES } = require('../data/groups');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS specialties (
      code         text PRIMARY KEY,
      name         text NOT NULL,
      courses      jsonb NOT NULL DEFAULT '[]'::jsonb,
      max_parallel jsonb NOT NULL DEFAULT '{}'::jsonb
    );
  `);

  // Идемпотентно: upsert по code, без удаления
  for (const [code, info] of Object.entries(SPECIALTIES)) {
    await pool.query(
      `INSERT INTO specialties (code, name, courses, max_parallel) VALUES ($1,$2,$3,$4)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name,
         courses = EXCLUDED.courses, max_parallel = EXCLUDED.max_parallel`,
      [code, info.name, JSON.stringify(info.courses), JSON.stringify(info.maxParallel)]
    );
  }

  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM specialties');
  console.log('MIGRATED specialties:', rows[0].n);
  await pool.end();
})().catch((e) => { console.error('MIGRATION_ERROR', e.message); process.exit(1); });
