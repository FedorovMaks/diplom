// Список групп загружается с сервера (/api/groups), источник — таблица specialties в БД.
window.GROUPS = [];

window.fillGroupSelect = async function (selectEl) {
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— Выберите группу —';
  placeholder.disabled = true;
  placeholder.selected = true;
  selectEl.appendChild(placeholder);

  try {
    const res = await fetch('/api/groups');
    const groups = await res.json();
    window.GROUPS = Array.isArray(groups) ? groups : [];
    for (const g of window.GROUPS) {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      selectEl.appendChild(opt);
    }
  } catch (e) {
    console.error('Не удалось загрузить список групп', e);
    placeholder.textContent = '— Ошибка загрузки групп —';
  }
};
