import * as M from '../model.js';
import * as c from '../calc.js';
import * as store from '../store.js';
import { A, esc, n0, n1, signed, bar, lineChart, barChart, fmtDate, fmtShort, download, csv } from '../ui.js';

function report() {
  const p = M.profile();
  const plen = M.programLength();
  const start = M.startDate();
  const dates = c.range(start, plen);
  const upto = dates.filter((d) => d <= c.today());
  const withData = upto.filter(M.hasData);
  const wts = M.weights();
  const lastW = wts.length ? wts[wts.length - 1] : null;
  const foodDays = upto.filter((d) => M.dayTotals(d).hasFood);
  const avgK = M.avgOver(foodDays, (d) => M.dayTotals(d).kcal);
  const avgP = M.avgOver(foodDays, (d) => M.dayTotals(d).p);
  const avgS = M.avgOver(upto, (d) => M.day(d).steps || null);
  const tr = store.all('workouts').filter((w) => M.isTraining(w) && w.date >= start && w.date <= dates[dates.length - 1]);
  const mealsDone = upto.reduce((s, d) => s + Object.keys(M.day(d).meals || {}).length, 0);
  const mealPct = withData.length ? (mealsDone / (withData.length * 4)) * 100 : null;
  const habPct = withData.length ? (withData.reduce((s, d) => s + M.habitsDone(d), 0) / (withData.length * M.HABITS.length)) * 100 : null;
  const meas = M.measurements();
  const d0 = meas.find((m) => m.label === 'День 0') || meas[0];
  const d30 = meas.find((m) => m.label === `День ${plen}`) || (meas.length > 1 ? meas[meas.length - 1] : null);
  return { p, plen, start, dates, upto, withData, lastW, avgK, avgP, avgS, tr, mealPct, habPct, d0, d30, foodDays };
}

export function render() {
  const t = M.T();
  const R = report();
  const start = Number(R.p.startWeight);
  const finalW = R.lastW ? R.lastW.w : null;
  const pd = M.programDay();
  const isFinal = pd >= R.plen;

  const wPts = R.dates.map((d) => { const w = M.weights().find((x) => x.date === d); return { x: fmtShort(d), y: w ? w.w : d === R.start ? start : null }; });
  const waist = M.measSeries('waist').map((m) => ({ x: fmtShort(m.date), y: m.v }));
  const belly = M.measSeries('belly').map((m) => ({ x: fmtShort(m.date), y: m.v }));
  const kPts = R.upto.map((d) => ({ x: fmtShort(d), y: M.dayTotals(d).hasFood ? M.dayTotals(d).kcal : 0 }));
  const pPts = R.upto.map((d) => ({ x: fmtShort(d), y: M.dayTotals(d).hasFood ? M.dayTotals(d).p : 0 }));
  const weeks = Math.ceil(R.plen / 7);
  const wkPts = Array.from({ length: weeks }, (_, i) => { const a = c.addDays(R.start, i * 7), b = c.addDays(a, 6); return { x: `Нед ${i + 1}`, y: R.tr.filter((w) => w.date >= a && w.date <= b).length }; });

  const lead = c.isoWeekday(R.start) - 1;
  const cal = [...Array(lead).fill('<div></div>'), ...R.dates.map((d, i) => {
    const st = d > c.today() ? 'future' : M.dayStatus(d);
    return `<a href="#day/${d}" class="cal-d st-${st} ${d === c.today() ? 'today' : ''}"><span>${i + 1}</span><i>${fmtShort(d)}</i></a>`;
  })].join('');

  const habitRows = M.HABITS.map((h) => {
    const n = R.withData.filter((d) => M.habitOn(d, h.id)).length;
    return `<div class="hab-row"><span>${h.name}</span>${bar(n, R.withData.length || 1)}<b>${n}/${R.withData.length}</b></div>`;
  }).join('');

  const cmpRow = (f) => {
    const a = R.d0?.[f.id], b = R.d30?.[f.id];
    return `<tr><td>${f.name}</td><td>${a != null && a !== '' ? n1(a) : '—'}</td><td>${b != null && b !== '' ? n1(b) : '—'}</td><td class="${b - a < 0 ? 'good' : b - a > 0 ? 'bad' : ''}">${a != null && b != null && a !== '' && b !== '' ? signed(b - a) + ' ' + f.unit : '—'}</td></tr>`;
  };

  return `
  <header class="page-h"><div><p class="eyebrow">Графики, календарь, отчёт</p><h1>Мой прогресс</h1></div>
    <div class="row gap no-print"><button class="btn ghost sm" data-a="exportCsv">CSV</button><button class="btn primary sm" data-a="printReport">PDF-отчёт</button></div></header>

  <section class="card no-print"><div class="card-h"><h3>Календарь ${R.plen} дней</h3><span class="muted small">с ${fmtDate(R.start)}</span></div>
    <div class="cal prog-cal"><b>Пн</b><b>Вт</b><b>Ср</b><b>Чт</b><b>Пт</b><b>Сб</b><b>Вс</b>${cal}</div>
    <div class="legend"><span><i class="st-green"></i>по плану</span><span><i class="st-yellow"></i>частично</span><span><i class="st-grey"></i>нет данных</span></div>
    <p class="hint">Пропущенный день — не провал. Просто продолжайте со следующего.</p>
  </section>

  <div class="grid2 no-print">
    <section class="card"><div class="card-h"><h3>Вес</h3></div>${lineChart(wPts, { unit: 'кг', target: t.targetWeight })}</section>
    <section class="card"><div class="card-h"><h3>Талия и живот</h3></div>${lineChart(waist, { unit: 'см' })}${belly.length ? `<p class="muted small">Живот: ${belly.map((b) => `${b.x} — ${n1(b.y)} см`).join(' · ')}</p>` : ''}</section>
    <section class="card"><div class="card-h"><h3>Калории по дням</h3></div>${barChart(kPts, { target: t.kcal, unit: 'ккал' })}</section>
    <section class="card"><div class="card-h"><h3>Белок по дням</h3></div>${barChart(pPts, { target: t.protein[0], unit: 'г' })}</section>
    <section class="card"><div class="card-h"><h3>Тренировки по неделям</h3></div>${barChart(wkPts, { unit: 'шт' })}</section>
    <section class="card"><div class="card-h"><h3>Привычки</h3><span class="muted">${R.habPct != null ? Math.round(R.habPct) + '%' : '—'}</span></div>${R.withData.length ? habitRows : '<p class="muted">Отмечайте привычки в «Моём дне».</p>'}</section>
  </div>

  <section class="card report" id="report">
    <div class="card-h"><h2>${isFinal ? 'Итоговый отчёт' : `Отчёт на день ${Math.max(0, pd)} из ${R.plen}`}</h2><span class="muted">${esc(R.p.name || 'SENICH BODY TRACKER')} · ${fmtDate(R.start, true)} — ${fmtDate(R.dates[R.dates.length - 1], true)}</span></div>
    ${!isFinal ? '<p class="hint">Полный итог сформируется на 30-й день. Сейчас показано то, что уже внесено.</p>' : ''}
    <div class="kpis">
      <div class="kpi"><span>Стартовый вес</span><b>${n1(start)} кг</b></div>
      <div class="kpi"><span>${isFinal ? 'Финальный' : 'Текущий'} вес</span><b>${finalW != null ? n1(finalW) + ' кг' : '—'}</b></div>
      <div class="kpi"><span>Разница</span><b class="${finalW != null && finalW < start ? 'good' : ''}">${finalW != null ? signed(finalW - start) + ' кг' : '—'}</b></div>
      <div class="kpi"><span>Средние калории</span><b>${n0(R.avgK)}</b><em>${R.foodDays.length} дн. с данными</em></div>
      <div class="kpi"><span>Средний белок</span><b>${R.avgP != null ? n0(R.avgP) + ' г' : '—'}</b></div>
      <div class="kpi"><span>Тренировок</span><b>${R.tr.length}</b><em>${n0(R.tr.reduce((s, w) => s + (Number(w.duration) || 0), 0))} мин</em></div>
      <div class="kpi"><span>Средние шаги</span><b>${n0(R.avgS)}</b></div>
      <div class="kpi"><span>Режим питания</span><b>${R.mealPct != null ? Math.round(R.mealPct) + '%' : '—'}</b><em>приёмов пищи по плану</em></div>
      <div class="kpi"><span>Полезные привычки</span><b>${R.habPct != null ? Math.round(R.habPct) + '%' : '—'}</b></div>
    </div>
    <h3>День 0 против ${R.d30 ? esc(R.d30.label || 'последнего замера') : 'Дня 30'}</h3>
    ${R.d0 ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Параметр</th><th>${esc(R.d0.label)}<br><small>${fmtDate(R.d0.date)}</small></th><th>${R.d30 ? esc(R.d30.label) + '<br><small>' + fmtDate(R.d30.date) + '</small>' : 'День 30'}</th><th>Разница</th></tr></thead>
      <tbody>${M.MEAS_FIELDS.map(cmpRow).join('')}</tbody></table></div>` : '<p class="muted">Нет замеров. Внесите День 0 в разделе «Замеры».</p>'}
    <div class="print-only">${lineChart(wPts, { unit: 'кг', target: t.targetWeight })}</div>
  </section>`;
}

A.printReport = () => { document.body.classList.add('print-report'); setTimeout(() => { window.print(); document.body.classList.remove('print-report'); }, 50); };

A.exportCsv = () => {
  const days = store.all('days').sort((a, b) => (a.id < b.id ? -1 : 1));
  const rows = [['Дата', 'Вес', 'Калории', 'Белок', 'Завтрак', 'Обед', 'Перекус', 'Ужин', 'Вода, мл', 'Шаги', 'Сон, ч', 'Самочувствие', 'Привычек', 'Комментарий']];
  for (const d of days) {
    const t = M.dayTotals(d.id);
    rows.push([d.id, d.weight ?? '', Math.round(t.kcal), Math.round(t.p), ...['b', 'l', 's', 'd'].map((k) => (d.meals?.[k] ? 'да' : '')), d.water ?? '', d.steps ?? '', d.sleep ?? '', d.mood ? M.MOODS[d.mood] : '', M.habitsDone(d.id), d.comment || '']);
  }
  rows.push([], ['ЗАМЕРЫ'], ['Дата', 'Название', ...M.MEAS_FIELDS.map((f) => `${f.name}, ${f.unit}`)]);
  for (const m of M.measurements()) rows.push([m.date, m.label, ...M.MEAS_FIELDS.map((f) => m[f.id] ?? '')]);
  rows.push([], ['ТРЕНИРОВКИ'], ['Дата', 'Тип', 'Минут', 'Интенсивность', 'Самочувствие', 'Комментарий']);
  for (const w of store.all('workouts').sort((a, b) => (a.date < b.date ? -1 : 1))) rows.push([w.date, M.WORKOUT_TYPES.find((x) => x.id === w.type)?.name, w.duration, w.intensity, w.feel ? M.MOODS[w.feel] : '', w.comment]);
  download(`senich-body-tracker-${c.today()}.csv`, csv(rows), 'text/csv');
};
