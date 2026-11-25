// Общие помощники интерфейса: экранирование, графики, шторка, подтверждение, уведомления.

export const A = {}; // реестр действий: data-a (клик), data-c (изменение), data-f (форма)

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const n0 = (v) => (v == null || Number.isNaN(v) ? '—' : Math.round(v).toLocaleString('ru-RU'));
export const n1 = (v) => (v == null || Number.isNaN(v) ? '—' : (Math.round(v * 10) / 10).toLocaleString('ru-RU'));
export const signed = (v, d = 1) => {
  if (v == null || Number.isNaN(v)) return '—';
  const r = Math.round(v * 10 ** d) / 10 ** d;
  return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toLocaleString('ru-RU');
};
export const num = (v) => { if (v === '' || v == null) return null; const x = Number(String(v).replace(',', '.')); return Number.isFinite(x) ? x : null; };

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const fmtDate = (s, withYear = false) => {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}${withYear ? ' ' + y : ''}`;
};
export const fmtShort = (s) => { const [, m, d] = s.split('-'); return `${d}.${m}`; };

export const bar = (v, max, cls = '') => {
  const pct = max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)) : 0;
  return `<div class="bar ${cls}"><i style="width:${pct}%"></i></div>`;
};

export function ring(v, max, label, sub) {
  const pct = max > 0 ? Math.max(0, Math.min(1, v / max)) : 0;
  const r = 34, c = 2 * Math.PI * r;
  return `<div class="ring"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="${r}" class="ring-bg"/><circle cx="40" cy="40" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/></svg><div class="ring-t"><b>${label}</b><span>${sub}</span></div></div>`;
}

// ---------- графики (SVG) ----------
// points: [{ x: подпись, y: число|null }]
export function lineChart(points, { unit = '', target = null, h = 180, digits = 1, area = true } = {}) {
  const vals = points.map((p) => p.y).filter((y) => y != null);
  if (vals.length < 1) return `<div class="empty-chart">Пока нет данных. Внесите первое значение — график появится здесь.</div>`;
  const W = 600, H = h, L = 44, R = 12, T = 14, B = 26;
  let min = Math.min(...vals, target ?? Infinity), max = Math.max(...vals, target ?? -Infinity);
  if (min === max) { min -= 1; max += 1; }
  const padv = (max - min) * 0.12; min -= padv; max += padv;
  const X = (i) => L + (points.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1));
  const Y = (v) => T + ((max - v) * (H - T - B)) / (max - min);
  const pts = points.map((p, i) => (p.y == null ? null : [X(i), Y(p.y), p])).filter(Boolean);
  const path = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
  const areaPath = pts.length > 1 ? `${path} L${pts[pts.length - 1][0]},${H - B} L${pts[0][0]},${H - B} Z` : '';
  const ticks = [max - padv, (max + min) / 2, min + padv];
  const every = Math.max(1, Math.ceil(points.length / 7));
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">
    ${ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/><text x="${L - 8}" y="${Y(t) + 4}" class="ax" text-anchor="end">${n1(t)}</text>`).join('')}
    ${target != null ? `<line x1="${L}" x2="${W - R}" y1="${Y(target)}" y2="${Y(target)}" class="tgt"/>` : ''}
    ${area && areaPath ? `<path d="${areaPath}" class="area"/>` : ''}
    <path d="${path}" class="line"/>
    ${pts.map((q) => `<circle cx="${q[0]}" cy="${q[1]}" r="3.5" class="dot"><title>${esc(q[2].x)}: ${n1(q[2].y)} ${unit}</title></circle>`).join('')}
    ${points.map((p, i) => (i % every === 0 || i === points.length - 1 ? `<text x="${X(i)}" y="${H - 6}" class="ax" text-anchor="middle">${esc(p.x)}</text>` : '')).join('')}
  </svg>`;
}

export function barChart(points, { h = 160, target = null, unit = '' } = {}) {
  const vals = points.map((p) => p.y || 0);
  if (!vals.some((v) => v > 0)) return `<div class="empty-chart">Пока нет данных.</div>`;
  const W = 600, H = h, L = 36, R = 8, T = 12, B = 26;
  const max = Math.max(...vals, target || 0) * 1.12 || 1;
  const bw = (W - L - R) / points.length;
  const Y = (v) => T + ((max - v) * (H - T - B)) / max;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">
    ${target ? `<line x1="${L}" x2="${W - R}" y1="${Y(target)}" y2="${Y(target)}" class="tgt"/>` : ''}
    ${points.map((p, i) => {
      const x = L + i * bw + bw * 0.18, w = bw * 0.64, y = Y(p.y || 0);
      return `<rect x="${x}" y="${y}" width="${w}" height="${H - B - y}" rx="4" class="${p.y ? 'barf' : 'bar0'}"><title>${esc(p.x)}: ${n1(p.y)} ${unit}</title></rect>
      <text x="${x + w / 2}" y="${H - 6}" class="ax" text-anchor="middle">${esc(p.x)}</text>
      ${p.y ? `<text x="${x + w / 2}" y="${y - 5}" class="ax val" text-anchor="middle">${n1(p.y)}</text>` : ''}`;
    }).join('')}
  </svg>`;
}

// ---------- шторка, подтверждение, уведомление ----------
export function openSheet(title, html) {
  const s = document.getElementById('sheet');
  s.innerHTML = `<div class="sheet-bg" data-a="sheetClose"></div><div class="sheet-card" role="dialog" aria-label="${esc(title)}">
    <div class="sheet-head"><h3>${esc(title)}</h3><button class="icon-btn" data-a="sheetClose" aria-label="Закрыть">✕</button></div>
    <div class="sheet-body">${html}</div></div>`;
  s.classList.add('on');
  document.body.classList.add('noscroll');
  setTimeout(() => s.querySelector('input:not([type=checkbox]),select,textarea')?.focus({ preventScroll: true }), 60);
}
export function closeSheet() {
  const s = document.getElementById('sheet');
  s.classList.remove('on'); s.innerHTML = '';
  document.body.classList.remove('noscroll');
}
A.sheetClose = () => closeSheet();

let confirmResolve = null;
export function confirmBox(text, ok = 'Да', danger = false) {
  return new Promise((res) => {
    confirmResolve = res;
    openSheet('Подтвердите', `<p class="lead">${esc(text)}</p><div class="row gap end">
      <button class="btn ghost" data-a="confirmNo">Отмена</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" data-a="confirmYes">${esc(ok)}</button></div>`);
  });
}
A.confirmYes = () => { closeSheet(); confirmResolve?.(true); confirmResolve = null; };
A.confirmNo = () => { closeSheet(); confirmResolve?.(false); confirmResolve = null; };

let toastTimer = null;
let toastAction = null;
export function toast(text, actionLabel, action) {
  const t = document.getElementById('toast');
  toastAction = action || null;
  t.innerHTML = `<span>${esc(text)}</span>${actionLabel ? `<button data-a="toastAct">${esc(actionLabel)}</button>` : ''}`;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), actionLabel ? 6000 : 2600);
}
A.toastAct = () => { document.getElementById('toast').classList.remove('on'); toastAction?.(); toastAction = null; };

export function download(name, text, type = 'text/plain') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export const csv = (rows) => '﻿' + rows.map((r) => r.map((v) => {
  const s = String(v ?? '');
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}).join(';')).join('\n');

export const icon = {
  home: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  day: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
  food: '<path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M17 3c-2 1-3 3.5-3 7h3v11"/>',
  shop: '<path d="M4 5h2l2 11h10l2-8H7"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="16.5" cy="19.5" r="1.3"/>',
  train: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  meas: '<path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>',
  progress: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
};
export const svgIcon = (name) => `<svg viewBox="0 0 24 24" class="ic" aria-hidden="true">${icon[name] || ''}</svg>`;
