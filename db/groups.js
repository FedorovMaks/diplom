const pool = require('./pool');

// Специальности из БД в виде объекта { code: { name, courses, maxParallel } }
async function getSpecialties() {
  if (!pool) return {};
  const { rows } = await pool.query(
    'SELECT code, name, courses, max_parallel FROM specialties ORDER BY code'
  );
  const out = {};
  for (const r of rows) {
    out[r.code] = { name: r.name, courses: r.courses, maxParallel: r.max_parallel };
  }
  return out;
}

// Плоский список групп: ["ИСП-9-1", "ИСП-9-2", ...]
async function listGroups() {
  const specs = await getSpecialties();
  const out = [];
  for (const [code, info] of Object.entries(specs)) {
    for (const base of info.courses || []) {
      const n = Number(info.maxParallel && info.maxParallel[base]) || 0;
      for (let i = 1; i <= n; i++) out.push(`${code}-${base}-${i}`);
    }
  }
  return out;
}

async function isValidGroup(group) {
  const list = await listGroups();
  return list.includes(group);
}

module.exports = { getSpecialties, listGroups, isValidGroup };
