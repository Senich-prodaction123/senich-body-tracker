// Облако Supabase через обычные HTTP-запросы (без сторонних библиотек).
// Настройки — в config.js (window.SBT_CONFIG = { url, anonKey }), создаётся из .env.

const CFG = window.SBT_CONFIG || {};
const SKEY = 'sbt-session';

export const cloudConfigured = () => Boolean(CFG.url && CFG.anonKey);

let session = null;
try { session = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch { session = null; }

const saveSession = (s) => {
  session = s;
  try { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY); } catch { /* приватный режим */ }
};

export const currentUser = () => (session ? session.user : null);

function fromAuth(j) {
  if (!j || !j.access_token) return null;
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: Date.now() + (j.expires_in || 3600) * 1000,
    user: { id: j.user.id, email: j.user.email },
  };
}

async function authCall(path, body) {
  const r = await fetch(`${CFG.url}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: CFG.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(ruError(j.error_description || j.msg || j.message || j.error || `Ошибка ${r.status}`));
  return j;
}

function ruError(m) {
  const s = String(m);
  if (/Invalid login credentials/i.test(s)) return 'Неверная почта или пароль';
  if (/Email not confirmed/i.test(s)) return 'Почта не подтверждена: откройте письмо от Supabase и нажмите ссылку';
  if (/already registered/i.test(s)) return 'Эта почта уже зарегистрирована, войдите';
  if (/Password should be/i.test(s)) return 'Пароль слишком короткий (минимум 6 символов)';
  if (/rate limit/i.test(s)) return 'Слишком много попыток, подождите минуту';
  return s;
}

export async function signUp(email, password) {
  const j = await authCall('signup', { email, password });
  const s = fromAuth(j);
  if (s) { saveSession(s); return { ok: true }; }
  return { ok: false, confirm: true };
}

export async function signIn(email, password) {
  const s = fromAuth(await authCall('token?grant_type=password', { email, password }));
  saveSession(s);
  return s.user;
}

export async function signOut() {
  try {
    if (session) await fetch(`${CFG.url}/auth/v1/logout`, { method: 'POST', headers: { apikey: CFG.anonKey, Authorization: `Bearer ${session.access_token}` } });
  } catch { /* без сети — просто выходим локально */ }
  saveSession(null);
}

async function refresh() {
  if (!session?.refresh_token) throw new Error('Нет входа');
  const s = fromAuth(await authCall('token?grant_type=refresh_token', { refresh_token: session.refresh_token }));
  saveSession(s);
}

async function rest(path, opts = {}, retry = true) {
  if (!session) throw new Error('Нет входа');
  if (Date.now() > session.expires_at - 60000) await refresh();
  const r = await fetch(`${CFG.url}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: CFG.anonKey,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (r.status === 401 && retry) { await refresh(); return rest(path, opts, false); }
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Облако: ${r.status} ${t.slice(0, 160)}`);
  }
  return r.status === 204 || r.status === 201 ? null : r.json();
}

// Загрузить изменения после момента since (ISO)
export async function pull(since) {
  const q = `bt_records?select=coll,id,data,client_ts,deleted,server_ts&order=server_ts.asc&limit=2000${since ? `&server_ts=gt.${encodeURIComponent(since)}` : ''}`;
  return rest(q, { method: 'GET' });
}

// Отправить записи [{ coll, id, data, client_ts, deleted }]
export async function push(rows) {
  if (!rows.length) return;
  const uid = session.user.id;
  const body = rows.map((r) => ({ ...r, user_id: uid }));
  await rest('bt_records?on_conflict=user_id,coll,id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(body),
  });
}
