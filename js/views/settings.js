import * as M from '../model.js';
import * as c from '../calc.js';
import * as store from '../store.js';
import * as cloud from '../cloud.js';
import { CATS } from '../foods.js';
import { A, esc, n0, n1, num, fmtDate, toast, confirmBox, openSheet, closeSheet, download } from '../ui.js';

function profileForm(onboarding) {
  const p = { ...M.DEFAULT_PROFILE, ...(M.profile() || {}) };
  const t = c.targets(p, onboarding ? p.startWeight : M.currentWeight());
  const autoScale = c.autoScale(M.menu(), M.db(), t.kcal);
  return `<form data-f="profileSave" class="card">
    <div class="card-h"><h3>${onboarding ? 'Ваши данные' : 'Профиль и цели'}</h3></div>
    <div class="fields">
      <label class="fld"><span>Имя</span><input name="name" value="${esc(p.name)}" placeholder="Как к вам обращаться"></label>
      <div class="fld"><span>Пол</span><div class="seg"><label><input type="radio" name="sex" value="m" ${p.sex !== 'f' ? 'checked' : ''}><b>Мужчина</b></label><label><input type="radio" name="sex" value="f" ${p.sex === 'f' ? 'checked' : ''}><b>Женщина</b></label></div></div>
      <label class="fld"><span>Возраст</span><div class="inp-u"><input name="age" type="number" inputmode="numeric" value="${p.age}" required><em>лет</em></div></label>
      <label class="fld"><span>Рост</span><div class="inp-u"><input name="height" type="number" inputmode="numeric" value="${p.height}" required><em>см</em></div></label>
      <label class="fld"><span>Стартовый вес (утром натощак)</span><div class="inp-u"><input name="startWeight" type="number" step="0.1" inputmode="decimal" value="${p.startWeight}" required><em>кг</em></div></label>
      <label class="fld"><span>Дата начала программы</span><input name="startDate" type="date" value="${p.startDate}" required></label>
    </div>
    <label class="fld"><span>Активность</span><select name="activity">${c.ACTIVITY.map((a) => `<option value="${a.id}" ${Number(p.activity) === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}</select></label>
    <label class="fld"><span>Цель</span><select name="goal">${c.GOALS.map((g) => `<option value="${g.id}" ${p.goal === g.id ? 'selected' : ''}>${g.name}</option>`).join('')}</select></label>
    <details class="sub" ${onboarding ? '' : ''}><summary>Тонкая настройка (необязательно)</summary>
      <p class="muted small">Пустое поле — значение считается автоматически.</p>
      <div class="fields">
        <label class="fld"><span>Целевой вес</span><div class="inp-u"><input name="targetWeight" type="number" step="0.1" inputmode="decimal" value="${p.targetWeight ?? ''}" placeholder="${n1(t.targetWeight)}"><em>кг</em></div></label>
        <label class="fld"><span>Длительность этапа</span><div class="inp-u"><input name="programDays" type="number" inputmode="numeric" value="${p.programDays || 30}"><em>дней</em></div></label>
        <label class="fld"><span>Калории в день</span><div class="inp-u"><input name="kcalOverride" type="number" inputmode="numeric" value="${p.kcalOverride ?? ''}" placeholder="${t.autoKcal}"><em>ккал</em></div></label>
        <label class="fld"><span>Белок в день</span><div class="inp-u"><input name="proteinOverride" type="number" inputmode="numeric" value="${p.proteinOverride ?? ''}" placeholder="${t.protein[0]}–${t.protein[1]}"><em>г</em></div></label>
        <label class="fld"><span>Вода в день</span><div class="inp-u"><input name="waterOverride" type="number" step="0.1" inputmode="decimal" value="${p.waterOverride ?? ''}" placeholder="${n1(t.water[0])}–${n1(t.water[1])}"><em>л</em></div></label>
        <label class="fld"><span>Размер порций меню</span><div class="inp-u"><input name="menuScale" type="number" step="0.05" inputmode="decimal" value="${p.menuScale ?? ''}" placeholder="${n1(autoScale)}"><em>×</em></div></label>
      </div>
    </details>
    <button class="btn primary wide">${onboarding ? 'Подтвердить и начать' : 'Сохранить'}</button>
  </form>`;
}

function targetsCard() {
  const p = M.profile();
  const t = M.T();
  const sc = M.scale();
  const avg = c.menuAvg(M.menu(), M.db(), sc);
  return `<section class="card"><div class="card-h"><h3>Ваша норма</h3><span class="muted small">по формуле Миффлина — Сан Жеора</span></div>
    <div class="kpis">
      <div class="kpi"><span>Калории</span><b>${t.kcalRange[0]}–${t.kcalRange[1]}</b><em>обмен в покое ${n0(t.bmr)} · с активностью ${n0(t.tdee)}</em></div>
      <div class="kpi"><span>Белок</span><b>${t.protein[0]}–${t.protein[1]} г</b><em>${n1(t.goal.prot[0])}–${n1(t.goal.prot[1])} г на кг</em></div>
      <div class="kpi"><span>Вода</span><b>${n1(t.water[0])}–${n1(t.water[1])} л</b><em>если нет мед. ограничений</em></div>
      <div class="kpi"><span>Индекс массы тела</span><b>${n1(t.bmi)}</b><em>здоровый вес ${n1(t.healthy[0])}–${n1(t.healthy[1])} кг</em></div>
      <div class="kpi"><span>Цель</span><b>${n1(t.targetWeight)} кг</b><em>${t.pace ? `≈ ${t.weeks} нед. при ${n1(t.pace)} кг/нед` : 'держим вес'}</em></div>
      <div class="kpi"><span>Меню сейчас</span><b>${n0(avg.kcal)} ккал</b><em>${n0(avg.p)} г белка · порции ×${n1(sc)}</em></div>
    </div>
    <p class="hint">Это ориентиры по стандартным формулам, а не назначение врача. ${p.sex === 'f' ? 'Для женщин формула учитывает другой обмен веществ.' : ''} При болезнях почек, сердца, диабете и во время беременности норму согласуйте с врачом.</p>
  </section>`;
}

function cloudCard() {
  const u = cloud.currentUser();
  const s = store.sync;
  if (!cloud.cloudConfigured()) {
    return `<section class="card"><div class="card-h"><h3>Облако</h3><span class="pill">не подключено</span></div>
      <p>Сейчас данные хранятся только на этом устройстве. Чтобы телефон и MacBook видели одно и то же, нужно один раз подключить Supabase — инструкция в файле «ИНСТРУКЦИЯ.md» в папке проекта.</p></section>`;
  }
  if (!u) {
    return `<section class="card"><div class="card-h"><h3>Облако Supabase</h3><span class="pill">вход не выполнен</span></div>
      <p class="muted">Войдите — и данные будут одинаковыми на iPhone и MacBook. У каждого человека свой аккаунт, чужие записи не видны.</p>
      ${authForm()}</section>`;
  }
  const label = { ok: 'синхронизировано', syncing: 'синхронизация…', error: 'ошибка', offline: 'нет сети', idle: 'ожидание' }[s.status] || s.status;
  return `<section class="card"><div class="card-h"><h3>Облако Supabase</h3><span class="pill ${s.status === 'ok' ? 'on' : s.status === 'error' ? 'bad' : ''}">${label}</span></div>
    <p>Аккаунт: <b>${esc(u.email)}</b></p>
    <p class="muted small">${s.at ? `Последняя синхронизация: ${s.at.toLocaleTimeString('ru-RU')}. ` : ''}${store.pendingCount() ? `Ждут отправки: ${store.pendingCount()}. ` : ''}${esc(s.message || '')}</p>
    <p class="muted small">Изменения отправляются сразу, а с другого устройства подтягиваются каждые 15 секунд и при открытии приложения.</p>
    <div class="row gap"><button class="btn ghost" data-a="syncNow">Синхронизировать сейчас</button><button class="btn ghost danger-t" data-a="logout">Выйти</button></div></section>`;
}

function authForm() {
  return `<form data-f="auth" class="auth">
    <label class="fld"><span>Почта</span><input name="email" type="email" autocomplete="email" required></label>
    <label class="fld"><span>Пароль (не меньше 6 символов)</span><input name="password" type="password" autocomplete="current-password" minlength="6" required></label>
    <div class="row gap"><button class="btn primary grow" name="mode" value="in">Войти</button><button class="btn ghost grow" name="mode" value="up">Зарегистрироваться</button></div>
  </form>`;
}

export function onboarding() {
  const cloudOn = cloud.cloudConfigured() && !cloud.currentUser();
  return `<div class="onb">
    <div class="brand-big">SENICH<br><span>BODY TRACKER</span></div>
    <p class="lead">Личный помощник по питанию, весу и тренировкам. Заполните данные — приложение рассчитает норму калорий, белка и воды и подстроит меню.</p>
    ${cloudOn ? `<section class="card"><div class="card-h"><h3>Уже пользуетесь на другом устройстве?</h3></div><p class="muted small">Войдите в аккаунт — все записи подтянутся. Новый человек — зарегистрируйтесь здесь же.</p>${authForm()}</section><p class="muted center">или начните без аккаунта (данные будут только на этом устройстве)</p>` : ''}
    ${profileForm(true)}
  </div>`;
}

export function render() {
  const db = M.db();
  const snaps = store.localSnapshots();
  return `
  <header class="page-h"><div><p class="eyebrow">Профиль, облако, резервные копии</p><h1>Настройки</h1></div></header>
  ${targetsCard()}
  <div class="grid2">
    ${profileForm(false)}
    <div>
      ${cloudCard()}
      <section class="card"><div class="card-h"><h3>Резервная копия</h3></div>
        <p class="muted small">Файл со всеми данными: дневник, меню, замеры, тренировки, покупки. Храните его в iCloud Drive.</p>
        <div class="row wrap gap">
          <button class="btn primary" data-a="backup">Скачать копию</button>
          <label class="btn ghost file-btn">Восстановить из файла<input type="file" accept=".json,application/json" data-c="restore" hidden></label>
          <button class="btn ghost" data-a="exportCsv">Выгрузить CSV (Excel)</button>
        </div>
        ${snaps.length ? `<details class="sub"><summary>Автокопии на этом устройстве (${snaps.length})</summary><ul class="list">${snaps.map((s) => `<li><span class="grow">${fmtDate(s.date, true)}</span><button class="btn ghost sm" data-a="restoreSnap" data-k="${esc(s.key)}">Вернуть</button></li>`).join('')}</ul></details>` : ''}
      </section>
    </div>
  </div>

  <section class="card"><div class="card-h"><h3>База продуктов</h3><button class="btn ghost sm" data-a="foodNew">+ Свой продукт</button></div>
    <p class="muted small">Калории и белок — на 100 г (мл) сырого или сухого продукта. Изменения сразу пересчитывают меню и покупки.</p>
    <div class="table-wrap"><table class="tbl foods-tbl"><thead><tr><th>Продукт</th><th>ккал</th><th>белок</th><th>выход</th><th>упаковка</th><th></th></tr></thead><tbody>
      ${Object.entries(db.foods).filter(([, f]) => !f.noCount).sort((a, b) => (a[1].cat + a[1].name).localeCompare(b[1].cat + b[1].name, 'ru')).map(([id, f]) => `<tr>
        <td>${esc(f.name)}<br><small class="muted">${CATS.find((x) => x.id === f.cat)?.name || ''}${f.store === 'long' ? ' · долгое хранение' : ''}</small></td>
        <td>${n0(f.kcal)}</td><td>${n1(f.p)}</td><td>${f.yield && f.yield !== 1 ? '×' + n1(f.yield) : '—'}</td><td>${esc(f.pack?.label || '')}</td>
        <td><button class="btn ghost sm" data-a="foodEdit" data-id="${id}">Изменить</button></td></tr>`).join('')}
    </tbody></table></div>
    <p class="hint">«Выход» — сколько готового получается из 1 г сырого: гречка ×2,6 значит 200 г готовой = 77 г сухой.</p>
  </section>

  <section class="card"><div class="card-h"><h3>Опасная зона</h3></div>
    <p class="muted small">Удаляет данные только на этом устройстве. Облако и резервные копии не трогаются.</p>
    <button class="btn ghost danger-t" data-a="wipeLocal">Очистить данные на этом устройстве</button>
  </section>`;
}

// ---------- действия ----------
A.profileSave = (f) => {
  const prev = M.profile() || {};
  const p = {
    ...prev,
    name: (f.name || '').trim(), sex: f.sex === 'f' ? 'f' : 'm',
    age: num(f.age), height: num(f.height), startWeight: num(f.startWeight), startDate: f.startDate || c.today(),
    activity: Number(f.activity) || 2, goal: f.goal || 'lose',
    targetWeight: num(f.targetWeight) ?? '', programDays: num(f.programDays) || 30,
    kcalOverride: num(f.kcalOverride) ?? '', proteinOverride: num(f.proteinOverride) ?? '', waterOverride: num(f.waterOverride) ?? '',
    menuScale: num(f.menuScale) ?? '', confirmed: true,
  };
  if (!p.age || p.age < 12 || p.age > 100) { toast('Проверьте возраст'); return; }
  if (!p.height || p.height < 120 || p.height > 230) { toast('Проверьте рост'); return; }
  if (!p.startWeight || p.startWeight < 30 || p.startWeight > 300) { toast('Проверьте вес'); return; }
  const first = !prev.confirmed;
  store.put('profile', 'main', p);
  if (first && !M.day(p.startDate).weight) M.saveDay(p.startDate, { weight: p.startWeight });
  toast(first ? 'Готово! Норма рассчитана' : 'Сохранено');
  if (first) location.hash = '#home';
};

A.auth = async (f, form, e) => {
  const mode = e.submitter?.value || 'in';
  const btns = form.querySelectorAll('button');
  btns.forEach((b) => (b.disabled = true));
  try {
    if (mode === 'up') {
      const r = await cloud.signUp(f.email.trim(), f.password);
      if (r.confirm) { toast('Письмо отправлено. Откройте почту, подтвердите адрес и затем нажмите «Войти»'); return; }
    } else {
      await cloud.signIn(f.email.trim(), f.password);
    }
    const move = store.hasLocalData() && (await confirmBox('На этом устройстве уже есть записи без аккаунта. Перенести их в аккаунт?', 'Перенести'));
    await store.afterLogin(move);
    toast('Вход выполнен. Данные синхронизируются');
  } catch (err) {
    toast(err.message || 'Не удалось войти');
  } finally {
    btns.forEach((b) => (b.disabled = false));
  }
};

A.syncNow = async () => { await store.syncNow(); toast(store.sync.status === 'ok' ? 'Синхронизировано' : store.sync.message || 'Не удалось'); };
A.logout = async () => {
  if (!(await confirmBox('Выйти из аккаунта на этом устройстве? Данные останутся в облаке.', 'Выйти'))) return;
  await store.logout();
  location.hash = '#settings';
};

A.backup = () => {
  download(`senich-body-tracker-backup-${c.today()}.json`, JSON.stringify(store.exportAll(), null, 1), 'application/json');
  toast('Файл копии скачан');
};

A.restore = async (el) => {
  const file = el.files?.[0];
  if (!file) return;
  try {
    const json = JSON.parse(await file.text());
    if (!(await confirmBox(`Восстановить данные из копии от ${json.exportedAt ? new Date(json.exportedAt).toLocaleDateString('ru-RU') : '?'}? Записи из файла заменят такие же записи здесь, остальные сохранятся.`, 'Восстановить'))) return;
    store.importAll(json);
    toast('Данные восстановлены');
  } catch (e) { toast(e.message || 'Не удалось прочитать файл'); }
  el.value = '';
};

A.restoreSnap = async (el) => {
  if (!(await confirmBox('Вернуть данные из этой автокопии? Записи из копии заменят текущие.', 'Вернуть'))) return;
  store.restoreSnapshot(el.dataset.k);
  toast('Данные из автокопии возвращены');
};

A.wipeLocal = async () => {
  if (!(await confirmBox('Сначала скачайте резервную копию. Точно очистить все данные на этом устройстве?', 'Очистить', true))) return;
  if (!(await confirmBox('Последнее подтверждение: удалить данные с этого устройства?', 'Да, удалить', true))) return;
  Object.keys(localStorage).filter((k) => k.startsWith('sbt')).forEach((k) => localStorage.removeItem(k));
  location.reload();
};

function foodSheet(id) {
  const f = id ? M.db().foods[id] : { name: '', cat: 'other', kcal: '', p: '', unit: 'g', store: 'fresh', pack: { size: 1000, label: 'кг' } };
  openSheet(id ? f.name : 'Свой продукт', `<form data-f="foodSave" data-id="${id || ''}">
    <label class="fld"><span>Название</span><input name="name" value="${esc(f.name)}" required></label>
    <div class="fields">
      <label class="fld"><span>Ккал на 100</span><input name="kcal" type="number" step="any" inputmode="decimal" value="${f.kcal}" required></label>
      <label class="fld"><span>Белок на 100, г</span><input name="p" type="number" step="any" inputmode="decimal" value="${f.p}" required></label>
      <label class="fld"><span>Единица</span><select name="unit">${[['g', 'граммы'], ['ml', 'миллилитры'], ['pcs', 'штуки']].map(([v, l]) => `<option value="${v}" ${f.unit === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="fld"><span>Вес 1 шт (для штук), г</span><input name="pieceG" type="number" step="any" value="${f.pieceG ?? ''}"></label>
      <label class="fld"><span>Выход после готовки ×</span><input name="yield" type="number" step="any" value="${f.yield ?? ''}" placeholder="нет"></label>
      <label class="fld"><span>Отходы при очистке, %</span><input name="waste" type="number" step="any" value="${f.waste ? Math.round(f.waste * 100) : ''}"></label>
      <label class="fld"><span>Упаковка (в г, мл или шт)</span><input name="packSize" type="number" step="any" value="${f.pack?.size ?? ''}"></label>
      <label class="fld"><span>Название упаковки</span><input name="packLabel" value="${esc(f.pack?.label || '')}"></label>
    </div>
    <label class="fld"><span>Категория</span><select name="cat">${CATS.map((x) => `<option value="${x.id}" ${f.cat === x.id ? 'selected' : ''}>${x.name}</option>`).join('')}</select></label>
    <label class="fld"><span>Хранение</span><select name="store"><option value="fresh" ${f.store !== 'long' ? 'selected' : ''}>скоропортящееся</option><option value="long" ${f.store === 'long' ? 'selected' : ''}>длительное</option></select></label>
    <label class="fld"><span>Как готовить (необязательно)</span><textarea name="howto" rows="2">${esc(f.howto || '')}</textarea></label>
    <button class="btn primary wide">Сохранить</button></form>`);
}
A.foodEdit = (el) => foodSheet(el.dataset.id);
A.foodNew = () => foodSheet(null);
A.foodSave = (f, form) => {
  const id = form.dataset.id || `u${Date.now()}`;
  const rec = {
    name: f.name.trim(), kcal: num(f.kcal) || 0, p: num(f.p) || 0, unit: f.unit, cat: f.cat, store: f.store,
    pieceG: num(f.pieceG) || null, yield: num(f.yield) || null, waste: num(f.waste) ? num(f.waste) / 100 : null,
    pack: { size: num(f.packSize) || 1000, label: f.packLabel || '' }, howto: f.howto || null,
  };
  store.put('foods', id, rec);
  closeSheet();
  toast('Продукт сохранён — меню и покупки пересчитаны');
};
