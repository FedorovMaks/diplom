(function () {
  const CHARACTERISTICS = [
    'Лекции преподавателя информативны, не содержат «воды»',
    'Преподаватель свободно отвечает на вопросы студентов по теме занятия',
    'Преподаватель обычно зачитывает конспект лекций («читает по бумажке», ограничивается текстом учебника)',
    'Преподаватель объясняет значение данного предмета для будущей профессии, приводит примеры из реальной практики профессиональной деятельности',
    'Преподаватель излагает материал в логичной и доступной для понимания форме, умеет организовать интересную дискуссию по теме занятия',
    'Преподаватель обычно интересуется, какие вопросы вызывают у студентов затруднения',
    'Преподаватель обычно комментирует результаты контрольных, проверочных работ, тестов, контролирует выполнение домашних заданий',
    'Преподаватель обычно точно соблюдает учебное расписание (вовремя начинает и заканчивает занятие, делает перерыв)',
    'Преподаватель повышает голос, проявляет неуважение к студентам',
    'Преподаватель заинтересовывает излагаемым материалом',
    'Преподаватель обозначает свою систему требований и чётко её соблюдает, объективен при выставлении оценок',
    'Преподаватель располагает к себе манерой поведения, внешним видом и культурой речи',
  ];

  const groupSelect = document.getElementById('group');
  const teacherSelect = document.getElementById('teacherSelect');
  const surveyForm = document.getElementById('surveyForm');
  const teacherForm = document.getElementById('teacherForm');
  const evaluatedList = document.getElementById('evaluatedList');
  const alertBox = document.getElementById('alertBox');

  window.fillGroupSelect(groupSelect);

  let teachers = [];
  let evaluatedIds = new Set();

  // При смене группы — загрузить преподавателей
  groupSelect.addEventListener('change', async () => {
    teacherSelect.innerHTML = '<option value="">— Загрузка… —</option>';
    teacherSelect.disabled = true;
    surveyForm.classList.add('hidden');
    evaluatedIds.clear();
    updateEvaluatedList();
    teachers = [];

    if (!groupSelect.value) {
      teacherSelect.innerHTML = '<option value="">— Сначала выберите группу —</option>';
      return;
    }

    try {
      const res = await fetch('/api/teachers?group=' + encodeURIComponent(groupSelect.value));
      teachers = await res.json();
      if (!Array.isArray(teachers) || teachers.length === 0) {
        teacherSelect.innerHTML = '<option value="">— Преподаватели не найдены —</option>';
        return;
      }
      fillTeacherOptions();
      teacherSelect.disabled = false;
    } catch (e) {
      teacherSelect.innerHTML = '<option value="">— Ошибка загрузки —</option>';
    }
  });

  function fillTeacherOptions() {
    teacherSelect.innerHTML = '<option value="">— Выберите преподавателя —</option>';
    teachers.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.fio;
      if (evaluatedIds.has(t.id)) {
        opt.disabled = true;
        opt.textContent += ' ✔';
      }
      teacherSelect.appendChild(opt);
    });
  }

  // При выборе преподавателя — показать форму
  teacherSelect.addEventListener('change', () => {
    const tid = teacherSelect.value;
    if (!tid) {
      surveyForm.classList.add('hidden');
      return;
    }
    const teacher = teachers.find(t => String(t.id) === String(tid));
    if (!teacher) return;

    renderForm(teacher);
    surveyForm.classList.remove('hidden');
    alertBox.innerHTML = '';
    window.scrollTo({ top: surveyForm.offsetTop - 20, behavior: 'smooth' });
  });

  function renderForm(t) {
    const rows = CHARACTERISTICS.map((label, i) => {
      const scaleItems = [];
      for (let v = 1; v <= 5; v++) {
        scaleItems.push(`<label><input type="radio" name="c${i + 1}" value="${v}" required><span class="scale-num">${v}</span></label>`);
      }
      return `<div class="question"><div class="q-text">${i + 1}. ${label}</div><div class="scale">${scaleItems.join('')}</div></div>`;
    }).join('');

    teacherForm.innerHTML = `
      <section class="teacher-block">
        <h3>${t.fio}</h3>
        <div class="teacher-sub">Оцените все 12 характеристик</div>
        ${rows}
      </section>`;
  }

  function updateEvaluatedList() {
    if (evaluatedIds.size === 0) {
      evaluatedList.innerHTML = '';
      return;
    }
    const items = teachers
      .filter(t => evaluatedIds.has(t.id))
      .map(t => `<span style="display:inline-block;background:#e8f5e9;color:#2e7d32;padding:4px 12px;border-radius:16px;margin:4px 4px 4px 0;font-size:14px;">&#10003; ${t.fio}</span>`)
      .join('');
    evaluatedList.innerHTML = `<div><b>Оценены:</b><div style="margin-top:4px">${items}</div></div>`;

    if (evaluatedIds.size === teachers.length) {
      evaluatedList.innerHTML += `
        <div style="margin-top:16px;padding:16px;background:#e8f5e9;border-radius:8px;text-align:center;">
          <b>Все преподаватели оценены!</b>
          <div style="margin-top:8px"><a href="/thanks.html" class="btn">Завершить</a></div>
        </div>`;
    }
  }

  // Отправка оценки
  surveyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.innerHTML = '';

    const tid = Number(teacherSelect.value);
    const teacher = teachers.find(t => t.id === tid);
    if (!teacher) return;

    const fd = new FormData(surveyForm);
    const scores = {};
    for (let i = 1; i <= 12; i++) {
      const v = fd.get(`c${i}`);
      if (v == null) {
        alertBox.innerHTML = `<div class="alert alert-error">Оцените характеристику № ${i}.</div>`;
        return;
      }
      scores[`c${i}`] = Number(v);
    }

    const submitBtn = surveyForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка…';

    try {
      const res = await fetch('/api/survey/pps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group: groupSelect.value,
          evaluations: [{ teacher_id: teacher.id, scores }],
        }),
      });

      if (res.ok) {
        evaluatedIds.add(teacher.id);
        fillTeacherOptions();
        updateEvaluatedList();
        teacherSelect.value = '';
        surveyForm.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (evaluatedIds.size === teachers.length) {
          window.location.href = '/thanks.html';
        }
      } else {
        const data = await res.json().catch(() => ({}));
        alertBox.innerHTML = `<div class="alert alert-error">${data.error || 'Ошибка отправки'}</div>`;
      }
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-error">Ошибка сети</div>`;
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Отправить оценку';
  });
})();
