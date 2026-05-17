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
  window.fillGroupSelect(groupSelect);

  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const loadBtn = document.getElementById('loadTeachersBtn');
  const teachersEl = document.getElementById('teachers');
  const alertBox = document.getElementById('alertBox');

  let teachers = [];

  function teacherBlock(t) {
    const rows = CHARACTERISTICS.map((label, i) => {
      const cKey = `c${i + 1}`;
      const fieldName = `t${t.id}__${cKey}`;
      const scaleItems = [];
      for (let v = 1; v <= 5; v++) {
        scaleItems.push(`<label><input type="radio" name="${fieldName}" value="${v}" required><span class="scale-num">${v}</span></label>`);
      }
      return `<div class="question"><div class="q-text">${i + 1}. ${label}</div><div class="scale">${scaleItems.join('')}</div></div>`;
    }).join('');
    return `<section class="teacher-block">
      <h3>${t.fio}</h3>
      <div class="teacher-sub">Оцените все 12 характеристик</div>
      ${rows}
    </section>`;
  }

  loadBtn.addEventListener('click', async () => {
    if (!groupSelect.value) { alert('Выберите группу'); return; }
    loadBtn.disabled = true;
    loadBtn.textContent = 'Загрузка…';
    try {
      const res = await fetch('/api/teachers?group=' + encodeURIComponent(groupSelect.value));
      teachers = await res.json();
      if (!Array.isArray(teachers) || teachers.length === 0) {
        alert('Для выбранной группы не найдено преподавателей.');
        loadBtn.disabled = false;
        loadBtn.textContent = 'Перейти к опросу';
        return;
      }
      teachersEl.innerHTML = teachers.map(teacherBlock).join('');
      step1.classList.add('hidden');
      step2.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      alert('Не удалось загрузить список преподавателей.');
      loadBtn.disabled = false;
      loadBtn.textContent = 'Перейти к опросу';
    }
  });

  step2.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.innerHTML = '';
    const fd = new FormData(step2);
    const evaluations = [];
    for (const t of teachers) {
      const scores = {};
      for (let i = 1; i <= 12; i++) {
        const v = fd.get(`t${t.id}__c${i}`);
        if (v == null) {
          alertBox.innerHTML = `<div class="alert alert-error">Оцените все характеристики у преподавателя «${t.fio}» (пропущена № ${i}).</div>`;
          return;
        }
        scores[`c${i}`] = Number(v);
      }
      evaluations.push({ teacher_id: t.id, scores });
    }
    const res = await fetch('/api/survey/pps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group: groupSelect.value, evaluations }),
    });
    if (res.ok) {
      window.location.href = '/thanks.html';
    } else {
      const data = await res.json().catch(() => ({}));
      alertBox.innerHTML = `<div class="alert alert-error">${data.error || 'Ошибка отправки'}</div>`;
    }
  });
})();
