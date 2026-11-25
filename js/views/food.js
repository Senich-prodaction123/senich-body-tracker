import * as M from '../model.js';
import * as c from '../calc.js';
import * as store from '../store.js';
import { BASE_MENU, WD_SHORT, WEEKDAYS } from '../menu.js';
import { A, esc, n0, n1, num, bar, fmtDate, fmtShort, toast, confirmBox, openSheet, closeSheet } from '../ui.js';

let editMode = false;

const clone = (o) => JSON.parse(JSON.stringify(o));

function itemLabel(it, db, sc) {
  const q = c.scaledQty(it, sc, db);
  if (it.r) {
    const r = db.recipes[it.r];
    if (!r) return { name: `Нет рецепта «${it.r}»`, qty: '', warn: true };
    return { name: r.name, qty: r.unit === 'portion' ? `${n1(q)} порц.` : `${n0(q)} г`, recipe: r };
  }
  const f = db.foods[it.f];
  if (!f) return { name: `Нет продукта «${it.f}»`, qty: '', warn: true };
  const form = f.yield && f.yield !== 1 ? (it.form === 'cooked' ? (f.cat === 'grain' ? 'готовой' : 'готового') : f.cat === 'grain' ? 'сухой' : 'сырого') : '';
  return { name: f.name, qty: `${n1(q)} ${c.unitLabel(f)}`, form, f };
}

function mealCard(date, wd, slot, meal, open) {
  const db = M.db();
  const sc = M.scale();
  const d = M.day(date);
  const eaten = Boolean(d.meals?.[slot.id]);
  if (!meal) {
    return `<section class="card meal off" id="m-${slot.id}"><div class="meal-h"><div><span class="t">${slot.time}</span><h3>${slot.name}</h3></div></div>
      <p class="muted">Приём пищи убран из меню — его продукты не попадают в покупки.</p>
      <button class="btn ghost sm" data-a="mealRestore" data-wd="${wd}" data-s="${slot.id}">Вернуть из исходного меню</button></section>`;
  }
  const n = c.mealNutr(meal, db, sc);
  const steps = c.mealSteps(meal, db);
  const q = encodeURIComponent(`${meal.name} рецепт с фото`);
  return `<section class="card meal ${eaten ? 'eaten' : ''}" id="m-${slot.id}">
    <div class="meal-h">
      <div class="grow"><span class="t">${esc(meal.time || slot.time)} · ${slot.name}</span>
        ${editMode ? `<input class="name-inp" data-c="mealName" data-wd="${wd}" data-s="${slot.id}" value="${esc(meal.name)}">` : `<h3>${esc(meal.name)}</h3>`}
      </div>
      <div class="meal-n"><b>${n0(n.kcal)}</b><span>ккал</span><b>${n0(n.p)}</b><span>г белка</span></div>
      <button class="check big ${eaten ? 'on' : ''}" data-a="meal" data-d="${date}" data-s="${slot.id}" aria-label="Съедено">${eaten ? '✓' : ''}</button>
    </div>
    <ul class="ing">
      ${meal.items.map((it, i) => {
        const L = itemLabel(it, db, sc);
        const nn = c.itemNutr(it, db, sc);
        if (editMode) {
          const shown = c.scaledQty(it, sc, db);
          return `<li class="edit"><span class="grow ${L.warn ? 'warn' : ''}">${esc(L.name)}</span>
            <input type="number" inputmode="decimal" step="any" class="q-inp" value="${shown}" data-c="itemQty" data-wd="${wd}" data-s="${slot.id}" data-i="${i}">
            <span class="u">${L.recipe ? (L.recipe.unit === 'portion' ? 'порц.' : 'г') : L.f ? c.unitLabel(L.f) : ''}</span>
            ${L.f && L.f.yield && L.f.yield !== 1 ? `<button class="tag" data-a="itemForm" data-wd="${wd}" data-s="${slot.id}" data-i="${i}">${L.form}</button>` : ''}
            ${L.recipe ? `<button class="tag" data-a="recipeEdit" data-r="${it.r}">состав</button>` : ''}
            <button class="icon-btn" data-a="itemDel" data-wd="${wd}" data-s="${slot.id}" data-i="${i}" aria-label="Удалить">✕</button></li>`;
        }
        return `<li><span class="grow ${L.warn ? 'warn' : ''}">${esc(L.name)}${L.form ? ` <small class="muted">${L.form}</small>` : ''}</span>
          <span class="qty">${L.qty}</span><span class="kc">${n0(nn.kcal)} ккал · ${n1(nn.p)} г</span></li>`;
      }).join('')}
    </ul>
    ${editMode ? `<div class="row wrap gap sm-gap">
        <button class="btn ghost sm" data-a="itemAdd" data-wd="${wd}" data-s="${slot.id}">+ Продукт</button>
        <label class="row gap sm-gap muted small">Время <input type="time" value="${esc(meal.time || slot.time)}" data-c="mealTime" data-wd="${wd}" data-s="${slot.id}" class="time-inp"></label>
        <button class="btn ghost sm danger-t" data-a="mealDel" data-wd="${wd}" data-s="${slot.id}">Убрать приём пищи</button></div>` : ''}
    <details class="recipe" ${open ? 'open' : ''}><summary>Как приготовить</summary>
      ${meal.items.filter((it) => it.r && db.recipes[it.r]).map((it) => {
        const r = db.recipes[it.r];
        const k = c.scaledQty(it, sc, db) / r.portion;
        return `<p class="small"><b>${esc(r.name)}</b> — состав: ${r.items.filter((x) => db.foods[x.f]).map((x) => { const f = db.foods[x.f]; return f.noCount ? f.name.toLowerCase() : `${f.name.toLowerCase()} ${n1(f.unit === 'pcs' ? Math.round(x.q * k * 2) / 2 : Math.round(x.q * k))} ${c.unitLabel(f)}`; }).join(', ')}.</p>`;
      }).join('')}
      ${steps.length ? `<ol>${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : '<p class="muted small">Готовить не нужно — просто выложить на тарелку.</p>'}
      <a class="btn ghost sm" href="https://www.google.com/search?q=${q}" target="_blank" rel="noopener">Посмотреть похожий рецепт с фото ↗</a>
    </details>
  </section>`;
}

export function render(date = c.today(), focus = '') {
  const t = M.T();
  const db = M.db();
  const sc = M.scale();
  const wd = c.isoWeekday(date);
  const mon = c.mondayOf(date);
  const menu = M.menu();
  const dayN = c.dayNutr(menu[wd], db, sc);
  const tot = M.dayTotals(date);
  const avg = c.menuAvg(menu, db, sc);
  const p = M.profile();

  return `
  <header class="page-h">
    <div><p class="eyebrow">Моё питание</p><h1>${WEEKDAYS[wd]} <span class="muted">${fmtDate(date)}</span></h1></div>
    <button class="btn ${editMode ? 'primary' : 'ghost'} sm" data-a="toggleEdit">${editMode ? 'Готово' : 'Изменить меню'}</button>
  </header>
  <nav class="week-chips">
    ${c.range(mon, 7).map((d, i) => `<a href="#food/${d}" class="${d === date ? 'on' : ''} ${d === c.today() ? 'today' : ''}"><b>${WD_SHORT[i + 1]}</b><span>${fmtShort(d)}</span></a>`).join('')}
  </nav>
  <div class="row gap end sm-gap"><a class="link small" href="#food/${c.addDays(mon, -7)}">← прошлая неделя</a><a class="link small" href="#food/${c.addDays(mon, 7)}">следующая →</a></div>

  <section class="card nutr-sum">
    <div><span class="muted">Съедено за день</span><b>${n0(tot.kcal)} <small>ккал</small></b>${bar(tot.kcal, t.kcalRange[1])}<em>ориентир ${t.kcalRange[0]}–${t.kcalRange[1]} · по меню ${n0(dayN.kcal)}</em></div>
    <div><span class="muted">Белок</span><b>${n0(tot.p)} <small>г</small></b>${bar(tot.p, t.protein[1])}<em>ориентир ${t.protein[0]}–${t.protein[1]} · по меню ${n0(dayN.p)}</em></div>
    <div><span class="muted">Осталось до ориентира</span><b>${n0(Math.max(0, t.kcalRange[0] - tot.kcal))} <small>ккал</small></b><em>белка ещё ${n0(Math.max(0, t.protein[0] - tot.p))} г · окно 09:00–19:30</em></div>
  </section>
  <p class="hint">Это ориентиры. Наелись раньше — не доедайте ради цифры.
  ${sc !== 1 ? ` Порции подстроены под вашу норму: ×${n1(sc)}.` : ''}
  В среднем меню даёт ${n0(avg.kcal)} ккал и ${n0(avg.p)} г белка в день.</p>
  ${editMode ? '<p class="hint lime">Режим правки: меняйте граммы, нажмите на «сырого/готового», чтобы переключить вес. Всё сразу пересчитывается — калории, белок и покупки.</p>' : ''}

  ${M.MEAL_SLOTS.map((s) => mealCard(date, wd, s, menu[wd]?.[s.id], focus === s.id)).join('')}

  ${M.menuEdited() ? `<div class="row end"><button class="btn ghost sm" data-a="menuReset">Вернуть исходное меню</button></div>` : ''}
  ${p ? '' : ''}`;
}

function editMenu(fn) {
  const days = clone(M.menu());
  fn(days);
  M.setMenu(days);
}

A.toggleEdit = () => { editMode = !editMode; window.dispatchEvent(new Event('sbt-render')); };

A.itemQty = (el) => {
  const v = num(el.value);
  if (v == null || v < 0) return;
  const sc = M.scale();
  editMenu((days) => { const it = days[el.dataset.wd][el.dataset.s].items[el.dataset.i]; it.q = Math.round((v / sc) * 100) / 100; });
};

A.itemForm = (el) => editMenu((days) => {
  const it = days[el.dataset.wd][el.dataset.s].items[el.dataset.i];
  it.form = it.form === 'cooked' ? 'raw' : 'cooked';
});

A.itemDel = (el) => {
  const { wd, s, i } = el.dataset;
  const before = clone(M.menu());
  editMenu((days) => days[wd][s].items.splice(Number(i), 1));
  toast('Продукт убран из меню', 'Вернуть', () => M.setMenu(before));
};

A.mealName = (el) => editMenu((days) => { days[el.dataset.wd][el.dataset.s].name = el.value.trim() || days[el.dataset.wd][el.dataset.s].name; });
A.mealTime = (el) => editMenu((days) => { days[el.dataset.wd][el.dataset.s].time = el.value; });

A.mealDel = async (el) => {
  const { wd, s } = el.dataset;
  if (!(await confirmBox('Убрать этот приём пищи из меню? Его продукты исчезнут из списка покупок. Вернуть можно в любой момент.', 'Убрать', true))) return;
  editMenu((days) => { days[wd][s] = null; });
};

A.mealRestore = (el) => editMenu((days) => { days[el.dataset.wd][el.dataset.s] = clone(BASE_MENU[el.dataset.wd][el.dataset.s]); });

A.menuReset = async () => {
  if (!(await confirmBox('Вернуть исходное меню? Ваши правки меню будут заменены. Дневник, замеры и покупки не пострадают.', 'Вернуть', true))) return;
  const before = clone(M.menu());
  store.put('menu', 'main', { days: clone(BASE_MENU) });
  toast('Исходное меню возвращено', 'Отменить', () => M.setMenu(before));
};

A.itemAdd = (el) => {
  const db = M.db();
  const opts = Object.entries(db.foods).filter(([, f]) => !f.noCount).sort((a, b) => a[1].name.localeCompare(b[1].name, 'ru'))
    .map(([id, f]) => `<option value="f:${id}">${esc(f.name)} (${c.unitLabel(f)})</option>`).join('');
  const ropts = Object.entries(db.recipes).map(([id, r]) => `<option value="r:${id}">Блюдо: ${esc(r.name)}</option>`).join('');
  openSheet('Добавить продукт', `<form data-f="itemAddSave" data-wd="${el.dataset.wd}" data-s="${el.dataset.s}">
    <label class="fld"><span>Продукт</span><select name="id" required>${opts}${ropts}</select></label>
    <label class="fld"><span>Количество</span><input name="q" type="number" inputmode="decimal" step="any" required></label>
    <label class="fld"><span>Вес указан</span><select name="form"><option value="cooked">готовый (для круп, мяса, рыбы)</option><option value="raw">сырой / сухой</option></select></label>
    <p class="muted small">Нет нужного продукта? Добавьте его в Настройках → База продуктов.</p>
    <button class="btn primary wide">Добавить</button></form>`);
};

A.itemAddSave = (f, form) => {
  const [kind, id] = f.id.split(':');
  const q = num(f.q);
  if (!q) { toast('Укажите количество'); return; }
  const sc = M.scale();
  editMenu((days) => {
    const item = kind === 'r' ? { r: id, q: q / sc } : { f: id, q: q / sc, form: f.form };
    days[form.dataset.wd][form.dataset.s].items.push(item);
  });
  closeSheet();
};

A.recipeEdit = (el) => {
  const db = M.db();
  const r = db.recipes[el.dataset.r];
  openSheet(`Рецепт: ${r.name}`, `<form data-f="recipeSave" data-r="${el.dataset.r}">
    <p class="muted small">Состав на одну порцию ${r.unit === 'portion' ? '' : `${r.portion} г готового блюда`}. Вес — сырой или сухой.</p>
    ${r.items.map((it, i) => { const f = db.foods[it.f]; return f.noCount ? '' : `<label class="fld row-fld"><span>${esc(f.name)}</span><div class="inp-u"><input name="q${i}" type="number" step="any" inputmode="decimal" value="${it.q}"><em>${c.unitLabel(f)}</em></div></label>`; }).join('')}
    <label class="fld"><span>Как готовить (каждый шаг с новой строки)</span><textarea name="steps" rows="5">${esc(r.steps.join('\n'))}</textarea></label>
    <button class="btn primary wide">Сохранить рецепт</button></form>`);
};

A.recipeSave = (f, form) => {
  const id = form.dataset.r;
  const r = clone(M.db().recipes[id]);
  r.items.forEach((it, i) => { if (f[`q${i}`] != null && num(f[`q${i}`]) != null) it.q = num(f[`q${i}`]); });
  r.steps = String(f.steps || '').split('\n').map((s) => s.trim()).filter(Boolean);
  store.put('recipes', id, r);
  closeSheet();
  toast('Рецепт сохранён — калории и покупки пересчитаны');
};
