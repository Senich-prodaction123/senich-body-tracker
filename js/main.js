import * as store from './store.js';
import * as cloud from './cloud.js';
import * as M from './model.js';
import { A, svgIcon, openSheet, closeSheet, esc } from './ui.js';
import * as home from './views/home.js';
import * as dayV from './views/day.js';
import * as food from './views/food.js';
import * as shop from './views/shop.js';
import * as train from './views/train.js';
import * as meas from './views/meas.js';
import * as progress from './views/progress.js';
import * as settings from './views/settings.js';

const NAV = [
  { id: 'home', name: 'Главная', icon: 'home' },
  { id: 'day', name: 'Мой день', icon: 'day' },
  { id: 'food', name: 'Питание', icon: 'food' },
  { id: 'shop', name: 'Покупки', icon: 'shop' },
  { id: 'train', name: 'Тренировки', icon: 'train' },
  { id: 'meas', name: 'Замеры', icon: 'meas' },
  { id: 'progress', name: 'Мой прогресс', icon: 'progress' },
  { id: 'settings', name: 'Настройки', icon: 'settings' },
];
const MOBILE = ['home', 'day', 'food', 'shop'];

const main = document.getElementById('main');
const side = document.getElementById('side');
const tabs = document.getElementById('tabs');

const route = () => {
  const [name, ...args] = location.hash.replace(/^#/, '').split('/');
  return { name: NAV.some((n) => n.id === name) ? name : 'home', args };
};

function syncDot() {
  const s = store.sync;
  const u = cloud.currentUser();
  const cls = !u ? 'local' : s.status === 'ok' ? 'ok' : s.status === 'syncing' ? 'busy' : s.status === 'error' ? 'bad' : 'idle';
  const text = !u ? 'на устройстве' : { ok: 'в облаке', busy: 'синхронизация', bad: 'ошибка облака', idle: 'облако' }[cls] || 'облако';
  return `<a href="#settings" class="sync ${cls}" title="${esc(s.message || text)}"><i></i>${text}</a>`;
}

function renderNav(r) {
  side.innerHTML = `<div class="brand">SENICH<span>BODY TRACKER</span></div>
    <nav>${NAV.map((n) => `<a href="#${n.id}" class="${r.name === n.id ? 'on' : ''}">${svgIcon(n.icon)}<span>${n.name}</span></a>`).join('')}</nav>
    <div class="side-foot" id="syncSide">${syncDot()}</div>`;
  const moreOn = !MOBILE.includes(r.name);
  tabs.innerHTML = MOBILE.map((id) => { const n = NAV.find((x) => x.id === id); return `<a href="#${id}" class="${r.name === id ? 'on' : ''}">${svgIcon(n.icon)}<span>${n.name}</span></a>`; }).join('')
    + `<button class="${moreOn ? 'on' : ''}" data-a="more">${svgIcon('more')}<span>Ещё</span></button>`;
}

let pending = false;
function render() {
  pending = false;
  const r = route();
  document.body.classList.toggle('onboarding', !M.hasProfile());
  if (!M.hasProfile()) {
    side.innerHTML = ''; tabs.innerHTML = '';
    main.innerHTML = settings.onboarding();
    return;
  }
  renderNav(r);
  const [a, b, c2] = r.args;
  let html;
  try {
    switch (r.name) {
      case 'day': html = dayV.render(a || undefined); break;
      case 'food': html = food.render(a || undefined, b); break;
      case 'shop': html = shop.render(); break;
      case 'train': html = train.render(a, b); break;
      case 'meas': html = meas.render(a, b, c2); break;
      case 'progress': html = progress.render(); break;
      case 'settings': html = settings.render(); break;
      default: html = home.render();
    }
  } catch (e) {
    console.error(e);
    html = `<section class="card"><h3>Что-то пошло не так</h3><p class="muted">${esc(e.message)}</p><p class="muted small">Данные целы. Попробуйте обновить страницу.</p></section>`;
  }
  main.innerHTML = `<div class="topbar">${syncDot()}</div>${html}`;
  if (r.name === 'food' && b) document.getElementById(`m-${b}`)?.scrollIntoView({ block: 'start' });
}

const typing = () => {
  const el = document.activeElement;
  return el && main.contains(el) && /INPUT|TEXTAREA|SELECT/.test(el.tagName) && el.type !== 'checkbox';
};

store.onChange((why) => {
  if (why === 'sync') {
    document.querySelectorAll('.sync').forEach((x) => (x.outerHTML = syncDot()));
    if (route().name !== 'settings') return;
  }
  if (typing() && why !== 'local') { pending = true; return; }
  render();
});
document.addEventListener('focusout', () => setTimeout(() => { if (pending && !typing()) render(); }, 50));

window.addEventListener('hashchange', () => { closeSheet(); render(); window.scrollTo(0, 0); });
window.addEventListener('sbt-render', render);

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]');
  if (!el || el.tagName === 'INPUT') return;
  e.preventDefault();
  try { A[el.dataset.a]?.(el, e); } catch (err) { console.error(err); }
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-c]');
  if (el) A[el.dataset.c]?.(el, e);
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-f]');
  if (!f) return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(f));
  A[f.dataset.f]?.(data, f, e);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

A.more = () => {
  openSheet('Разделы', `<nav class="more-nav">${NAV.filter((n) => !MOBILE.includes(n.id)).map((n) => `<a href="#${n.id}">${svgIcon(n.icon)}<span>${n.name}</span></a>`).join('')}</nav>`);
};

store.init();
render();
if (cloud.currentUser()) store.syncNow();

if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !/localhost|127\.0\.0\.1/.test(location.hostname)) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
