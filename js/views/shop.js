import * as M from '../model.js';
import * as c from '../calc.js';
import * as store from '../store.js';
import { CATS } from '../foods.js';
import { A, esc, n0, n1, num, bar, fmtDate, fmtShort, toast, confirmBox, openSheet, closeSheet } from '../ui.js';

const MODES = [{ id: 'day', name: 'День' }, { id: 'week', name: 'Неделя' }, { id: 'month', name: 'Месяц' }];
let mode = 'week';
let starts = {};
try { mode = localStorage.getItem('sbt-shop-mode') || 'week'; } catch { /* без памяти */ }

function defaultStart(m) {
  if (starts[m]) return starts[m];
  if (m === 'month') {
    const s = M.startDate();
    return c.diffDays(s, c.today()) > 25 ? c.today() : s;
  }
  return c.today();
}

const key = () => `${mode}:${defaultStart(mode)}`;
const state = () => ({ have: {}, bought: {}, override: {}, removed: {}, custom: [], ...(store.get('shop', key()) || {}) });
const saveState = (part) => store.put('shop', key(), { ...state(), ...part });
export const prices = () => store.get('prices', 'main') || {};

function costOf(f, fid, qty) {
  const pr = prices()[fid]?.price;
  if (!pr || f.noCount) return null;
  if (c.isLoose(f)) return (qty / f.pack.size) * pr;
  const packs = c.packsOf(f, qty);
  return packs == null ? null : packs * pr;
}

// Примерная стоимость периода (пропорционально, без округления до упаковок)
function periodCost(dates) {
  const db = M.db();
  const { items } = c.shoppingNeeds(M.menu(), db, dates, M.scale());
  let sum = 0, missing = 0;
  for (const [fid, row] of Object.entries(items)) {
    const f = db.foods[fid];
    if (f.noCount) continue;
    const pr = prices()[fid]?.price;
    if (!pr) { missing++; continue; }
    sum += (row.need / f.pack.size) * pr;
  }
  return { sum, missing };
}

function rows() {
  const db = M.db();
  const st = state();
  const dates = c.periodDates(mode, defaultStart(mode));
  const res = c.shoppingNeeds(M.menu(), db, dates, M.scale());
  const list = [];
  for (const [fid, row] of Object.entries(res.items)) {
    const f = db.foods[fid];
    if (st.removed[fid]) continue;
    const auto = c.roundBuy(f, row.need);
    const need = st.override[fid] != null ? st.override[fid] : auto;
    const have = Number(st.have[fid]) || 0;
    const toBuy = Math.max(0, need - have);
    list.push({ fid, f, need, auto, have, toBuy, weeks: row.weeks.map((w) => (w ? c.roundBuy(f, w) : 0)), packs: c.packsOf(f, toBuy), cost: costOf(f, fid, toBuy), bought: Boolean(st.bought[fid]) });
  }
  for (const it of st.custom) {
    list.push({ fid: it.id, custom: it, f: { name: it.name, cat: it.cat || 'other', unit: it.unit || 'g', store: it.store || 'long', pack: null }, need: Number(it.qty) || 0, have: 0, toBuy: Number(it.qty) || 0, packs: null, cost: it.price ? Number(it.price) : null, bought: Boolean(st.bought[it.id]) });
  }
  return { list, dates, warnings: res.warnings, st };
}

function qtyText(r) {
  if (r.f.noCount) return 'если нет дома';
  if (r.custom) return `${n1(r.need)} ${r.custom.unit === 'pcs' ? 'шт' : r.custom.unit === 'ml' ? 'мл' : r.custom.unit || ''}`;
  return c.fmtQty(r.f, r.need);
}

function itemRow(r, opts = {}) {
  const pr = prices()[r.fid]?.price;
  const f = r.f;
  return `<li class="shop-row ${r.bought ? 'bought' : ''}">
    <button class="check ${r.bought ? 'on' : ''}" data-a="shopBought" data-id="${r.fid}" aria-label="Куплено">${r.bought ? '✓' : ''}</button>
    <div class="grow">
      <b>${esc(f.name)}</b>${f.storeNote ? ` <small class="muted">${esc(f.storeNote)}</small>` : ''}
      <div class="sub-row">
        <span>Нужно: <button class="qbtn" data-a="shopQtyEdit" data-id="${r.fid}">${qtyText(r)}</button>${r.need !== r.auto && r.auto != null && !r.custom ? ' <small class="muted">(изменено)</small>' : ''}</span>
        ${!f.noCount && !r.custom ? `<span>Дома: <input class="mini" type="number" inputmode="decimal" step="any" value="${r.have || ''}" placeholder="0" data-c="shopHave" data-id="${r.fid}"> ${c.unitLabel(f)}</span>
        <span class="buy">Купить: <b>${c.fmtQty(f, r.toBuy)}</b>${r.packs != null && r.toBuy > 0 ? ` · ≈ ${r.packs} × ${esc(f.pack.label)}` : ''}</span>` : ''}
        ${opts.weeks ? `<span class="muted">${r.weeks.map((w, i) => (w ? `Нед ${i + 1}: ${c.fmtQty(f, w)}` : '')).filter(Boolean).join(' · ')}</span>` : ''}
      </div>
    </div>
    <div class="price">
      ${f.noCount ? '' : r.custom ? `<span>${r.cost != null ? n0(r.cost) + ' ₸' : ''}</span>` : `<label><input class="mini" type="number" inputmode="numeric" placeholder="цена" value="${pr ?? ''}" data-c="shopPrice" data-id="${r.fid}"><small>₸ за ${esc(f.pack?.label || 'упак.')}</small></label>
      ${r.cost != null ? `<span>${n0(r.cost)} ₸</span>` : ''}`}
    </div>
    <button class="icon-btn" data-a="shopRemove" data-id="${r.fid}" aria-label="Убрать из списка">✕</button>
  </li>`;
}

function groupByCat(list, opts) {
  return CATS.map((cat) => {
    const items = list.filter((r) => (r.f.cat || 'other') === cat.id);
    if (!items.length) return '';
    const sum = items.reduce((s, r) => s + (r.cost || 0), 0);
    return `<div class="shop-cat"><h4>${cat.name}${sum ? `<span>${n0(sum)} ₸</span>` : ''}</h4><ul>${items.sort((a, b) => a.f.name.localeCompare(b.f.name, 'ru')).map((r) => itemRow(r, opts)).join('')}</ul></div>`;
  }).join('');
}

export function render() {
  const start = defaultStart(mode);
  const { list, dates, warnings, st } = rows();
  const countable = list.filter((r) => !r.f.noCount);
  const boughtN = countable.filter((r) => r.bought || r.toBuy === 0).length;
  const pct = countable.length ? Math.round((boughtN / countable.length) * 100) : 0;
  const total = list.reduce((s, r) => s + (r.cost || 0), 0);
  const left = list.filter((r) => !r.bought).reduce((s, r) => s + (r.cost || 0), 0);
  const wk = periodCost(c.range(c.today(), 7));
  const mo = periodCost(c.range(c.today(), 30));
  const removed = Object.keys(st.removed || {});
  const db = M.db();
  const end = dates[dates.length - 1];
  const fullWeeks = Math.floor(dates.length / 7), restDays = dates.length % 7;
  const hist = store.all('purchases').sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);

  return `
  <header class="page-h">
    <div><p class="eyebrow">Список покупок</p><h1>Покупки</h1></div>
    <div class="seg big-seg">${MODES.map((m) => `<button class="${mode === m.id ? 'on' : ''}" data-a="shopMode" data-m="${m.id}">${m.name}</button>`).join('')}</div>
  </header>

  <section class="card shop-head">
    <label class="fld"><span>${mode === 'day' ? 'Дата' : 'Начало периода'}</span><input type="date" value="${start}" data-c="shopStart"></label>
    <p class="muted">${mode === 'day' ? `Меню на ${fmtDate(start)} (${['', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'][c.isoWeekday(start)]})` : `${fmtDate(start)} — ${fmtDate(end)} · ${dates.length} дн.${mode === 'month' ? ` = ${fullWeeks} полных недели меню + ${restDays} дн. (${dates.slice(fullWeeks * 7).map((d) => ['', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'][c.isoWeekday(d)]).join(', ')})` : ''}`}</p>
    <div class="shop-prog"><b>${pct}%</b> куплено ${bar(pct, 100)}</div>
    <div class="shop-sum">
      <div><span class="muted">Эта закупка</span><b>${total ? n0(total) + ' ₸' : '—'}</b>${left && left !== total ? `<em>осталось ${n0(left)} ₸</em>` : ''}</div>
      <div><span class="muted">Неделя питания</span><b>${wk.sum ? '≈ ' + n0(wk.sum) + ' ₸' : '—'}</b>${wk.missing ? `<em>нет цены у ${wk.missing} поз.</em>` : ''}</div>
      <div><span class="muted">Месяц питания</span><b>${mo.sum ? '≈ ' + n0(mo.sum) + ' ₸' : '—'}</b>${mo.missing ? `<em>нет цены у ${mo.missing} поз.</em>` : ''}</div>
    </div>
    <p class="hint">Цены вписываете сами — за упаковку, как на полке. Мясо и крупы пересчитаны из готового веса в сырой, овощи и фрукты — с учётом очистки.</p>
    ${warnings.length ? `<p class="warn-box">${warnings.map(esc).join('<br>')}</p>` : ''}
  </section>

  ${mode === 'month' ? `
    <section class="card"><div class="card-h"><h3>Длительное хранение — можно купить сразу</h3></div>
      <div class="shop-list">${groupByCat(list.filter((r) => r.f.store === 'long'))}</div></section>
    <section class="card"><div class="card-h"><h3>Скоропортящееся — покупать по неделям</h3></div>
      <p class="hint">Не берите мясо, рыбу и молочное сразу на месяц. Мясо и рыбу можно купить на 1–2 недели и заморозить порциями, молочное, хлеб, овощи и фрукты — раз в неделю.</p>
      ${weekPlan(list.filter((r) => r.f.store !== 'long'), dates)}
      <div class="shop-list">${groupByCat(list.filter((r) => r.f.store !== 'long'), { weeks: true })}</div></section>`
    : `<section class="card"><div class="shop-list">${groupByCat(list)}</div></section>`}

  <div class="row wrap gap">
    <button class="btn ghost" data-a="shopAdd">+ Добавить товар</button>
    <button class="btn primary" data-a="shopReset">Завершить закупку и начать новую</button>
  </div>
  ${removed.length ? `<p class="muted small">Убрано из списка: ${removed.map((id) => `<button class="tag" data-a="shopUnremove" data-id="${id}">${esc(db.foods[id]?.name || id)} ↺</button>`).join(' ')}</p>` : ''}

  <section class="card"><div class="card-h"><h3>История закупок</h3></div>
    ${hist.length ? `<ul class="list">${hist.map((h) => `<li><span class="grow">${fmtDate(h.date, true)} · ${esc(MODES.find((m) => m.id === h.mode)?.name || '')}, ${h.items.length} поз.</span><b>${h.total ? n0(h.total) + ' ₸' : '—'}</b></li>`).join('')}</ul>` : '<p class="muted">Здесь появятся завершённые закупки с суммами.</p>'}
  </section>`;
}

function weekPlan(list, dates) {
  const weeks = Math.ceil(dates.length / 7);
  const heads = Array.from({ length: weeks }, (_, i) => {
    const a = dates[i * 7], b = dates[Math.min(dates.length - 1, i * 7 + 6)];
    return `<th>Нед ${i + 1}<br><small>${fmtShort(a)}–${fmtShort(b)}</small></th>`;
  }).join('');
  const body = list.filter((r) => !r.f.noCount && !r.custom).sort((a, b) => a.f.name.localeCompare(b.f.name, 'ru'))
    .map((r) => `<tr><td>${esc(r.f.name)}</td>${Array.from({ length: weeks }, (_, i) => `<td>${r.weeks[i] ? c.fmtQty(r.f, r.weeks[i]) : '—'}</td>`).join('')}</tr>`).join('');
  return `<div class="table-wrap"><table class="tbl"><thead><tr><th>Продукт</th>${heads}</tr></thead><tbody>${body}</tbody></table></div>`;
}

A.shopMode = (el) => {
  mode = el.dataset.m;
  try { localStorage.setItem('sbt-shop-mode', mode); } catch { /* ничего */ }
  window.dispatchEvent(new Event('sbt-render'));
};
A.shopStart = (el) => { if (el.value) { starts[mode] = el.value; window.dispatchEvent(new Event('sbt-render')); } };

A.shopBought = (el) => {
  const st = state();
  saveState({ bought: { ...st.bought, [el.dataset.id]: !st.bought[el.dataset.id] } });
};

A.shopHave = (el) => {
  const st = state();
  const v = num(el.value);
  const have = { ...st.have };
  if (v) have[el.dataset.id] = v; else delete have[el.dataset.id];
  saveState({ have });
};

A.shopPrice = (el) => {
  const all = { ...prices() };
  const v = num(el.value);
  const id = el.dataset.id;
  const prev = all[id] || { history: [] };
  if (v == null) { delete all[id]; } else {
    all[id] = { price: v, at: c.today(), history: [...(prev.history || []).slice(-19), { date: c.today(), price: v }] };
  }
  store.put('prices', 'main', all);
};

A.shopQtyEdit = (el) => {
  const id = el.dataset.id;
  const { list } = rows();
  const r = list.find((x) => x.fid === id);
  if (!r || r.f.noCount) return;
  openSheet(`Количество: ${r.f.name}`, `<form data-f="shopQtySave" data-id="${id}">
    <p class="muted small">${r.custom ? '' : `По меню нужно ${c.fmtQty(r.f, r.auto)}. `}Можно указать своё количество.</p>
    <label class="fld"><span>Нужно, ${r.custom ? (r.custom.unit || '') : c.unitLabel(r.f)}</span><input name="q" type="number" step="any" inputmode="decimal" value="${r.need}"></label>
    <div class="row gap">${r.custom ? '' : '<button type="button" class="btn ghost" data-a="shopQtyAuto" data-id="' + id + '">По меню</button>'}<button class="btn primary grow">Сохранить</button></div></form>`);
};

A.shopQtySave = (f, form) => {
  const id = form.dataset.id;
  const st = state();
  const v = num(f.q);
  if (v == null || v < 0) { toast('Введите число'); return; }
  const cu = st.custom.find((x) => x.id === id);
  if (cu) saveState({ custom: st.custom.map((x) => (x.id === id ? { ...x, qty: v } : x)) });
  else saveState({ override: { ...st.override, [id]: v } });
  closeSheet();
};

A.shopQtyAuto = (el) => {
  const st = state();
  const o = { ...st.override }; delete o[el.dataset.id];
  saveState({ override: o });
  closeSheet();
};

A.shopRemove = (el) => {
  const id = el.dataset.id;
  const st = state();
  if (st.custom.some((x) => x.id === id)) {
    const item = st.custom.find((x) => x.id === id);
    saveState({ custom: st.custom.filter((x) => x.id !== id) });
    toast(`Удалено: ${item.name}`, 'Вернуть', () => saveState({ custom: [...state().custom, item] }));
    return;
  }
  saveState({ removed: { ...st.removed, [id]: true } });
  toast('Убрано из этого списка', 'Вернуть', () => { const s = state(); const r = { ...s.removed }; delete r[id]; saveState({ removed: r }); });
};

A.shopUnremove = (el) => { const s = state(); const r = { ...s.removed }; delete r[el.dataset.id]; saveState({ removed: r }); };

A.shopAdd = () => {
  openSheet('Добавить товар', `<form data-f="shopAddSave">
    <label class="fld"><span>Название</span><input name="name" required placeholder="Например, бумажные полотенца"></label>
    <div class="fields"><label class="fld"><span>Количество</span><input name="qty" type="number" step="any" inputmode="decimal" value="1"></label>
    <label class="fld"><span>Единица</span><select name="unit"><option value="pcs">шт</option><option value="g">г</option><option value="ml">мл</option></select></label></div>
    <label class="fld"><span>Категория</span><select name="cat">${CATS.map((x) => `<option value="${x.id}" ${x.id === 'other' ? 'selected' : ''}>${x.name}</option>`).join('')}</select></label>
    <label class="fld"><span>Цена, ₸ (необязательно)</span><input name="price" type="number" inputmode="numeric"></label>
    <button class="btn primary wide">Добавить</button></form>`);
};

A.shopAddSave = (f) => {
  if (!f.name.trim()) return;
  const st = state();
  const fresh = ['meat', 'fish', 'dairy', 'veg', 'fruit'].includes(f.cat);
  saveState({ custom: [...st.custom, { id: `c${Date.now()}`, name: f.name.trim(), qty: num(f.qty) || 1, unit: f.unit, cat: f.cat, price: num(f.price), store: fresh ? 'fresh' : 'long' }] });
  closeSheet();
};

A.shopReset = async () => {
  const { list } = rows();
  const bought = list.filter((r) => r.bought);
  if (!(await confirmBox(`Завершить закупку? В историю попадёт ${bought.length} куплен. позиций${bought.length ? ` на ${n0(bought.reduce((s, r) => s + (r.cost || 0), 0))} ₸` : ''}. Отметки «куплено» и «дома» сбросятся.`, 'Завершить'))) return;
  const id = `p${Date.now()}`;
  store.put('purchases', id, {
    date: c.today(), mode, start: defaultStart(mode),
    items: bought.map((r) => ({ name: r.f.name, qty: r.custom ? r.need : c.fmtQty(r.f, r.toBuy), cost: r.cost })),
    total: bought.reduce((s, r) => s + (r.cost || 0), 0),
  });
  const st = state();
  saveState({ have: {}, bought: {}, override: st.override, removed: {}, custom: [] });
  toast('Закупка сохранена в историю');
};
