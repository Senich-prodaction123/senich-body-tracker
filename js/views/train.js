import * as M from '../model.js';
import * as c from '../calc.js';
import * as store from '../store.js';
import { A, esc, n0, n1, num, fmtDate, toast, confirmBox } from '../ui.js';

let month = null; // 'YYYY-MM-01'

function form(w, date) {
  const v = w || { date: date || c.today(), type: 'strength', duration: 60, intensity: 'Средняя', feel: 4, comment: '' };
  return `<section class="card">
    <div class="card-h"><h3>${w ? 'Изменить тренировку' : 'Новая тренировка'}</h3><a class="link" href="#train">Отмена</a></div>
    <form data-f="trainSave" data-id="${w ? w.id : ''}">
      <div class="fields">
        <label class="fld"><span>Дата</span><input type="date" name="date" value="${v.date}" required></label>
        <label class="fld"><span>Продолжительность</span><div class="inp-u"><input type="number" inputmode="numeric" name="duration" value="${v.duration ?? ''}"><em>мин</em></div></label>
      </div>
      <div class="fld"><span>Тип</span><div class="seg wrap">${M.WORKOUT_TYPES.map((t) => `<label><input type="radio" name="type" value="${t.id}" ${v.type === t.id ? 'checked' : ''}><b>${t.name}</b></label>`).join('')}</div></div>
      <div class="fld"><span>Интенсивность</span><div class="seg">${M.INTENSITY.map((t) => `<label><input type="radio" name="intensity" value="${t}" ${v.intensity === t ? 'checked' : ''}><b>${t}</b></label>`).join('')}</div></div>
      <div class="fld"><span>Самочувствие после</span><div class="seg wrap">${M.MOODS.slice(1).map((m, i) => `<label><input type="radio" name="feel" value="${i + 1}" ${Number(v.feel) === i + 1 ? 'checked' : ''}><b>${m}</b></label>`).join('')}</div></div>
      <label class="fld"><span>Комментарий</span><textarea name="comment" rows="2">${esc(v.comment || '')}</textarea></label>
      <div class="row gap">
        ${w ? `<button type="button" class="btn ghost danger-t" data-a="trainDel" data-id="${w.id}">Удалить</button>` : ''}
        <button class="btn primary grow">Сохранить</button>
      </div>
    </form></section>`;
}

export function render(sub, arg) {
  if (sub === 'new') return form(null, arg);
  if (sub === 'edit') { const w = store.get('workouts', arg); if (w) return form({ id: arg, ...w }); }

  const all = store.all('workouts').sort((a, b) => (a.date < b.date ? 1 : -1));
  const tr = all.filter(M.isTraining);
  const td = c.today();
  const mon = c.mondayOf(td);
  const weekN = tr.filter((w) => w.date >= mon && w.date <= td).length;
  const m0 = month || `${td.slice(0, 7)}-01`;
  const monthN = tr.filter((w) => w.date.startsWith(m0.slice(0, 7))).length;
  const minutes = tr.reduce((s, w) => s + (Number(w.duration) || 0), 0);
  const first = tr.length ? tr[tr.length - 1].date : null;
  const weeks = first ? Math.max(1, (c.diffDays(first, td) + 1) / 7) : 0;
  const perWeek = weeks ? tr.length / weeks : 0;

  // календарь месяца
  const d1 = c.parseYmd(m0);
  const daysIn = new Date(d1.getFullYear(), d1.getMonth() + 1, 0).getDate();
  const lead = c.isoWeekday(m0) - 1;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<div></div>');
  for (let i = 1; i <= daysIn; i++) {
    const ds = `${m0.slice(0, 8)}${String(i).padStart(2, '0')}`;
    const ws = all.filter((w) => w.date === ds);
    cells.push(`<a href="#train/new/${ds}" class="cal-d ${ds === td ? 'today' : ''} ${ws.some(M.isTraining) ? 'has' : ws.length ? 'rest' : ''}" title="${ws.map((w) => M.WORKOUT_TYPES.find((x) => x.id === w.type)?.name).join(', ')}"><span>${i}</span>${ws.length ? `<i>${ws.map((w) => (M.WORKOUT_TYPES.find((x) => x.id === w.type)?.name || '').slice(0, 3)).join(' ')}</i>` : ''}</a>`);
  }
  const prevM = new Date(d1.getFullYear(), d1.getMonth() - 1, 1), nextM = new Date(d1.getFullYear(), d1.getMonth() + 1, 1);
  const monthName = d1.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  return `
  <header class="page-h"><div><p class="eyebrow">Учёт нагрузки, без навязанных программ</p><h1>Тренировки</h1></div>
    <a class="btn primary" href="#train/new/${td}">+ Тренировка</a></header>
  <div class="kpis">
    <div class="kpi"><span>На этой неделе</span><b>${weekN}</b><em>план 2–3</em></div>
    <div class="kpi"><span>За месяц</span><b>${monthN}</b><em>${monthName}</em></div>
    <div class="kpi"><span>Время активности</span><b>${n1(minutes / 60)} ч</b><em>всего, ${n0(minutes)} мин</em></div>
    <div class="kpi"><span>Средняя частота</span><b>${n1(perWeek)}</b><em>тренировок в неделю</em></div>
  </div>
  <section class="card">
    <div class="card-h"><button class="btn ghost sm" data-a="trainMonth" data-m="${c.ymd(prevM)}">←</button><h3 class="cap">${monthName}</h3><button class="btn ghost sm" data-a="trainMonth" data-m="${c.ymd(nextM)}">→</button></div>
    <div class="cal"><b>Пн</b><b>Вт</b><b>Ср</b><b>Чт</b><b>Пт</b><b>Сб</b><b>Вс</b>${cells.join('')}</div>
    <p class="hint">Нажмите на день, чтобы добавить тренировку.</p>
  </section>
  <section class="card"><div class="card-h"><h3>Журнал</h3></div>
    ${all.length ? `<ul class="list">${all.slice(0, 40).map((w) => `<li><a class="grow" href="#train/edit/${w.id}"><b>${esc(M.WORKOUT_TYPES.find((x) => x.id === w.type)?.name)}</b> · ${fmtDate(w.date)}<br><small class="muted">${w.duration || 0} мин · ${esc(w.intensity || '')}${w.feel ? ' · после: ' + M.MOODS[w.feel] : ''}${w.comment ? ' · ' + esc(w.comment) : ''}</small></a><span class="muted">›</span></li>`).join('')}</ul>` : '<p class="muted">Пока пусто. Добавьте первую тренировку — бокс, силовая, кардио, ходьба или день отдыха.</p>'}
  </section>`;
}

A.trainMonth = (el) => { month = el.dataset.m; window.dispatchEvent(new Event('sbt-render')); };

A.trainSave = (f, form) => {
  const id = form.dataset.id || `w${Date.now()}`;
  if (!f.date) { toast('Укажите дату'); return; }
  store.put('workouts', id, { date: f.date, type: f.type || 'strength', duration: num(f.duration) || 0, intensity: f.intensity || '', feel: num(f.feel), comment: f.comment || '' });
  toast('Тренировка сохранена');
  location.hash = '#train';
};

A.trainDel = async (el) => {
  if (!(await confirmBox('Удалить эту тренировку?', 'Удалить', true))) return;
  store.del('workouts', el.dataset.id);
  location.hash = '#train';
  toast('Тренировка удалена', 'Вернуть', () => store.undoDelete());
};
