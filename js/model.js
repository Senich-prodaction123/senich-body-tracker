// Связка данных: профиль, меню, дни, замеры, тренировки — и всё, что из них считается.
import * as store from './store.js';
import { FOODS, RECIPES } from './foods.js';
import { BASE_MENU, MEAL_SLOTS } from './menu.js';
import * as c from './calc.js';

export const HABITS = [
  { id: 'water', name: 'Выпил достаточно воды' },
  { id: 'schedule', name: 'Соблюдал режим питания' },
  { id: 'noOvereat', name: 'Не переедал вечером' },
  { id: 'activity', name: 'Тренировка или активность' },
  { id: 'sleep', name: 'Соблюдал режим сна' },
  { id: 'noSkip', name: 'Не пропускал основные приёмы пищи' },
];

export const WORKOUT_TYPES = [
  { id: 'box', name: 'Бокс' },
  { id: 'strength', name: 'Силовая' },
  { id: 'cardio', name: 'Кардио' },
  { id: 'walk', name: 'Ходьба' },
  { id: 'rest', name: 'Отдых' },
];
export const INTENSITY = ['Низкая', 'Средняя', 'Высокая'];
export const MOODS = ['', 'Плохо', 'Так себе', 'Нормально', 'Хорошо', 'Отлично'];

export const MEAS_FIELDS = [
  { id: 'weight', name: 'Вес утром натощак', unit: 'кг' },
  { id: 'waist', name: 'Талия (на уровне пупка)', unit: 'см' },
  { id: 'belly', name: 'Живот (самая широкая часть)', unit: 'см' },
  { id: 'chest', name: 'Грудь', unit: 'см' },
  { id: 'hips', name: 'Бёдра (ягодицы)', unit: 'см' },
  { id: 'thighR', name: 'Правое бедро', unit: 'см' },
  { id: 'thighL', name: 'Левое бедро', unit: 'см' },
  { id: 'armR', name: 'Правая рука', unit: 'см' },
  { id: 'armL', name: 'Левая рука', unit: 'см' },
];
export const CHECKPOINTS = [0, 7, 14, 21, 30];

export const DEFAULT_PROFILE = {
  name: '', sex: 'm', age: 38, height: 186, startWeight: 92, activity: 2, goal: 'lose',
  startDate: c.today(), programDays: 30, targetWeight: '', menuScale: '', kcalOverride: '', proteinOverride: '', waterOverride: '',
};

export const profile = () => store.get('profile', 'main');
export const hasProfile = () => Boolean(profile()?.confirmed);

export function db() {
  const foods = { ...FOODS };
  for (const f of store.all('foods')) foods[f.id] = { ...(FOODS[f.id] || {}), ...f };
  const recipes = { ...RECIPES };
  for (const r of store.all('recipes')) recipes[r.id] = { ...(RECIPES[r.id] || {}), ...r };
  return { foods, recipes };
}

export const menu = () => store.get('menu', 'main')?.days || BASE_MENU;
export const menuEdited = () => Boolean(store.get('menu', 'main'));
export const setMenu = (days) => store.put('menu', 'main', { days });

export function weights() {
  const out = {};
  for (const m of store.all('meas')) if (m.weight) out[m.date] = m.weight;
  for (const d of store.all('days')) if (d.weight) out[d.id] = d.weight;
  return Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, w]) => ({ date, w: Number(w) }));
}

export function currentWeight() {
  const w = weights();
  return w.length ? w[w.length - 1].w : profile()?.startWeight;
}

export const T = () => c.targets(profile() || DEFAULT_PROFILE, currentWeight());

export function scale() {
  const p = profile() || {};
  if (p.menuScale) return Number(p.menuScale);
  return c.autoScale(menu(), db(), T().kcal);
}

export const startDate = () => profile()?.startDate || c.today();
export const programLength = () => Number(profile()?.programDays) || 30;
export const programDay = (date = c.today()) => c.diffDays(startDate(), date) + 1;

// ---------- день ----------
export const day = (date) => store.get('days', date) || {};
export const saveDay = (date, part) => store.patch('days', date, part);

export function mealFor(date, slot) {
  return menu()[c.isoWeekday(date)]?.[slot];
}

export function toggleMeal(date, slot) {
  const d = day(date);
  const meals = { ...(d.meals || {}) };
  if (meals[slot]) delete meals[slot];
  else {
    const meal = mealFor(date, slot);
    if (!meal) return;
    const n = c.mealNutr(meal, db(), scale());
    meals[slot] = { name: meal?.name || '', kcal: n.kcal, p: n.p };
  }
  saveDay(date, { meals });
}

export function dayTotals(date) {
  const d = day(date);
  let kcal = 0, p = 0;
  for (const m of Object.values(d.meals || {})) { kcal += m.kcal || 0; p += m.p || 0; }
  for (const e of d.extras || []) { kcal += Number(e.kcal) || 0; p += Number(e.p) || 0; }
  const auto = { kcal, p };
  return {
    kcal: d.kcalManual != null && d.kcalManual !== '' ? Number(d.kcalManual) : kcal,
    p: d.pManual != null && d.pManual !== '' ? Number(d.pManual) : p,
    auto,
    hasFood: Boolean(Object.keys(d.meals || {}).length || (d.extras || []).length || d.kcalManual),
  };
}

export const workoutsOn = (date) => store.all('workouts').filter((w) => w.date === date);
export const isTraining = (w) => w.type !== 'rest';

export function habitAuto(date, id) {
  const d = day(date);
  const t = T();
  if (id === 'water') return (d.water || 0) >= t.water[0] * 1000;
  if (id === 'noSkip') return Object.keys(d.meals || {}).length >= 3 && ['b', 'l', 'd'].every((k) => d.meals?.[k]);
  if (id === 'activity') return workoutsOn(date).some(isTraining) || (d.steps || 0) >= 7000;
  if (id === 'sleep') return (d.sleep || 0) >= 7;
  return false;
}

export function habitOn(date, id) {
  const h = day(date).habits || {};
  return id in h ? Boolean(h[id]) : habitAuto(date, id);
}

export const habitsDone = (date) => HABITS.filter((h) => habitOn(date, h.id)).length;

export function hasData(date) {
  const d = day(date);
  return Boolean(d.weight || d.water || d.steps || d.sleep || d.mood || d.comment ||
    Object.keys(d.meals || {}).length || (d.extras || []).length || Object.keys(d.habits || {}).length || workoutsOn(date).length);
}

// Зелёный — питание и активность по плану, жёлтый — частично, серый — нет данных
export function dayStatus(date) {
  if (!hasData(date)) return 'grey';
  const meals = Object.keys(day(date).meals || {}).length;
  const habits = habitsDone(date);
  return meals >= 4 && habitOn(date, 'activity') && habits >= 5 ? 'green' : 'yellow';
}

// ---------- статистика ----------
export function avgOver(dates, fn) {
  const v = dates.map(fn).filter((x) => x != null && !Number.isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export const last7 = (end = c.today()) => c.range(c.addDays(end, -6), 7);

export function weekStats(end = c.today()) {
  const ds = last7(end);
  return {
    kcal: avgOver(ds, (d) => (dayTotals(d).hasFood ? dayTotals(d).kcal : null)),
    p: avgOver(ds, (d) => (dayTotals(d).hasFood ? dayTotals(d).p : null)),
    steps: avgOver(ds, (d) => day(d).steps || null),
    water: avgOver(ds, (d) => day(d).water || null),
    workouts: store.all('workouts').filter((w) => isTraining(w) && w.date >= ds[0] && w.date <= ds[6]).length,
    days: ds.filter(hasData).length,
  };
}

export const measurements = () => store.all('meas').sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ts || 0) - (b.ts || 0)));

export function measSeries(field) {
  return measurements().filter((m) => m[field] != null && m[field] !== '').map((m) => ({ date: m.date, v: Number(m[field]) }));
}

export function firstLast(field) {
  const s = field === 'weight' ? weights().map((x) => ({ date: x.date, v: x.w })) : measSeries(field);
  if (!s.length) return null;
  return { first: s[0], last: s[s.length - 1], delta: s[s.length - 1].v - s[0].v, count: s.length };
}

export { MEAL_SLOTS };
