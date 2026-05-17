const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
const hasRealDb = url && !url.includes('xxxx:PASSWORD');

let pool = null;

if (hasRealDb) {
  pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });

  pool.on('error', (err) => {
    console.error('Postgres pool error:', err);
  });
} else {
  console.warn('DATABASE_URL не настроен — БД отключена, API вернёт заглушки.');
}

module.exports = pool;
