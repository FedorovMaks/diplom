window.GROUPS = (function () {
  const specs = { 'ИСП': { courses: [9, 11], max: { 9: 4, 11: 3 } }, 'Ю': { courses: [9, 11], max: { 9: 4, 11: 3 } }, 'Д': { courses: [9, 11], max: { 9: 4, 11: 3 } }, 'Р': { courses: [9, 11], max: { 9: 4, 11: 3 } }, 'Э': { courses: [9, 11], max: { 9: 4, 11: 3 } } };
  const out = [];
  for (const [code, info] of Object.entries(specs)) {
    for (const base of info.courses) {
      for (let i = 1; i <= info.max[base]; i++) out.push(`${code}-${base}-${i}`);
    }
  }
  return out;
})();

window.fillGroupSelect = function (selectEl) {
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— Выберите группу —';
  placeholder.disabled = true;
  placeholder.selected = true;
  selectEl.appendChild(placeholder);
  for (const g of window.GROUPS) {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    selectEl.appendChild(opt);
  }
};
