window.GROUPS = (function () {
  const map = { 'ИСП': [9, 11], 'Ю': [9, 11], 'Д': [9, 11], 'Р': [9, 11], 'Э': [9, 11] };
  const counts = { 9: 4, 11: 3 };
  const out = [];
  for (const [code, bases] of Object.entries(map)) {
    for (const base of bases) {
      for (let i = 1; i <= counts[base]; i++) out.push(`${code}-${base}-${i}`);
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
