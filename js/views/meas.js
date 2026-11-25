import * as M from '../model.js';
import * as c from '../calc.js';
import * as store from '../store.js';
import { A, esc, n1, num, signed, fmtDate, toast, confirmBox } from '../ui.js';

function form(m, label, date) {
  const v = m || { date: date || c.today(), label: label || 'Дополнительный замер' };
  return `<section class="card">
    <div class="card-h"><h3>${m ? 'Изменить замер' : 'Новый замер'}</h3><a class="link" href="#meas">Отмена</a></div>
    <p class="hint">Мерьте утром натощак, сантиметровой лентой, без затягивания. Пустое поле можно оставить.</p>
    <form data-f="measSave" data-id="${m ? m.id : ''}">
      <div class="fields">
        <label class="fld"><span>Дата</span><input type="date" name="date" value="${v.date}" required></label>
        <label class="fld"><span>Название</span><input name="label" value="${esc(v.label)}"></label>
        ${M.MEAS_FIELDS.map((f) => `<label class="fld"><span>${f.name}</span><div class="inp-u"><input type="number" step="0.1" inputmode="decimal" name="${f.id}" value="${v[f.id] ?? ''}"><em>${f.unit}</em></div></label>`).join('')}
      </div>
      <div class="row gap">
        ${m ? `<button type="button" class="btn ghost danger-t" data-a="measDel" data-id="${m.id}">Удалить</button>` : ''}
        <button class="btn primary grow">Сохранить замер</button>
      </div>
    </form></section>`;
}

const cell = (cur, ref) => {
  if (cur == null || cur === '') return '<td class="muted">—</td>';
  const d = ref != null && ref !== '' ? Number(cur) - Number(ref) : null;
  return `<td><b>${n1(cur)}</b>${d != null && d !== 0 ? `<small class="${d < 0 ? 'good' : 'bad'}">${signed(d)}</small>` : ''}</td>`;
};

export function render(sub, arg, arg2) {
  if (sub === 'new') return form(null, arg ? decodeURIComponent(arg) : '', arg2);
  if (sub === 'edit') { const m = store.get('meas', arg); if (m) return form({ id: arg, ...m }); }

  const all = M.measurements();
  const start = M.startDate();
  const plan = M.CHECKPOINTS.map((k) => {
    const date = c.addDays(start, k);
    const label = `День ${k}`;
    const done = all.find((m) => m.label === label);
    return { k, date, label, done };
  });
  const first = all[0], last = all[all.length - 1];

  return `
  <header class="page-h"><div><p class="eyebrow">Окружности и вес</p><h1>Мои замеры</h1></div>
    <a class="btn primary" href="#meas/new">+ Замер</a></header>

  <section class="card"><div class="card-h"><h3>Контрольные дни</h3></div>
    <div class="checkpoints">
      ${plan.map((p) => `<a class="cp ${p.done ? 'done' : p.date <= c.today() ? 'due' : ''}" href="${p.done ? `#meas/edit/${p.done.id}` : `#meas/new/${encodeURIComponent(p.label)}/${p.date}`}">
        <b>${p.label}</b><span>${fmtDate(p.date)}</span><em>${p.done ? '✓ внесён' : p.date <= c.today() ? 'пора внести' : 'впереди'}</em></a>`).join('')}
    </div>
  </section>

  ${all.length ? `
  <section class="card"><div class="card-h"><h3>Все замеры</h3><span class="muted small">маленькие цифры — разница с предыдущим замером</span></div>
    <div class="table-wrap"><table class="tbl meas-tbl">
      <thead><tr><th>Параметр</th>${all.map((m) => `<th><a href="#meas/edit/${m.id}">${esc(m.label || '')}<br><small>${fmtDate(m.date)}</small></a></th>`).join('')}</tr></thead>
      <tbody>${M.MEAS_FIELDS.map((f) => `<tr><td>${f.name}, ${f.unit}</td>${all.map((m, i) => cell(m[f.id], i ? all[i - 1][f.id] : null)).join('')}</tr>`).join('')}</tbody>
    </table></div>
  </section>

  ${all.length > 1 ? `<section class="card"><div class="card-h"><h3>До / После</h3><span class="muted">${fmtDate(first.date)} → ${fmtDate(last.date)}</span></div>
    <div class="ba">
      ${M.MEAS_FIELDS.map((f) => {
        const a = first[f.id], b = last[f.id];
        if (a == null || a === '' || b == null || b === '') return '';
        const d = b - a;
        const max = Math.max(a, b);
        return `<div class="ba-row"><span>${f.name}</span>
          <div class="ba-bars"><i style="width:${(a / max) * 100}%"></i><i class="now" style="width:${(b / max) * 100}%"></i></div>
          <b>${n1(a)} → ${n1(b)} ${f.unit}</b><em class="${d < 0 ? 'good' : d > 0 ? 'bad' : ''}">${signed(d)}</em></div>`;
      }).join('')}
    </div>
    <p class="hint">Серая полоска — первый замер, лаймовая — последний.</p>
  </section>` : ''}`
    : `<section class="card empty"><p>Начните с замеров Дня 0 — это точка отсчёта.</p><a class="btn primary" href="#meas/new/${encodeURIComponent('День 0')}/${start}">Внести День 0</a></section>`}`;
}

A.measSave = (f, form) => {
  const id = form.dataset.id || `m${Date.now()}`;
  const rec = { date: f.date, label: (f.label || '').trim() || 'Замер', ts: Date.now() };
  let any = false;
  for (const fl of M.MEAS_FIELDS) { const v = num(f[fl.id]); if (v != null) { rec[fl.id] = v; any = true; } }
  if (!any) { toast('Заполните хотя бы один параметр'); return; }
  if (rec.weight && (rec.weight < 30 || rec.weight > 300)) { toast('Проверьте вес: похоже на опечатку'); return; }
  store.put('meas', id, rec);
  if (rec.weight) M.saveDay(rec.date, { weight: rec.weight });
  toast('Замер сохранён');
  location.hash = '#meas';
};

A.measDel = async (el) => {
  if (!(await confirmBox('Удалить этот замер? Его можно будет вернуть сразу после удаления.', 'Удалить', true))) return;
  store.del('meas', el.dataset.id);
  location.hash = '#meas';
  toast('Замер удалён', 'Вернуть', () => store.undoDelete());
};
