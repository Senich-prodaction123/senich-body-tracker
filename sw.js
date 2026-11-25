// Офлайн-режим: приложение открывается без интернета. Данные к облаку не кешируются.
const V = 'sbt-v6';
const FILES = ['./', 'index.html', 'css/app.css', 'config.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-180.png',
  'js/main.js', 'js/store.js', 'js/cloud.js', 'js/model.js', 'js/calc.js', 'js/ui.js', 'js/foods.js', 'js/menu.js',
  'js/views/home.js', 'js/views/day.js', 'js/views/food.js', 'js/views/shop.js', 'js/views/train.js', 'js/views/meas.js', 'js/views/progress.js', 'js/views/settings.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // сначала сеть (чтобы обновления приходили сразу), без сети — из кеша
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((r) => { const copy = r.clone(); caches.open(V).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
