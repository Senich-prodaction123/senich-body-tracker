// Хранилище: всё пишется на устройство сразу (localStorage), а при входе в аккаунт —
// ещё и в облако Supabase. Правило при конфликте: побеждает более поздняя правка.
import * as cloud from './cloud.js';

const listeners = new Set();
let ns = 'local';
let db = { recs: {}, dirty: {}, lastPull: null };
let syncTimer = null;
let pushTimer = null;
let lastDeleted = null;
export const sync = { status: 'local', message: '', at: null };

const key = () => `sbt:${ns}`;

function load() {
  try { db = JSON.parse(localStorage.getItem(key()) || 'null') || { recs: {}, dirty: {}, lastPull: null }; }
  catch { db = { recs: {}, dirty: {}, lastPull: null }; }
}

function persist() {
  try {
    localStorage.setItem(key(), JSON.stringify(db));
    snapshotDaily();
  } catch (e) {
    sync.message = 'Не удалось сохранить на устройстве: ' + e.message;
  }
}

// Резервная копия на устройстве раз в день, храним 7 последних
function snapshotDaily() {
  const d = new Date().toISOString().slice(0, 10);
  const k = `sbt-snap:${ns}:${d}`;
  if (localStorage.getItem(k)) return;
  localStorage.setItem(k, JSON.stringify(db.recs));
  const old = Object.keys(localStorage).filter((x) => x.startsWith(`sbt-snap:${ns}:`)).sort();
  while (old.length > 7) localStorage.removeItem(old.shift());
}

export function localSnapshots() {
  return Object.keys(localStorage).filter((x) => x.startsWith(`sbt-snap:${ns}:`)).sort().reverse()
    .map((k) => ({ key: k, date: k.split(':').pop() }));
}

const emit = (why) => listeners.forEach((fn) => fn(why));
export const onChange = (fn) => listeners.add(fn);

// ---------- чтение ----------
export function get(coll, id) {
  const r = db.recs[coll]?.[id];
  return r && !r.del ? r.data : undefined;
}

export function all(coll) {
  const c = db.recs[coll] || {};
  return Object.entries(c).filter(([, r]) => !r.del).map(([id, r]) => ({ id, ...r.data }));
}

// ---------- запись ----------
export function put(coll, id, data) {
  (db.recs[coll] ||= {})[id] = { data, ts: Date.now(), del: false };
  db.dirty[`${coll}/${id}`] = true;
  persist();
  emit('local');
  schedulePush();
}

export function patch(coll, id, part) {
  put(coll, id, { ...(get(coll, id) || {}), ...part });
}

export function del(coll, id) {
  const r = db.recs[coll]?.[id];
  if (!r) return;
  lastDeleted = { coll, id, data: r.data };
  r.del = true; r.ts = Date.now();
  db.dirty[`${coll}/${id}`] = true;
  persist();
  emit('local');
  schedulePush();
}

export function undoDelete() {
  if (!lastDeleted) return false;
  put(lastDeleted.coll, lastDeleted.id, lastDeleted.data);
  lastDeleted = null;
  return true;
}

// ---------- резервная копия ----------
export function exportAll() {
  const out = {};
  for (const [c, recs] of Object.entries(db.recs)) {
    out[c] = {};
    for (const [id, r] of Object.entries(recs)) if (!r.del) out[c][id] = r.data;
  }
  return { app: 'SENICH BODY TRACKER', version: 1, exportedAt: new Date().toISOString(), data: out };
}

export function importAll(json) {
  if (!json || json.app !== 'SENICH BODY TRACKER' || !json.data) throw new Error('Это не файл резервной копии SENICH BODY TRACKER');
  for (const [c, recs] of Object.entries(json.data)) for (const [id, data] of Object.entries(recs)) put(c, id, data);
}

export function restoreSnapshot(k) {
  const recs = JSON.parse(localStorage.getItem(k) || 'null');
  if (!recs) throw new Error('Копия не найдена');
  for (const [c, rr] of Object.entries(recs)) for (const [id, r] of Object.entries(rr)) if (!r.del) put(c, id, r.data);
}

// ---------- аккаунт и синхронизация ----------
export function init() {
  const u = cloud.currentUser();
  ns = u ? u.id : 'local';
  load();
  sync.status = u ? 'idle' : cloud.cloudConfigured() ? 'signed-out' : 'local';
  if (u) startSync();
}

export function hasLocalData() {
  try {
    const l = JSON.parse(localStorage.getItem('sbt:local') || 'null');
    return Boolean(l && Object.values(l.recs || {}).some((c) => Object.keys(c).length));
  } catch { return false; }
}

// После входа: переключаемся на пространство аккаунта; при желании переносим данные с устройства.
export async function afterLogin(moveLocal) {
  const u = cloud.currentUser();
  ns = u.id;
  load();
  if (moveLocal) {
    const l = JSON.parse(localStorage.getItem('sbt:local') || 'null');
    if (l) {
      for (const [c, recs] of Object.entries(l.recs)) {
        for (const [id, r] of Object.entries(recs)) {
          const mine = db.recs[c]?.[id];
          if (!mine || mine.ts < r.ts) { (db.recs[c] ||= {})[id] = r; db.dirty[`${c}/${id}`] = true; }
        }
      }
      persist();
    }
  }
  emit('local');
  startSync();
  await syncNow();
}

export async function logout() {
  await syncNow().catch(() => {});
  await cloud.signOut();
  stopSync();
  ns = 'local';
  load();
  sync.status = 'signed-out';
  emit('local');
}

function schedulePush() {
  if (!cloud.currentUser()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => syncNow(), 800);
}

function startSync() {
  stopSync();
  syncTimer = setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, 15000);
}
function stopSync() { clearInterval(syncTimer); syncTimer = null; }

let running = null;
let netRetries = 0;
export function syncNow() {
  if (!cloud.currentUser()) return Promise.resolve();
  if (running) return running;
  running = (async () => {
    sync.status = 'syncing'; emit('sync');
    try {
      // 1. отправляем свои изменения
      const keys = Object.keys(db.dirty);
      const rows = keys.map((k) => {
        const [c, ...rest] = k.split('/');
        const id = rest.join('/');
        const r = db.recs[c]?.[id];
        return r ? { coll: c, id, data: r.data, client_ts: r.ts, deleted: !!r.del } : null;
      }).filter(Boolean);
      for (let i = 0; i < rows.length; i += 200) await cloud.push(rows.slice(i, i + 200));
      for (const k of keys) delete db.dirty[k];
      // 2. забираем чужие (с другого устройства) с запасом 2 минуты
      const since = db.lastPull ? new Date(new Date(db.lastPull).getTime() - 120000).toISOString() : null;
      const got = await cloud.pull(since);
      let changed = false;
      for (const row of got || []) {
        const mine = db.recs[row.coll]?.[row.id];
        if (!mine || Number(row.client_ts) > mine.ts) {
          (db.recs[row.coll] ||= {})[row.id] = { data: row.data, ts: Number(row.client_ts), del: row.deleted };
          changed = true;
        }
        if (!db.lastPull || row.server_ts > db.lastPull) db.lastPull = row.server_ts;
      }
      persist();
      sync.status = 'ok'; sync.message = ''; sync.at = new Date(); netRetries = 0;
      if (changed) emit('remote');
    } catch (e) {
      // Сетевой сбой (iPhone при открытии приложения ещё не поднял интернет): тихо повторяем, ошибку не показываем.
      const netFail = e instanceof TypeError;
      if (netFail && netRetries < 3) {
        netRetries += 1;
        sync.status = 'syncing';
        setTimeout(() => syncNow(), 3000);
      } else {
        sync.status = netFail || !navigator.onLine ? 'offline' : 'error';
        sync.message = sync.status === 'offline' ? 'Нет связи с облаком — данные сохранены на устройстве и уйдут позже' : e.message;
      }
    } finally {
      running = null;
      emit('sync');
    }
  })();
  return running;
}

export const pendingCount = () => Object.keys(db.dirty).length;

window.addEventListener('online', () => syncNow());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
