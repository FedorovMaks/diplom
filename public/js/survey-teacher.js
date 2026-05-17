(function () {
  const RADIO_3 = [['1', 'Да'], ['2', 'Нет'], ['3', 'Затрудняюсь ответить']];

  const RADIO_QS = [
    { key: 'q1', text: '1. Нуждаетесь ли Вы в повышении квалификации?' },
    { key: 'q2', text: '2. Удовлетворены ли Вы состоянием аудиторного фонда Колледжа и компьютерными классами?' },
    { key: 'q3', text: '3. Удовлетворены ли Вы удобством доступа к информационным справочно-правовым системам и ЭИОС Колледжа?' },
    { key: 'q4', text: '4. Удовлетворены ли Вы техническим оборудованием аудиторий и возможностью использования технических средств для сопровождения занятий?' },
  ];

  const Q5_OPTIONS = [
    ['lit',      'Недостаток учебно-методической литературы'],
    ['tech',     'Слабая оснащённость современными техническими средствами'],
    ['rooms',    'Дефицит аудиторий'],
    ['choice',   'Отсутствие возможности выбора для студентов учебных дисциплин, преподавателей'],
    ['schedule', 'Неудобное расписание'],
    ['copy',     'Отсутствие возможности оперативного тиражирования раздаточных материалов'],
  ];

  function radioBlock(q) {
    const opts = RADIO_3.map(([v, l]) =>
      `<label><input type="radio" name="${q.key}" value="${v}" required><span>${l}</span></label>`
    ).join('');
    return `<div class="question"><div class="q-text">${q.text}</div><div class="options">${opts}</div></div>`;
  }
  function checkboxBlock() {
    const opts = Q5_OPTIONS.map(([v, l]) =>
      `<label><input type="checkbox" name="q5" value="${v}"><span>${l}</span></label>`
    ).join('');
    return `<div class="question"><div class="q-text">5. Какие проблемы учебного процесса требуют, по Вашему мнению, первоочередного решения? (можно выбрать несколько)</div><div class="options">${opts}</div></div>`;
  }
  function textBlock() {
    return `<div class="question">
      <div class="q-text">6. Ваши рекомендации по повышению качества образовательного процесса в Колледже</div>
      <textarea name="q6" maxlength="4000" placeholder="Напишите свободным текстом…"></textarea>
    </div>`;
  }

  document.getElementById('questions').innerHTML =
    RADIO_QS.map(radioBlock).join('') + checkboxBlock() + textBlock();

  const form = document.getElementById('form');
  const alertBox = document.getElementById('alertBox');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.innerHTML = '';
    const fd = new FormData(form);
    const answers = {};
    for (const q of RADIO_QS) {
      const v = fd.get(q.key);
      if (v == null) {
        alertBox.innerHTML = `<div class="alert alert-error">Ответьте на вопрос ${q.text}</div>`;
        return;
      }
      answers[q.key] = Number(v);
    }
    answers.q5_options = fd.getAll('q5');
    answers.q6_text = fd.get('q6') || '';

    const res = await fetch('/api/survey/teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    if (res.ok) {
      window.location.href = '/thanks.html';
    } else {
      const data = await res.json().catch(() => ({}));
      alertBox.innerHTML = `<div class="alert alert-error">${data.error || 'Ошибка отправки'}</div>`;
    }
  });
})();
