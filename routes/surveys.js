const express = require('express');
const pool = require('../db/pool');
const { isValidGroup } = require('../db/groups');

const router = express.Router();

const TEACHER_Q5_CODES = ['lit', 'tech', 'rooms', 'choice', 'schedule', 'copy'];

function intInRange(v, min, max) {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

// POST /api/survey/general
router.post('/general', async (req, res, next) => {
  try {
    const { group, answers } = req.body || {};
    if (!(await isValidGroup(group))) return res.status(400).json({ error: 'Неизвестная группа' });
    if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'Нет ответов' });

    const radio3 = ['q1', 'q2', 'q4', 'q5', 'q6', 'q7_1', 'q7_2', 'q7_3',
                    'q8_1', 'q8_2', 'q8_3', 'q8_4', 'q8_5', 'q8_6', 'q8_7', 'q9'];
    const scale4 = ['q3', 'q10'];
    const cleaned = {};
    for (const k of radio3) {
      const v = intInRange(answers[k], 1, 3);
      if (v === null) return res.status(400).json({ error: `Некорректный ответ: ${k}` });
      cleaned[k] = v;
    }
    for (const k of scale4) {
      const v = intInRange(answers[k], 1, 4);
      if (v === null) return res.status(400).json({ error: `Некорректный ответ: ${k}` });
      cleaned[k] = v;
    }

    if (!pool) return res.json({ ok: true, demo: true });

    const cols = ['group_name', ...radio3, ...scale4];
    const params = [group, ...radio3.map((k) => cleaned[k]), ...scale4.map((k) => cleaned[k])];
    const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');

    await pool.query(
      `INSERT INTO general_student_survey (${cols.join(', ')}) VALUES (${placeholders})`,
      params
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /api/survey/pps
router.post('/pps', async (req, res, next) => {
  let client;
  try {
  const { group, evaluations } = req.body || {};
  if (!(await isValidGroup(group))) return res.status(400).json({ error: 'Неизвестная группа' });
  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return res.status(400).json({ error: 'Нет оценок преподавателей' });
  }

  if (!pool) return res.json({ ok: true, demo: true, count: evaluations.length });

  const { rows: teacherRows } = await pool.query('SELECT id, fio, groups FROM teachers');
  const byId = new Map(teacherRows.map((t) => [t.id, t]));

  const rows = [];
  for (const ev of evaluations) {
    const t = byId.get(Number(ev.teacher_id));
    if (!t) return res.status(400).json({ error: `Неизвестный преподаватель: ${ev.teacher_id}` });
    if (!Array.isArray(t.groups) || !t.groups.includes(group)) {
      return res.status(400).json({ error: `Преподаватель ${t.fio} не ведёт у группы ${group}` });
    }
    const scores = ev.scores || {};
    const c = [];
    for (let i = 1; i <= 12; i++) {
      const v = intInRange(scores[`c${i}`], 1, 5);
      if (v === null) return res.status(400).json({ error: `Некорректная оценка c${i} у ${t.fio}` });
      c.push(v);
    }
    rows.push([group, t.id, t.fio, ...c]);
  }

  client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const row of rows) {
      const placeholders = row.map((_, i) => `$${i + 1}`).join(', ');
      await client.query(
        `INSERT INTO pps_evaluation
           (group_name, teacher_id, teacher_fio,
            c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12)
         VALUES (${placeholders})`,
        row
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true, count: rows.length });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
  } catch (e) { next(e); }
});

// POST /api/survey/teacher
router.post('/teacher', async (req, res, next) => {
  try {
    const { answers } = req.body || {};
    if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'Нет ответов' });
    const radio = {};
    for (const k of ['q1', 'q2', 'q3', 'q4']) {
      const v = intInRange(answers[k], 1, 3);
      if (v === null) return res.status(400).json({ error: `Некорректный ответ: ${k}` });
      radio[k] = v;
    }
    let q5 = answers.q5_options;
    if (!Array.isArray(q5)) q5 = [];
    q5 = q5.map(String).filter((c) => TEACHER_Q5_CODES.includes(c));

    let q6 = answers.q6_text;
    if (q6 == null) q6 = '';
    q6 = String(q6).slice(0, 4000);

    if (!pool) return res.json({ ok: true, demo: true });

    await pool.query(
      `INSERT INTO teacher_survey (q1, q2, q3, q4, q5_options, q6_text)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [radio.q1, radio.q2, radio.q3, radio.q4, q5, q6]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
