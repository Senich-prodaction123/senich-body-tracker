import * as M from '../model.js';
import * as c from '../calc.js';
import * as store from '../store.js';
import { A, esc, n0, n1, num, fmtDate, toast, openSheet, closeSheet } from '../ui.js';

export function render(date = c.today()) {
  const d = M.day(date);
  const t = M.T();
  const tot = M.dayTotals(date);
  const sc = M.scale();
  const wd = c.isoWeekday(date);
  const pd = M.programDay(date);
  const wos = M.workoutsOn(date);
  const fld = (k, label, unit, step = 'any', ph = '') => `<label class="fld"><span>${label}</span>
    <div class="inp-u"><input type="number" inputmode="decimal" step="${step}" data-c="dayField" data-d="${date}" data-k="${k}" value="${d[k] ?? ''}" placeholder="${ph}"><em>${unit}</em></div></label>`;

  return `
  <header class="page-h">
    <div><p class="eyebrow">Мой день${pd >= 1 && pd <= M.programLength() ? ` · день программы ${pd}` : ''}</p>
    <h1>${fmtDate(date)} <span class="muted">${['', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'][wd]}</span></h1></div>
    <div class="row gap">
      <a class="btn ghost sm" href="#day/${c.addDays(date, -1)}" aria-label="Предыдущий день">←</a>
      <input type="date" class="date-inp" value="${date}" data-c="gotoDay">
      <a class="btn ghost sm" href="#day/${c.addDays(date, 1)}" aria-label="Следующий день">→</a>
    </div>
  </header>

  <div class="grid2">
  <section class="card">
    <div class="card-h"><h3>Тело и активность</h3></div>
    <div class="fields">
      ${fld('weight', 'Утренний вес', 'кг', '0.1', n1(M.currentWeight()))}
      ${fld('steps', 'Шаги', 'шаг', '1')}
      ${fld('sleep', 'Сон', 'ч', '0.5')}
      <label class="fld"><span>Вода</span><div class="row gap">
        <button class="btn ghost sm" data-a="water" data-d="${date}" data-v="-250">−</button>
        <div class="inp-u grow"><input type="number" inputmode="numeric" step="50" data-c="dayField" data-d="${date}" data-k="water" value="${d.water ?? ''}"><em>мл</em></div>
        <button class="btn primary sm" data-a="water" data-d="${date}" data-v="250">+250</button></div></label>
    </div>
    <div class="fld"><span>Самочувствие</span><div class="seg">
      ${M.MOODS.slice(1).map((m, i) => `<button class="${d.mood === i + 1 ? 'on' : ''}" data-a="mood" data-d="${date}" data-v="${i + 1}">${m}</button>`).join('')}
    </div></div>
    <div class="fld"><span>Тренировка</span>
      ${wos.length ? `<ul class="list">${wos.map((w) => `<li><b>${esc(M.WORKOUT_TYPES.find((x) => x.id === w.type)?.name)}</b> · ${w.duration || 0} мин · ${esc(w.intensity || '')} <a class="link" href="#train/edit/${w.id}">изменить</a></li>`).join('')}</ul>` : '<p class="muted">Не отмечена</p>'}
      <a class="btn ghost sm" href="#train/new/${date}">+ Добавить тренировку</a>
    </div>
    <label class="fld"><span>Комментарий</span><textarea rows="3" data-c="dayField" data-d="${date}" data-k="comment" placeholder="Как прошёл день">${esc(d.comment || '')}</textarea></label>
  </section>

  <section class="card">
    <div class="card-h"><h3>Питание</h3><a class="link" href="#food/${date}">Меню дня →</a></div>
    <ul class="checks">
      ${M.MEAL_SLOTS.map((s) => {
        const meal = M.mealFor(date, s.id);
        const snap = d.meals?.[s.id];
        const n = snap || c.mealNutr(meal, M.db(), sc);
        return `<li><button class="check ${snap ? 'on' : ''}" data-a="meal" data-d="${date}" data-s="${s.id}">${snap ? '✓' : ''}</button>
          <div class="grow"><b>${s.name}</b> <span class="muted">${s.time}</span><br><small class="muted">${esc(snap?.name || meal?.name || '')}</small></div>
          <span class="kc">${n0(n.kcal)} ккал<br>${n0(n.p)} г белка</span></li>`;
      }).join('')}
    </ul>
    <div class="fld"><span>Дополнительно съедено</span>
      ${(d.extras || []).length ? `<ul class="list">${d.extras.map((e, i) => `<li><span class="grow">${esc(e.name)}</span><span class="kc">${n0(e.kcal)} ккал · ${n0(e.p)} г</span><button class="icon-btn" data-a="extraDel" data-d="${date}" data-i="${i}" aria-label="Удалить">✕</button></li>`).join('')}</ul>` : ''}
      <button class="btn ghost sm" data-a="extraAdd" data-d="${date}">+ Добавить продукт</button>
    </div>
    <div class="totals">
      <div><span class="muted">Калории за день</span><b>${n0(tot.kcal)}</b><em>ориентир ${t.kcalRange[0]}–${t.kcalRange[1]}</em></div>
      <div><span class="muted">Белок за день</span><b>${n0(tot.p)} г</b><em>ориентир ${t.protein[0]}–${t.protein[1]} г</em></div>
    </div>
    <details class="sub"><summary>Ввести калории и белок вручную</summary>
      <p class="muted small">Если ели не по меню — впишите итог за день. Пустое поле — считать автоматически (${n0(tot.auto.kcal)} ккал, ${n0(tot.auto.p)} г).</p>
      <div class="fields">
        <label class="fld"><span>Калории</span><div class="inp-u"><input type="number" inputmode="numeric" data-c="dayField" data-d="${date}" data-k="kcalManual" value="${d.kcalManual ?? ''}"><em>ккал</em></div></label>
        <label class="fld"><span>Белок</span><div class="inp-u"><input type="number" inputmode="numeric" data-c="dayField" data-d="${date}" data-k="pManual" value="${d.pManual ?? ''}"><em>г</em></div></label>
      </div>
    </details>
    <p class="hint">Цифры — ориентир, а не норма, которую надо обязательно доесть.</p>
  </section>
  </div>

  <section class="card">
    <div class="card-h"><h3>Мои привычки</h3><span class="muted">${M.habitsDone(date)} из ${M.HABITS.length}</span></div>
    <div class="habits">
      ${M.HABITS.map((h) => {
        const on = M.habitOn(date, h.id);
        const manual = h.id in (d.habits || {});
        return `<button class="habit ${on ? 'on' : ''}" data-a="habit" data-d="${date}" data-h="${h.id}"><i>${on ? '✓' : ''}</i>${h.name}${!manual && on ? '<small>отмечено автоматически</small>' : ''}</button>`;
      }).join('')}
    </div>
  </section>

  <div class="save-bar"><button class="btn primary wide" data-a="saveDay" data-d="${date}">Сохранить день</button>
  <span class="muted small">Записи сохраняются сразу при вводе. ${store.pendingCount() ? 'Ждут отправки в облако: ' + store.pendingCount() : ''}</span></div>`;
}

A.gotoDay = (el) => { if (el.value) location.hash = `#day/${el.value}`; };

A.dayField = (el) => {
  const k = el.dataset.k;
  const v = el.tagName === 'TEXTAREA' ? el.value : num(el.value);
  if (k === 'weight' && v != null && (v < 30 || v > 300)) { toast('Проверьте вес: похоже на опечатку'); return; }
  M.saveDay(el.dataset.d, { [k]: v });
};

A.mood = (el) => M.saveDay(el.dataset.d, { mood: Number(el.dataset.v) });

A.habit = (el) => {
  const d = el.dataset.d, h = el.dataset.h;
  const habits = { ...(M.day(d).habits || {}) };
  habits[h] = !M.habitOn(d, h);
  M.saveDay(d, { habits });
};

A.saveDay = (el) => {
  document.activeElement?.blur();
  const d = el.dataset.d;
  M.saveDay(d, { savedAt: Date.now() });
  toast(`День ${fmtDate(d)} сохранён`);
};

A.extraAdd = (el) => {
  const d = el.dataset.d;
  const db = M.db();
  const opts = Object.entries(db.foods).filter(([, f]) => !f.noCount).sort((a, b) => a[1].name.localeCompare(b[1].name, 'ru'))
    .map(([id, f]) => `<option value="${id}">${esc(f.name)}</option>`).join('');
  openSheet('Дополнительный продукт', `
    <form data-f="extraSave" data-d="${d}">
      <p class="muted small">Выберите из базы — калории посчитаются сами. Или впишите своё.</p>
      <label class="fld"><span>Из базы</span><select name="fid"><option value="">— своё блюдо —</option>${opts}</select></label>
      <label class="fld"><span>Количество (г, мл или шт)</span><input name="q" type="number" inputmode="decimal" step="any"></label>
      <label class="fld"><span>Или название</span><input name="name" placeholder="Например, кофе с сахаром"></label>
      <div class="fields"><label class="fld"><span>Калории</span><input name="kcal" type="number" inputmode="numeric"></label>
      <label class="fld"><span>Белок, г</span><input name="p" type="number" inputmode="numeric"></label></div>
      <button class="btn primary wide">Добавить</button>
    </form>`);
};

A.extraSave = (f, form) => {
  const d = form.dataset.d;
  const db = M.db();
  let e;
  if (f.fid && num(f.q)) {
    const food = db.foods[f.fid];
    const n = c.nutrOfRaw([{ f: f.fid, raw: num(f.q) }], db);
    e = { name: `${food.name}, ${num(f.q)} ${c.unitLabel(food)}`, kcal: Math.round(n.kcal), p: Math.round(n.p) };
  } else if (f.name) {
    e = { name: f.name, kcal: num(f.kcal) || 0, p: num(f.p) || 0 };
  } else { toast('Выберите продукт и количество или впишите название'); return; }
  M.saveDay(d, { extras: [...(M.day(d).extras || []), e] });
  closeSheet();
};

A.extraDel = (el) => {
  const d = el.dataset.d;
  const ex = [...(M.day(d).extras || [])];
  const [gone] = ex.splice(Number(el.dataset.i), 1);
  M.saveDay(d, { extras: ex });
  toast(`Удалено: ${gone.name}`, 'Вернуть', () => M.saveDay(d, { extras: [...(M.day(d).extras || []), gone] }));
};
