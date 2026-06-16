const express = require('express');
const { GROUPS } = require('../data/groups');
const pool = require('../db/pool');

const router = express.Router();

// Список преподавателей выбранной группы (для формы оценки ППС)
router.get('/', async (req, res, next) => {
  try {
    const group = String(req.query.group || '').trim();
    if (!GROUPS.includes(group)) {
      return res.status(400).json({ error: 'Неизвестная группа' });
    }
    if (!pool) return res.status(503).json({ error: 'БД не подключена' });
    const { rows } = await pool.query(
      'SELECT id, fio FROM teachers WHERE groups @> $1::jsonb',
      [JSON.stringify([group])]
    );
    rows.sort((a, b) => a.fio.localeCompare(b.fio, 'ru'));
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
