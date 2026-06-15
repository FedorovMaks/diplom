const SPECIALTIES = {
  'ИСП': { name: 'Информационные системы и программирование', courses: [9, 11], maxParallel: { 9: 4, 11: 3 } },
  'Ю': { name: 'Право и судебное администрирование', courses: [9, 11], maxParallel: { 9: 4, 11: 3 } },
  'Д': { name: 'Дизайн (по отраслям)', courses: [9, 11], maxParallel: { 9: 4, 11: 3 } },
  'Р': { name: 'Реклама', courses: [9, 11], maxParallel: { 9: 4, 11: 3 } },
  'Э': { name: 'Экономика и бухгалтерский учёт', courses: [9, 11], maxParallel: { 9: 4, 11: 3 } },
};

const GROUPS = [];
for (const [code, info] of Object.entries(SPECIALTIES)) {
  for (const base of info.courses) {
    const n = info.maxParallel[base];
    for (let i = 1; i <= n; i++) GROUPS.push(`${code}-${base}-${i}`);
  }
}

module.exports = { SPECIALTIES, GROUPS };
