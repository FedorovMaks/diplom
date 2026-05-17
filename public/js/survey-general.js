(function () {
  const RADIO_3_DEFAULT      = [['1', 'Да'], ['2', 'Нет'], ['3', 'Затрудняюсь ответить']];
  const RADIO_3_SOOTV        = [['1', 'Соответствует'], ['2', 'Не соответствует'], ['3', 'Затрудняюсь ответить']];
  const RADIO_3_SAT          = [['1', 'Удовлетворен'], ['2', 'Не удовлетворен'], ['3', 'Затрудняюсь ответить']];
  const SCALE_4_FREQ = {
    min: 1, max: 4,
    captionMin: 'Постоянно', captionMax: 'Никогда',
  };

  const QUESTIONS = [
    { key: 'q1',  text: '1. Интересно ли Вам получать образование в Колледже?',                                     type: 'radio', options: RADIO_3_DEFAULT },
    { key: 'q2',  text: '2. Соответствует ли выбранная специальность Вашим ожиданиям?',                             type: 'radio', options: RADIO_3_SOOTV },
    { key: 'q3',  text: '3. Как часто Вам предоставляется возможность участия в занятиях в активных формах (дискуссии, «круглые столы», тренинги, лекции-беседы, «мозговой штурм» и пр.)?', type: 'scale', scale: SCALE_4_FREQ },
    { key: 'q4',  text: '4. Собираетесь ли Вы после завершения обучения работать по выбранной Вами специальности?', type: 'radio', options: RADIO_3_DEFAULT },
    { key: 'q5',  text: '5. Насколько Вы удовлетворены проводимой в Колледже производственной практикой (сроки, длительность, базы практики)?', type: 'radio', options: RADIO_3_SAT },
    { key: 'q6',  text: '6. Позволяет ли практика получить навыки, необходимые для будущего трудоустройства? (для студентов выпускных курсов)', type: 'radio', options: RADIO_3_DEFAULT },

    { sectionTitle: '7. Удовлетворены ли Вы полученными знаниями по следующим блокам дисциплин?' },
    { key: 'q7_1', text: '7.1. Общий гуманитарный и социально-экономический блок', type: 'radio', options: RADIO_3_SAT },
    { key: 'q7_2', text: '7.2. Математический и общий естественно-научный блок',   type: 'radio', options: RADIO_3_SAT },
    { key: 'q7_3', text: '7.3. Профессиональный блок дисциплин',                    type: 'radio', options: RADIO_3_SAT },

    { sectionTitle: '8. Удовлетворены ли Вы перечисленными ниже сторонами Вашей жизни в Колледже?' },
    { key: 'q8_1', text: '8.1. Учебно-методические материалы по дисциплинам',          type: 'radio', options: RADIO_3_SAT },
    { key: 'q8_2', text: '8.2. Преподавательский состав',                              type: 'radio', options: RADIO_3_SAT },
    { key: 'q8_3', text: '8.3. Компьютеризация',                                       type: 'radio', options: RADIO_3_SAT },
    { key: 'q8_4', text: '8.4. Состояние аудиторий, спортивных залов и сооружений',    type: 'radio', options: RADIO_3_SAT },
    { key: 'q8_5', text: '8.5. Оснащённость материально-техническим оборудованием',    type: 'radio', options: RADIO_3_SAT },
    { key: 'q8_6', text: '8.6. Организация учебного процесса',                         type: 'radio', options: RADIO_3_SAT },
    { key: 'q8_7', text: '8.7. Возможность участия в конференциях',                    type: 'radio', options: RADIO_3_SAT },

    { key: 'q9',  text: '9. Нравится ли Вам принимать участие в воспитательных мероприятиях Колледжа (клубы, флеш-мобы, квесты, праздничные мероприятия и др.)?', type: 'radio', options: RADIO_3_DEFAULT },
    { key: 'q10', text: '10. Как часто Вы используете ресурсы электронной информационно-образовательной среды Колледжа (psi.thinkery.ru) для самоорганизации учебной деятельности?', type: 'scale', scale: SCALE_4_FREQ },
  ];

  const groupSelect = document.getElementById('group');
  window.fillGroupSelect(groupSelect);

  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const startBtn = document.getElementById('startBtn');
  const questionsEl = document.getElementById('questions');
  const alertBox = document.getElementById('alertBox');

  function renderRadio(q) {
    const opts = q.options.map(([v, label]) =>
      `<label><input type="radio" name="${q.key}" value="${v}" required><span>${label}</span></label>`
    ).join('');
    return `<div class="question"><div class="q-text">${q.text}</div><div class="options">${opts}</div></div>`;
  }
  function renderScale(q) {
    const { min, max, captionMin, captionMax } = q.scale;
    const items = [];
    for (let v = min; v <= max; v++) {
      const cap = v === min ? captionMin : v === max ? captionMax : '';
      items.push(`<label><input type="radio" name="${q.key}" value="${v}" required><span class="scale-num">${v}</span><span class="scale-cap">${cap}</span></label>`);
    }
    return `<div class="question"><div class="q-text">${q.text}</div><div class="scale">${items.join('')}</div></div>`;
  }

  startBtn.addEventListener('click', () => {
    if (!groupSelect.value) { alert('Выберите группу'); return; }
    questionsEl.innerHTML = QUESTIONS.map((q) => {
      if (q.sectionTitle) return `<h2>${q.sectionTitle}</h2>`;
      return q.type === 'scale' ? renderScale(q) : renderRadio(q);
    }).join('');
    step1.classList.add('hidden');
    step2.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  step2.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.innerHTML = '';
    const fd = new FormData(step2);
    const answers = {};
    for (const q of QUESTIONS) {
      if (!q.key) continue;
      const v = fd.get(q.key);
      if (v == null) {
        alertBox.innerHTML = `<div class="alert alert-error">Ответьте на все вопросы (пропущен: ${q.text})</div>`;
        return;
      }
      answers[q.key] = Number(v);
    }
    const res = await fetch('/api/survey/general', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group: groupSelect.value, answers }),
    });
    if (res.ok) {
      window.location.href = '/thanks.html';
    } else {
      const data = await res.json().catch(() => ({}));
      alertBox.innerHTML = `<div class="alert alert-error">${data.error || 'Ошибка отправки'}</div>`;
    }
  });
})();
