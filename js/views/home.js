import * as M from '../model.js';
import * as c from '../calc.js';
import * as store from '../store.js';
import { A, esc, n0, n1, signed, bar, ring, lineChart, barChart, fmtDate, fmtShort, toast, confirmBox } from '../ui.js';

export function todayBlock(date) {
  const t = M.T();
  const tot = M.dayTotals(date);
  const d = M.day(date);
  const sc = M.scale();
  const water = d.water || 0;
  const wTarget = t.water[0] * 1000;
  const trained = M.workoutsOn(date).filter(M.isTraining);
  const kLeft = t.kcalRange[0] - tot.kcal;
  const pLeft = t.protein[0] - tot.p;
  const tasks = [];
  if (!d.weight) tasks.push(['Записать утренний вес', `#day/${date}`]);
  for (const s of M.MEAL_SLOTS) if (!d.meals?.[s.id]) tasks.push([`${s.name} в ${s.time}`, `#food/${date}`]);
  if (water < wTarget) tasks.push([`Вода: ещё ${n1((wTarget - water) / 1000)} л`, null]);
  for (const h of M.HABITS) if (!M.habitOn(date, h.id) && h.id !== 'water' && h.id !== 'noSkip') tasks.push([h.name, `#day/${date}`]);

  return `<section class="card today">
    <div class="card-h"><h2>Сегодня</h2><a class="link" href="#day/${date}">Открыть дневник →</a></div>
    <div class="today-grid">
      <div class="rings">
        ${ring(tot.kcal, t.kcal, n0(tot.kcal), kLeft > 0 ? `осталось ~${n0(kLeft)} ккал` : 'ориентир набран')}
        ${ring(tot.p, t.protein[0], `${n0(tot.p)} г`, pLeft > 0 ? `белка ещё ${n0(pLeft)} г` : 'белок набран')}
        ${ring(water, wTarget, `${n1(water / 1000)} л`, water < wTarget ? 'вода' : 'норма воды')}
      </div>
      <div class="water-ctl">
        <span class="muted">Вода</span>
        <button class="btn ghost sm" data-a="water" data-d="${date}" data-v="-250" aria-label="Минус стакан">−</button>
        <b>${n1(water / 1000)} л</b>
        <button class="btn primary sm" data-a="water" data-d="${date}" data-v="250">+ стакан</button>
      </div>
    </div>
    <ul class="meals-mini">
      ${M.MEAL_SLOTS.map((s) => {
        const meal = M.mealFor(date, s.id);
        const n = c.mealNutr(meal, M.db(), sc);
        const on = Boolean(d.meals?.[s.id]);
        return `<li class="${on ? 'done' : ''}">
          <button class="check ${on ? 'on' : ''}" data-a="meal" data-d="${date}" data-s="${s.id}" aria-label="Съедено">${on ? '✓' : ''}</button>
          <span class="t">${s.time}</span>
          <a class="nm" href="#food/${date}/${s.id}">${esc(meal?.name || '—')}</a>
          <span class="kc">${n0(n.kcal)} ккал · ${n0(n.p)} г</span>
        </li>`;
      }).join('')}
    </ul>
    <div class="row wrap gap sm-gap">
      <span class="chip ${trained.length ? 'on' : ''}">${trained.length ? `Тренировка: ${trained.map((w) => esc(M.WORKOUT_TYPES.find((x) => x.id === w.type)?.name)).join(', ')}` : 'Тренировки сегодня нет'}</span>
      <a class="chip link" href="#train/new/${date}">+ тренировка</a>
    </div>
    ${tasks.length ? `<details class="tasks"><summary>Не отмечено: ${tasks.length}</summary><ul>${tasks.map(([t, h]) => `<li>${h ? `<a href="${h}">${esc(t)}</a>` : esc(t)}</li>`).join('')}</ul></details>` : '<p class="ok">Всё отмечено. Отличный день.</p>'}
  </section>`;
}

export function render() {
  const p = M.profile();
  const t = M.T();
  const td = c.today();
  const cur = M.currentWeight();
  const start = Number(p.startWeight);
  const pd = Math.max(0, Math.min(M.programLength(), M.programDay(td)));
  const plen = M.programLength();
  const ws = M.weekStats();
  const waist = M.firstLast('waist');
  const allW = store.all('workouts').filter(M.isTraining);
  const st = M.challengeStatus();
  const dates = M.programDates();
  const toTarget = start - t.targetWeight;
  const done = start - cur;
  const pctW = toTarget > 0 ? Math.max(0, Math.min(100, (done / toTarget) * 100)) : 0;

  const wPoints = dates.map((d) => {
    const w = M.weights().find((x) => x.date === d);
    return { x: fmtShort(d), y: w ? w.w : d === M.startDate() ? start : null };
  });
  const waistPts = M.measSeries('waist').map((m) => ({ x: fmtShort(m.date), y: m.v }));
  const last14 = c.range(c.addDays(td, -13), 14);
  const kcalPts = last14.map((d) => ({ x: fmtShort(d), y: M.dayTotals(d).hasFood ? M.dayTotals(d).kcal : 0 }));
  const protPts = last14.map((d) => ({ x: fmtShort(d), y: M.dayTotals(d).hasFood ? M.dayTotals(d).p : 0 }));
  const weeksN = Math.ceil(plen / 7);
  const wkPts = Array.from({ length: weeksN }, (_, i) => {
    const a = c.addDays(M.startDate(), i * 7), b = c.addDays(a, 6);
    return { x: `Нед ${i + 1}`, y: allW.filter((w) => w.date >= a && w.date <= b).length };
  });

  return `
  <header class="page-h">
    <div><p class="eyebrow">${fmtDate(td)} · ${p.name ? esc(p.name) : 'SENICH BODY TRACKER'}</p>
    <h1>${st === 'idle' ? 'Челлендж не начат' : st === 'paused' ? `Пауза <span class="muted">· пройдено ${pd} из ${plen}</span>` : pd >= 1 ? `День ${pd} <span class="muted">из ${plen}</span>` : `Старт ${fmtDate(M.startDate())}`}</h1></div>
    ${st === 'idle' ? '' : `<div class="prog"><span>${Math.round((Math.max(0, pd) / plen) * 100)}%</span>${bar(Math.max(0, pd), plen)}</div>`}
  </header>
  ${challengeCard(st, pd, plen)}

  <section class="hero card">
    <div class="hero-main">
      <p class="muted">Текущий вес</p>
      <div class="big">${n1(cur)}<small> кг</small></div>
      <p class="delta ${done > 0 ? 'good' : ''}">${signed(cur - start)} кг от старта</p>
    </div>
    <div class="hero-side">
      <div><span class="muted">Старт</span><b>${n1(start)} кг</b></div>
      <div><span class="muted">Цель</span><b>${n1(t.targetWeight)} кг</b></div>
      <div><span class="muted">До цели</span><b>${n1(Math.max(0, cur - t.targetWeight))} кг</b></div>
    </div>
    <div class="hero-bar">${bar(pctW, 100)}<span class="muted">Путь к цели: ${Math.round(pctW)}%</span></div>
  </section>

  <div class="kpis">
    <div class="kpi"><span>Калории, ср. за неделю</span><b>${n0(ws.kcal)}</b><em>ориентир ${n0(t.kcalRange[0])}–${n0(t.kcalRange[1])}</em></div>
    <div class="kpi"><span>Белок, ср. за неделю</span><b>${ws.p != null ? n0(ws.p) + ' г' : '—'}</b><em>ориентир ${t.protein[0]}–${t.protein[1]} г</em></div>
    <div class="kpi"><span>Тренировки</span><b>${ws.workouts}</b><em>за 7 дней · всего ${allW.length}</em></div>
    <div class="kpi"><span>Шаги, ср. за неделю</span><b>${n0(ws.steps)}</b><em>в день</em></div>
    <div class="kpi"><span>Вода, ср. за неделю</span><b>${ws.water != null ? n1(ws.water / 1000) + ' л' : '—'}</b><em>норма ${n1(t.water[0])}–${n1(t.water[1])} л</em></div>
    <div class="kpi"><span>Талия</span><b>${waist && waist.count > 1 ? signed(waist.delta) + ' см' : waist ? n1(waist.last.v) + ' см' : '—'}</b><em>${waist ? (waist.count > 1 ? `с ${n1(waist.first.v)} до ${n1(waist.last.v)} см` : 'первый замер') : '<a href="#meas">внести замеры</a>'}</em></div>
  </div>

  ${todayBlock(td)}

  <div class="grid2">
    <section class="card"><div class="card-h"><h3>Вес за ${plen} дней</h3></div>${lineChart(wPoints, { unit: 'кг', target: t.targetWeight })}</section>
    <section class="card"><div class="card-h"><h3>Окружность талии</h3></div>${lineChart(waistPts, { unit: 'см' })}</section>
    <section class="card"><div class="card-h"><h3>Калории, 14 дней</h3></div>${barChart(kcalPts, { target: t.kcal, unit: 'ккал' })}</section>
    <section class="card"><div class="card-h"><h3>Белок, 14 дней</h3></div>${barChart(protPts, { target: t.protein[0], unit: 'г' })}</section>
    <section class="card"><div class="card-h"><h3>Тренировки по неделям</h3></div>${barChart(wkPts, { unit: 'шт' })}</section>
  </div>`;
}

function challengeCard(st, pd, plen) {
  if (st === 'idle') {
    return `<section class="card chal">
      <div><h3>Челлендж ${plen} дней</h3><p class="muted small">Питание по плану, вес, замеры и тренировки. Счёт дней пойдёт с сегодняшнего дня. Пока челлендж не начат, дневник работает как обычно.</p></div>
      <button class="btn primary" data-a="chStart">Начать челлендж</button></section>`;
  }
  if (st === 'paused') {
    return `<section class="card chal">
      <div><h3>Челлендж на паузе</h3><p class="muted small">Дни паузы не считаются. После «Продолжить» счёт пойдёт с дня ${pd + 1}.</p></div>
      <div class="row gap"><button class="btn primary" data-a="chResume">Продолжить</button><button class="btn ghost danger-t" data-a="chFinish">Завершить</button></div></section>`;
  }
  return `<section class="card chal">
    <div><p class="muted small">${pd >= plen ? 'Все дни пройдены. Завершите челлендж — итог сохранится в «Моём прогрессе».' : 'Выпали на пару дней (праздник, болезнь, поездка)? Поставьте паузу — эти дни не испортят статистику.'}</p></div>
    <div class="row gap"><button class="btn ghost" data-a="chPause">Пауза</button><button class="btn ghost danger-t" data-a="chFinish">Завершить</button></div></section>`;
}

A.chStart = () => { M.startChallenge(); toast('Челлендж начат. День 1!'); };
A.chPause = () => { M.pauseChallenge(); toast('Пауза. Дни не считаются'); };
A.chResume = () => { M.resumeChallenge(); toast('Продолжаем!'); };
A.chFinish = async () => {
  if (!(await confirmBox('Завершить челлендж? Итог сохранится в «Моём прогрессе», счёт дней обнулится. Записи веса и дневника останутся.', 'Завершить', true))) return;
  M.finishChallenge();
  toast('Челлендж завершён. Итог сохранён');
};

A.water = (el) => {
  const d = el.dataset.d;
  const v = Math.max(0, (M.day(d).water || 0) + Number(el.dataset.v));
  M.saveDay(d, { water: v });
};

A.meal = (el) => {
  M.toggleMeal(el.dataset.d, el.dataset.s);
  if (M.day(el.dataset.d).meals?.[el.dataset.s]) toast('Отмечено: съедено');
};
