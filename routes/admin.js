const crypto = require('crypto');
const express = require('express');
const ExcelJS = require('exceljs');
const pool = require('../db/pool');
const { getSpecialties } = require('../db/groups');

// Преподаватели и специальности хранятся в БД. Файлы больше не используются.

const router = express.Router();

const SESSION_COOKIE = 'admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 часов

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET слишком короткий');
  return s;
}
function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  return `${data}.${mac}`;
}
function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const [data, mac] = token.split('.');
  if (!data || !mac) return null;
  const expected = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')); }
  catch { return null; }
  if (!payload || typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
  return payload;
}

function requireAdmin(req, res, next) {
  const session = verify(req.cookies[SESSION_COOKIE]);
  if (!session) return res.status(401).json({ error: 'Требуется вход' });
  req.admin = session;
  next();
}

router.post('/login', (req, res) => {
  const { login, password } = req.body || {};
  const okLogin = String(login || '') === String(process.env.ADMIN_LOGIN || '');
  const okPass  = String(password || '') === String(process.env.ADMIN_PASSWORD || '');
  if (!okLogin || !okPass) return res.status(401).json({ error: 'Неверный логин или пароль' });

  const token = sign({ login: process.env.ADMIN_LOGIN, exp: Date.now() + SESSION_TTL_MS });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const s = verify(req.cookies[SESSION_COOKIE]);
  res.json({ authenticated: !!s, login: s?.login || null });
});

// ---------- ВЫГРУЗКИ ----------

const RADIO_3 = { 1: 'Да', 2: 'Нет', 3: 'Затрудняюсь ответить' };
const RADIO_3_SOOTV = { 1: 'Соответствует', 2: 'Не соответствует', 3: 'Затрудняюсь ответить' };
const RADIO_3_SAT = { 1: 'Удовлетворен', 2: 'Не удовлетворен', 3: 'Затрудняюсь ответить' };
const SCALE_4 = { 1: '1 — Постоянно', 2: '2', 3: '3', 4: '4 — Никогда' };
const SCALE_5 = {
  1: '1 — Полностью не согласен',
  2: '2 — Скорее не согласен',
  3: '3 — Отчасти согласен, отчасти нет',
  4: '4 — Скорее согласен',
  5: '5 — Полностью согласен',
};

const TEACHER_Q5_LABELS = {
  lit:      'Недостаток учебно-методической литературы',
  tech:     'Слабая оснащённость современными техническими средствами',
  rooms:    'Дефицит аудиторий',
  choice:   'Отсутствие возможности выбора дисциплин/преподавателей',
  schedule: 'Неудобное расписание',
  copy:     'Отсутствие возможности оперативного тиражирования материалов',
};

const GENERAL_QUESTIONS = [
  ['q1',  'Интересно ли Вам получать образование в Колледже?',                                  RADIO_3],
  ['q2',  'Соответствует ли выбранная специальность Вашим ожиданиям?',                          RADIO_3_SOOTV],
  ['q3',  'Как часто Вам предоставляется возможность участия в активных формах занятий?',       SCALE_4],
  ['q4',  'Собираетесь ли Вы после обучения работать по выбранной специальности?',              RADIO_3],
  ['q5',  'Насколько Вы удовлетворены производственной практикой?',                             RADIO_3_SAT],
  ['q6',  'Позволяет ли практика получить навыки для будущего трудоустройства? (выпускники)',   RADIO_3],
  ['q7_1','7.1. Удовлетворены знаниями: общий гуманитарный и социально-экономический блок',     RADIO_3_SAT],
  ['q7_2','7.2. Удовлетворены знаниями: математический и общий естественно-научный блок',       RADIO_3_SAT],
  ['q7_3','7.3. Удовлетворены знаниями: профессиональный блок дисциплин',                       RADIO_3_SAT],
  ['q8_1','8.1. Удовлетворены: учебно-методические материалы по дисциплинам',                   RADIO_3_SAT],
  ['q8_2','8.2. Удовлетворены: преподавательский состав',                                       RADIO_3_SAT],
  ['q8_3','8.3. Удовлетворены: компьютеризация',                                                RADIO_3_SAT],
  ['q8_4','8.4. Удовлетворены: состояние аудиторий, спортивных залов и сооружений',             RADIO_3_SAT],
  ['q8_5','8.5. Удовлетворены: оснащённость материально-техническим оборудованием',             RADIO_3_SAT],
  ['q8_6','8.6. Удовлетворены: организация учебного процесса',                                  RADIO_3_SAT],
  ['q8_7','8.7. Удовлетворены: возможность участия в конференциях',                             RADIO_3_SAT],
  ['q9',  'Нравится ли участвовать в воспитательных мероприятиях Колледжа?',                    RADIO_3],
  ['q10', 'Как часто используете ресурсы электронной информационно-образовательной среды?',     SCALE_4],
];

const PPS_CHARACTERISTICS = [
  'Лекции преподавателя информативны, не содержат «воды»',
  'Преподаватель свободно отвечает на вопросы студентов по теме занятия',
  'Преподаватель обычно зачитывает конспект лекций («читает по бумажке»)',
  'Преподаватель объясняет значение предмета для будущей профессии, приводит примеры из практики',
  'Преподаватель излагает материал логично и доступно, организует интересные дискуссии',
  'Преподаватель интересуется, какие вопросы вызывают у студентов затруднения',
  'Преподаватель комментирует результаты контрольных, проверочных, тестов; контролирует ДЗ',
  'Преподаватель точно соблюдает учебное расписание (вовремя начинает/заканчивает, делает перерыв)',
  'Преподаватель повышает голос, проявляет неуважение к студентам',
  'Преподаватель заинтересовывает излагаемым материалом',
  'Преподаватель обозначает систему требований и чётко её соблюдает, объективен в оценках',
  'Преподаватель располагает к себе манерой поведения, внешним видом и культурой речи',
];

const TEACHER_QUESTIONS_1_4 = [
  ['q1', 'Нуждаетесь ли Вы в повышении квалификации?',                                                           RADIO_3],
  ['q2', 'Удовлетворены ли Вы состоянием аудиторного фонда Колледжа и компьютерными классами?',                  RADIO_3],
  ['q3', 'Удовлетворены ли Вы удобством доступа к информационным справочно-правовым системам и ЭИОС Колледжа?',  RADIO_3],
  ['q4', 'Удовлетворены ли Вы техническим оборудованием аудиторий и возможностью использования технических средств?', RADIO_3],
];

function decode(map, value) {
  if (value === null || value === undefined) return '';
  return map[value] ?? value;
}

async function streamWorkbook(res, filename, build) {
  const wb = new ExcelJS.Workbook();
  await build(wb);
  res.setHeader('Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition',
    `attachment; filename="${encodeURIComponent(filename)}"`);
  await wb.xlsx.write(res);
  res.end();
}

router.get('/export/general.xlsx', requireAdmin, async (_req, res, next) => {
  try {
    if (!pool) return res.status(503).json({ error: 'БД не подключена' });
    const { rows } = await pool.query(
      `SELECT * FROM general_student_survey ORDER BY id`
    );
    await streamWorkbook(res, 'ОбщийОпросСтудентов.xlsx', async (wb) => {
      const ws = wb.addWorksheet('Общий опрос студентов');
      ws.columns = [
        { header: '#', key: 'id', width: 6 },
        { header: 'Группа', key: 'group_name', width: 14 },
        ...GENERAL_QUESTIONS.map(([k, label]) => ({ header: label, key: k, width: 40 })),
        { header: 'Дата', key: 'submitted_at', width: 22 },
      ];
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).alignment = { wrapText: true, vertical: 'middle' };
      for (const r of rows) {
        const row = { id: r.id, group_name: r.group_name, submitted_at: r.submitted_at };
        for (const [k, , map] of GENERAL_QUESTIONS) row[k] = decode(map, r[k]);
        ws.addRow(row);
      }
    });
  } catch (e) { next(e); }
});

router.get('/export/pps.xlsx', requireAdmin, async (_req, res, next) => {
  try {
    if (!pool) return res.status(503).json({ error: 'БД не подключена' });
    const { rows } = await pool.query(
      `SELECT * FROM pps_evaluation ORDER BY id`
    );
    await streamWorkbook(res, 'ОценкаППС.xlsx', async (wb) => {
      const ws = wb.addWorksheet('Оценка ППС');
      ws.columns = [
        { header: '#', key: 'id', width: 6 },
        { header: 'Группа', key: 'group_name', width: 14 },
        { header: 'ФИО преподавателя', key: 'teacher_fio', width: 38 },
        ...PPS_CHARACTERISTICS.map((label, i) => ({
          header: `${i + 1}. ${label}`, key: `c${i + 1}`, width: 32,
        })),
        { header: 'Дата', key: 'submitted_at', width: 22 },
      ];
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).alignment = { wrapText: true, vertical: 'middle' };
      for (const r of rows) {
        const row = {
          id: r.id, group_name: r.group_name,
          teacher_fio: r.teacher_fio,
          submitted_at: r.submitted_at,
        };
        for (let i = 1; i <= 12; i++) row[`c${i}`] = decode(SCALE_5, r[`c${i}`]);
        ws.addRow(row);
      }
    });
  } catch (e) { next(e); }
});

router.get('/export/teacher.xlsx', requireAdmin, async (_req, res, next) => {
  try {
    if (!pool) return res.status(503).json({ error: 'БД не подключена' });
    const { rows } = await pool.query(
      `SELECT * FROM teacher_survey ORDER BY id`
    );
    await streamWorkbook(res, 'ОпросПреподавателей.xlsx', async (wb) => {
      const ws = wb.addWorksheet('Опрос преподавателей');
      ws.columns = [
        { header: '#', key: 'id', width: 6 },
        ...TEACHER_QUESTIONS_1_4.map(([k, label]) => ({ header: label, key: k, width: 40 })),
        { header: '5. Какие проблемы требуют первоочередного решения?', key: 'q5_options', width: 60 },
        { header: '6. Рекомендации по повышению качества образовательного процесса', key: 'q6_text', width: 60 },
        { header: 'Дата', key: 'submitted_at', width: 22 },
      ];
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).alignment = { wrapText: true, vertical: 'middle' };
      for (const r of rows) {
        const row = {
          id: r.id,
          q5_options: (r.q5_options || []).map((c) => TEACHER_Q5_LABELS[c] || c).join('; '),
          q6_text: r.q6_text || '',
          submitted_at: r.submitted_at,
        };
        for (const [k, , map] of TEACHER_QUESTIONS_1_4) row[k] = decode(map, r[k]);
        ws.addRow(row);
      }
    });
  } catch (e) { next(e); }
});

// ---------- ОЧИСТКА ТАБЛИЦ ----------

// Белый список: ключ из запроса -> реальное имя таблицы (защита от SQL-инъекций)
const CLEARABLE_TABLES = {
  general: 'general_student_survey',
  pps: 'pps_evaluation',
  teacher: 'teacher_survey',
};

router.post('/clear/:key', requireAdmin, async (req, res, next) => {
  try {
    const table = CLEARABLE_TABLES[req.params.key];
    if (!table) return res.status(400).json({ error: 'Неизвестная таблица' });
    if (!pool) return res.status(503).json({ error: 'БД не подключена' });
    const result = await pool.query(`DELETE FROM ${table}`);
    res.json({ ok: true, deleted: result.rowCount });
  } catch (e) { next(e); }
});

// ---------- УПРАВЛЕНИЕ ПРЕПОДАВАТЕЛЯМИ ----------

router.get('/teachers', requireAdmin, async (_req, res, next) => {
  try {
    if (!pool) return res.status(503).json({ error: 'БД не подключена' });
    const { rows } = await pool.query(
      'SELECT id, fio, subjects, groups FROM teachers ORDER BY id'
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/teachers', requireAdmin, async (req, res, next) => {
  try {
    if (!pool) return res.status(503).json({ error: 'БД не подключена' });
    const { fio, subjects, groups } = req.body || {};
    if (!fio || typeof fio !== 'string' || !fio.trim()) {
      return res.status(400).json({ error: 'ФИО обязательно' });
    }
    const { rows } = await pool.query(
      `INSERT INTO teachers (fio, subjects, groups) VALUES ($1, $2, $3)
       RETURNING id, fio, subjects, groups`,
      [
        fio.trim(),
        JSON.stringify(Array.isArray(subjects) ? subjects : []),
        JSON.stringify(Array.isArray(groups) ? groups : []),
      ]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.put('/teachers/:id', requireAdmin, async (req, res, next) => {
  try {
    if (!pool) return res.status(503).json({ error: 'БД не подключена' });
    const id = Number(req.params.id);
    const { fio, subjects, groups } = req.body || {};
    const sets = [];
    const vals = [];
    let i = 1;
    if (fio) { sets.push(`fio = $${i++}`); vals.push(String(fio).trim()); }
    if (Array.isArray(subjects)) { sets.push(`subjects = $${i++}`); vals.push(JSON.stringify(subjects)); }
    if (Array.isArray(groups)) { sets.push(`groups = $${i++}`); vals.push(JSON.stringify(groups)); }
    if (!sets.length) return res.status(400).json({ error: 'Нечего обновлять' });
    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE teachers SET ${sets.join(', ')} WHERE id = $${i}
       RETURNING id, fio, subjects, groups`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найден' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.delete('/teachers/:id', requireAdmin, async (req, res, next) => {
  try {
    if (!pool) return res.status(503).json({ error: 'БД не подключена' });
    const id = Number(req.params.id);
    const { rowCount } = await pool.query('DELETE FROM teachers WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Не найден' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------- УПРАВЛЕНИЕ ГРУППАМИ (специальностями) ----------
// Хранятся в БД (таблица specialties). Файлы больше не используются.

router.get('/groups', requireAdmin, async (_req, res, next) => {
  try {
    if (!pool) return res.status(503).json({ error: 'БД не подключена' });
    res.json(await getSpecialties());
  } catch (e) { next(e); }
});

router.post('/groups', requireAdmin, async (req, res, next) => {
  try {
    if (!pool) return res.status(503).json({ error: 'БД не подключена' });
    const { code, name, courses, maxParallel } = req.body || {};
    if (!code || !name) return res.status(400).json({ error: 'Код и название обязательны' });
    await pool.query(
      `INSERT INTO specialties (code, name, courses, max_parallel) VALUES ($1,$2,$3,$4)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name,
         courses = EXCLUDED.courses, max_parallel = EXCLUDED.max_parallel`,
      [
        String(code).trim(),
        String(name).trim(),
        JSON.stringify(Array.isArray(courses) ? courses : [9, 11]),
        JSON.stringify(maxParallel || { 9: 4, 11: 3 }),
      ]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/groups/:code', requireAdmin, async (req, res, next) => {
  try {
    if (!pool) return res.status(503).json({ error: 'БД не подключена' });
    const { rowCount } = await pool.query('DELETE FROM specialties WHERE code = $1', [req.params.code]);
    if (!rowCount) return res.status(404).json({ error: 'Не найдено' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
