// Все расчёты приложения: норма, калории и белок, список покупок.
import { MEAL_SLOTS } from './menu.js';

// ---------- даты ----------
export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const today = () => ymd(new Date());
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
export const isoWeekday = (s) => { const w = parseYmd(s).getDay(); return w === 0 ? 7 : w; };
export const mondayOf = (s) => addDays(s, 1 - isoWeekday(s));
export const range = (start, n) => Array.from({ length: n }, (_, i) => addDays(start, i));

// ---------- норма ----------
export const ACTIVITY = [
  { id: 1, name: 'Сидячая работа, почти без тренировок', k: 1.2 },
  { id: 2, name: '2–3 тренировки в неделю', k: 1.375 },
  { id: 3, name: '4–5 тренировок или подвижная работа', k: 1.55 },
  { id: 4, name: 'Каждый день тяжёлая нагрузка', k: 1.725 },
];
export const GOALS = [
  { id: 'lose', name: 'Снизить жир, сохранить мышцы', k: 0.85, prot: [1.5, 1.7] },
  { id: 'keep', name: 'Держать вес', k: 1, prot: [1.2, 1.4] },
  { id: 'gain', name: 'Набрать мышцы', k: 1.1, prot: [1.6, 2.0] },
];

export function targets(p, currentWeight) {
  const w = currentWeight || p.startWeight;
  const h = p.height, a = p.age;
  const bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === 'f' ? -161 : 5);
  const act = (ACTIVITY.find((x) => x.id === Number(p.activity)) || ACTIVITY[1]).k;
  const goal = GOALS.find((g) => g.id === p.goal) || GOALS[0];
  const tdee = bmr * act;
  const auto = Math.round((tdee * goal.k) / 10) * 10;
  const kcal = p.kcalOverride ? Number(p.kcalOverride) : auto;
  const m = (h / 100) ** 2;
  const healthy = [Math.round(18.5 * m * 10) / 10, Math.round(24.9 * m * 10) / 10];
  const protW = Math.min(w, 27 * m); // при большом лишнем весе белок считаем от веса с ИМТ 27
  const autoProt = [Math.round(goal.prot[0] * protW / 5) * 5, Math.round(goal.prot[1] * protW / 5) * 5];
  const prot = p.proteinOverride ? [Number(p.proteinOverride), Number(p.proteinOverride)] : autoProt;
  const autoWater = [Math.round(w * 22 / 100) / 10, Math.round(w * 27 / 100) / 10];
  const water = p.waterOverride ? [Number(p.waterOverride), Number(p.waterOverride)] : autoWater;
  let targetWeight = Number(p.targetWeight) || 0;
  if (!targetWeight) {
    if (goal.id === 'lose') targetWeight = Math.round(Math.min(p.startWeight * 0.93, Math.max(healthy[1], p.startWeight * 0.85)) * 10) / 10;
    else if (goal.id === 'gain') targetWeight = p.startWeight + 3;
    else targetWeight = p.startWeight;
  }
  const bmi = Math.round((w / m) * 10) / 10;
  const pace = goal.id === 'lose' ? 0.6 : goal.id === 'gain' ? 0.25 : 0;
  const weeks = pace ? Math.max(0, Math.ceil(Math.abs(w - targetWeight) / pace)) : 0;
  return {
    bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, kcalRange: [kcal - 50, kcal + 50], autoKcal: auto,
    protein: prot, proteinMid: Math.round((prot[0] + prot[1]) / 2), water, waterMid: Math.round((water[0] + water[1]) * 5) / 10 * 1000 / 1000,
    healthy, bmi, targetWeight, pace, weeks, goal,
  };
}

// ---------- продукты и порции ----------
export const rawOf = (f, q, form) => (form === 'cooked' && f.yield ? q / f.yield : q);
export const gramsOf = (f, raw) => (f.unit === 'pcs' ? raw * (f.pieceG || 50) : raw);

// Количество для показа с учётом масштаба порций.
export function scaledQty(item, scale, db) {
  const f = item.f ? db.foods[item.f] : null;
  const q = item.q * scale;
  if (f && f.unit === 'pcs') return item.q >= 1 ? Math.max(1, Math.round(q)) : Math.round(q * 2) / 2;
  if (item.r && db.recipes[item.r] && db.recipes[item.r].unit === 'portion') return Math.round(q * 4) / 4;
  return scale === 1 ? q : Math.round(q / 5) * 5;
}

// Раскладка ингредиента в сырые продукты: [{ f, raw }]
export function expand(item, db, scale = 1) {
  const q = scaledQty(item, scale, db);
  if (item.r) {
    const r = db.recipes[item.r];
    if (!r) return [];
    const k = q / r.portion;
    return r.items.map((it) => ({ f: it.f, raw: it.q * k }));
  }
  const f = db.foods[item.f];
  if (!f) return [];
  return [{ f: item.f, raw: rawOf(f, q, item.form) }];
}

export function nutrOfRaw(list, db) {
  let kcal = 0, p = 0;
  for (const { f, raw } of list) {
    const food = db.foods[f];
    if (!food) continue;
    const g = gramsOf(food, raw);
    kcal += (g * food.kcal) / 100;
    p += (g * food.p) / 100;
  }
  return { kcal, p };
}

export const itemNutr = (item, db, scale) => nutrOfRaw(expand(item, db, scale), db);

export function mealNutr(meal, db, scale) {
  let kcal = 0, p = 0;
  for (const it of meal?.items || []) { const n = itemNutr(it, db, scale); kcal += n.kcal; p += n.p; }
  return { kcal: Math.round(kcal), p: Math.round(p) };
}

export function dayNutr(dayMenu, db, scale) {
  let kcal = 0, p = 0;
  for (const s of MEAL_SLOTS) { const n = mealNutr(dayMenu?.[s.id], db, scale); kcal += n.kcal; p += n.p; }
  return { kcal, p };
}

export function menuAvg(menu, db, scale = 1) {
  let k = 0, p = 0;
  for (let d = 1; d <= 7; d++) { const n = dayNutr(menu[d], db, scale); k += n.kcal; p += n.p; }
  return { kcal: Math.round(k / 7), p: Math.round(p / 7) };
}

// Масштаб порций под норму человека (1 = меню как есть).
// Автоматически порции только уменьшаются: увеличивать их без нужды не будем
// (белка в меню и так с запасом), увеличить можно вручную в настройках.
export function autoScale(menu, db, kcal) {
  const base = menuAvg(menu, db, 1).kcal || kcal;
  const s = Math.round((kcal / base) * 20) / 20;
  return Math.min(1, Math.max(0.6, s));
}

// Названия шагов рецепта для приёма пищи.
export function mealSteps(meal, db) {
  const steps = [];
  for (const it of meal?.items || []) {
    if (it.r) { const r = db.recipes[it.r]; if (r) steps.push(...r.steps.map((s) => `${r.name}: ${s}`)); continue; }
    const f = db.foods[it.f];
    if (f?.howto) steps.push(f.howto);
  }
  return [...new Set(steps)];
}

// ---------- закупка ----------
// Сырой вес, который нужно купить (с учётом очистки).
export const buyOf = (f, raw) => (f.waste ? raw / (1 - f.waste) : raw);

// Потребность по датам. Возвращает { items: { fid: { need, weeks: [] } }, dates, warnings }
export function shoppingNeeds(menu, db, dates, scale, removedMeals = {}) {
  const items = {};
  const warnings = new Set();
  dates.forEach((date, i) => {
    const wd = isoWeekday(date);
    const day = menu[wd] || {};
    const week = Math.floor(i / 7);
    for (const s of MEAL_SLOTS) {
      const meal = day[s.id];
      if (!meal || removedMeals[`${wd}${s.id}`]) continue;
      for (const it of meal.items) {
        if (it.r && !db.recipes[it.r]) { warnings.add(`Нет рецепта «${it.r}» — укажите состав`); continue; }
        if (it.f && !db.foods[it.f]) { warnings.add(`Нет продукта «${it.f}» в базе`); continue; }
        for (const { f, raw } of expand(it, db, scale)) {
          const food = db.foods[f];
          const need = buyOf(food, raw);
          const row = (items[f] ||= { need: 0, weeks: [] });
          row.need += need;
          row.weeks[week] = (row.weeks[week] || 0) + need;
        }
      }
    }
  });
  return { items, dates, warnings: [...warnings] };
}

export function periodDates(mode, start) {
  if (mode === 'day') return [start];
  if (mode === 'week') return range(start, 7);
  return range(start, 30);
}

// Округление количества к покупке
export function roundBuy(f, q) {
  if (f.unit === 'pcs') return Math.ceil(q - 1e-9);
  if (q < 100) return Math.ceil(q / 5) * 5;
  return Math.ceil(q / 10) * 10;
}

// Весовой товар (кг, л) — без упаковок, цена пропорционально весу
export const isLoose = (f) => Boolean(f.pack && ['кг', 'л'].includes(f.pack.label));

export function packsOf(f, q) {
  if (!f.pack || !f.pack.size || f.noCount || isLoose(f)) return null;
  return Math.ceil(q / f.pack.size - 1e-9);
}

export function fmtQty(f, q) {
  if (f.noCount) return 'по вкусу';
  if (f.unit === 'pcs') return `${Math.round(q * 10) / 10} шт`;
  if (f.unit === 'ml') return q >= 1000 ? `${fmtNum(q / 1000, 2)} л` : `${Math.round(q)} мл`;
  return q >= 1000 ? `${fmtNum(q / 1000, 2)} кг` : `${Math.round(q)} г`;
}

export const unitLabel = (f) => (f.unit === 'pcs' ? 'шт' : f.unit === 'ml' ? 'мл' : 'г');

export function fmtNum(n, digits = 1) {
  if (n == null || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
