const fs = require('fs');
const path = require('path');
const express = require('express');
const { GROUPS } = require('../data/groups');

const router = express.Router();
const TEACHERS_PATH = path.join(__dirname, '..', 'data', 'teachers.json');

function loadTeachers() {
  const raw = fs.readFileSync(TEACHERS_PATH, 'utf8');
  return JSON.parse(raw);
}

router.get('/', (req, res) => {
  const group = String(req.query.group || '').trim();
  if (!GROUPS.includes(group)) {
    return res.status(400).json({ error: 'Неизвестная группа' });
  }
  const teachers = loadTeachers()
    .filter((t) => Array.isArray(t.groups) && t.groups.includes(group))
    .map((t) => ({ id: t.id, fio: t.fio }))
    .sort((a, b) => a.fio.localeCompare(b.fio, 'ru'));
  res.json(teachers);
});

module.exports = router;
