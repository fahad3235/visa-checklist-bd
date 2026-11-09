// visa-checklist-bd -- DOM wiring, i18n, persistence.
// logic.js exposes L (pure logic); i18n.js exposes I18N.
'use strict';
/* global L, I18N */

const LS_KEY = 'visa-checklist-bd-v1';

function todayStr() {
  const params = new URLSearchParams(window.location.search);
  const asof = params.get('asof');
  if (asof && L.isValidDateStr(asof)) return asof;
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return L.emptyState();
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return L.emptyState();
    // Saved shape is an export payload {app, version, state}; accept a bare state too.
    const candidate = data.app === L.APP ? data.state : data;
    if (!candidate || typeof candidate !== 'object') return L.emptyState();
    if (candidate.lang !== 'en' && candidate.lang !== 'bn') candidate.lang = 'en';
    if (!Array.isArray(candidate.trips)) candidate.trips = [];
    if (!candidate.draft || typeof candidate.draft !== 'object') candidate.draft = L.emptyDraft();
    return candidate;
  } catch (e) {
    return L.emptyState();
  }
}

function saveState() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ app: L.APP, version: L.VERSION, state: state }));
  } catch (e) { /* storage full/blocked: app still works in-memory */ }
}

let state = loadState();
let costValues = {}; // key -> paisa|null (mirrors inputs; rebuilt on render)

function t(key) {
  const lang = state.lang || 'en';
  return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
}

function $(id) { return document.getElementById(id); }

function fmtDate(dateStr, lang) {
  if (!L.isValidDateStr(dateStr)) return dateStr;
  const parts = dateStr.split('-');
  const out = parts[2] + '/' + parts[1] + '/' + parts[0];
  return lang === 'bn' ? L.toBnDigits(out) : out;
}

function fmtNum(n, lang) {
  const s = String(n);
  return lang === 'bn' ? L.toBnDigits(s) : s;
}

// ---------- rendering ----------

function applyLang() {
  const lang = state.lang;
  document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
  $('title').textContent = t('title');
  $('subtitle').textContent = t('subtitle');
  $('langBtn').textContent = t('langBtn');
  $('tabbtn-checklist').textContent = t('tab-checklist');
  $('tabbtn-timeline').textContent = t('tab-timeline');
  $('tabbtn-costs').textContent = t('tab-costs');
  $('tabbtn-trips').textContent = t('tab-trips');
  $('tabbtn-data').textContent = t('tab-data');
  $('purposeLabel').textContent = t('purposeLabel');
  $('destLabel').textContent = t('destLabel');
  $('travelDateLabel').textContent = t('travelDateLabel');
  $('progressLabel').textContent = t('progress');
  $('addCustomLabel').textContent = t('addCustomLabel');
  $('customInput').placeholder = t('customPh');
  $('addCustomBtn').textContent = t('addBtn');
  $('resetBtn').textContent = t('resetBtn');
  $('disclaimer').textContent = t('disclaimer');
  $('noTravelDate').textContent = t('noTravelDate');
  $('costHint').textContent = t('costHint');
  $('travellersLabel').textContent = t('travellers');
  $('perPersonLabel').textContent = t('perPerson');
  $('totalLabel').textContent = t('total');
  $('saveTripLabel').textContent = t('saveTripLabel');
  $('tripName').placeholder = t('tripNamePh');
  $('saveBtn').textContent = t('saveBtn');
  $('noTrips').textContent = t('noTrips');
  $('exportLabel').textContent = t('exportLabel');
  $('exportBtn').textContent = t('exportBtn');
  $('importLabel').textContent = t('importLabel');
  $('importBtn').textContent = t('importBtn');
  $('eraseLabel').textContent = t('eraseLabel');
  $('eraseHint').textContent = t('eraseHint');
  $('eraseBtn').textContent = t('eraseBtn');
  $('eraseWrong').textContent = t('eraseWrong');
  $('footer').textContent = t('footer');
  buildSelects();
  renderAll();
}

function buildSelects() {
  const pSel = $('purposeSel');
  const dSel = $('destSel');
  const curP = state.draft.purpose;
  const curD = state.draft.destination;
  pSel.innerHTML = '';
  dSel.innerHTML = '';
  for (const p of L.PURPOSES) {
    const o = document.createElement('option');
    o.value = p;
    o.textContent = t('purpose_' + p);
    pSel.appendChild(o);
  }
  for (const d of L.DESTINATIONS) {
    const o = document.createElement('option');
    o.value = d;
    o.textContent = t('dest_' + d);
    dSel.appendChild(o);
  }
  pSel.value = curP;
  dSel.value = curD;
  $('travelDate').value = state.draft.travelDate || '';
  $('travellersInput').value = state.draft.travellers || 1;
}

function itemLabel(item) {
  if (state.lang === 'bn' && I18N.bn['item_' + item.id]) return I18N.bn['item_' + item.id];
  return item.en;
}
function itemDetail(item) {
  if (state.lang === 'bn' && I18N.bn['item_' + item.id + '_detail']) return I18N.bn['item_' + item.id + '_detail'];
  return item.detailEn;
}

function renderChecklist() {
  const draft = state.draft;
  const items = L.getChecklist(draft.purpose, draft.destination);
  const all = items.concat(draft.custom.map((c) => ({ id: c.id, en: c.label, detailEn: '', custom: true })));
  const ul = $('checklist');
  ul.innerHTML = '';
  let done = 0;
  for (const item of all) {
    const checked = !!draft.checked[item.id];
    if (checked) done++;
    const li = document.createElement('li');
    if (checked) li.className = 'done';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = checked;
    cb.dataset.itemId = item.id;
    cb.setAttribute('aria-label', itemLabel(item));
    cb.addEventListener('change', () => {
      draft.checked[item.id] = cb.checked;
      saveState();
      renderChecklist();
    });
    const wrap = document.createElement('div');
    const lab = document.createElement('span');
    lab.className = 'item-label';
    lab.textContent = itemLabel(item);
    wrap.appendChild(lab);
    const det = itemDetail(item);
    if (det) {
      const d = document.createElement('span');
      d.className = 'item-detail';
      d.textContent = det;
      wrap.appendChild(d);
    }
    li.appendChild(cb);
    li.appendChild(wrap);
    if (item.custom) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'del-item';
      del.textContent = '\u00d7';
      del.setAttribute('aria-label', 'Delete');
      del.addEventListener('click', () => {
        draft.custom = draft.custom.filter((c) => c.id !== item.id);
        delete draft.checked[item.id];
        saveState();
        renderChecklist();
      });
      li.appendChild(del);
    }
    ul.appendChild(li);
  }
  const p = L.progress(done, all.length);
  $('progressText').textContent = fmtNum(p.done, state.lang) + ' / ' + fmtNum(p.total, state.lang) + ' \u00b7 ' + fmtNum(p.pct, state.lang) + '%';
  $('progressBar').style.width = p.pct + '%';
}

function renderTimeline() {
  const draft = state.draft;
  const list = $('timelineList');
  list.innerHTML = '';
  const summary = $('travelSummary');
  if (!draft.travelDate) {
    $('noTravelDate').hidden = false;
    summary.hidden = true;
    return;
  }
  const res = L.timeline(draft.travelDate, todayStr());
  if (!res.ok) {
    $('noTravelDate').hidden = false;
    summary.hidden = true;
    return;
  }
  $('noTravelDate').hidden = true;
  summary.hidden = false;
  if (res.daysToTravel === 0) summary.textContent = t('travelToday');
  else if (res.daysToTravel < 0) summary.textContent = t('travelPast');
  else summary.textContent = fmtNum(res.daysToTravel, state.lang) + ' ' + t('daysToTravel');
  for (const m of res.milestones) {
    const li = document.createElement('li');
    const date = document.createElement('span');
    date.className = 'm-date';
    date.textContent = fmtDate(m.date, state.lang);
    const lab = document.createElement('span');
    lab.className = 'm-label';
    lab.textContent = t('mile_' + m.id);
    const badge = document.createElement('span');
    badge.className = 'badge ' + m.status;
    if (m.daysLeft === 0) badge.textContent = t('todayLabel');
    else if (m.daysLeft < 0) badge.textContent = t('status-overdue') + ' \u00b7 ' + fmtNum(-m.daysLeft, state.lang) + ' ' + t('daysOverdue');
    else badge.textContent = t('status-' + m.status) + ' \u00b7 ' + fmtNum(m.daysLeft, state.lang) + ' ' + t('daysLeft');
    li.appendChild(date);
    li.appendChild(lab);
    li.appendChild(badge);
    list.appendChild(li);
  }
}

function renderCosts() {
  const grid = $('costGrid');
  grid.innerHTML = '';
  costValues = {};
  for (const key of L.COST_LINES) {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const lab = document.createElement('label');
    lab.textContent = t('cost_' + key);
    lab.htmlFor = 'cost-' + key;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.inputMode = 'decimal';
    inp.id = 'cost-' + key;
    inp.placeholder = '0.00';
    const v = state.draft.costs[key];
    if (v !== null && v !== undefined) inp.value = L.formatMoney(v, 'en').slice(1);
    inp.addEventListener('input', () => {
      const parsed = inp.value.trim() === '' ? null : L.parseAmount(inp.value);
      if (inp.value.trim() !== '' && parsed === null) {
        $('costErr').hidden = false;
        $('costErr').textContent = '\u09f3' + ' ' + t('cost_' + key) + ': ' + 'invalid amount';
        return;
      }
      $('costErr').hidden = true;
      state.draft.costs[key] = parsed;
      saveState();
      updateTotals();
    });
    wrap.appendChild(lab);
    wrap.appendChild(inp);
    grid.appendChild(wrap);
  }
  updateTotals();
}

function updateTotals() {
  const res = L.costTotal(state.draft.costs, state.draft.travellers);
  $('perPersonTotal').textContent = L.formatMoney(res.perPersonPaisa, state.lang);
  $('grandTotal').textContent = L.formatMoney(res.totalPaisa, state.lang);
}

function renderTrips() {
  const ul = $('tripList');
  ul.innerHTML = '';
  $('noTrips').hidden = state.trips.length > 0;
  for (const trip of state.trips) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'trip-name';
    name.textContent = trip.name;
    const meta = document.createElement('span');
    meta.className = 'trip-meta';
    const items = L.getChecklist(trip.purpose, trip.destination);
    const total = items.length + (trip.custom ? trip.custom.length : 0);
    const done = Object.keys(trip.checked || {}).filter((id) => trip.checked[id]).length;
    const p = L.progress(done, total);
    meta.textContent = t('purpose_' + trip.purpose) + ' \u00b7 ' + t('dest_' + trip.destination) +
      (trip.travelDate ? ' \u00b7 ' + fmtDate(trip.travelDate, state.lang) : '') +
      ' \u00b7 ' + fmtNum(p.pct, state.lang) + '%';
    const actions = document.createElement('span');
    actions.className = 'trip-actions';
    const load = document.createElement('button');
    load.type = 'button';
    load.className = 'btn small';
    load.textContent = t('loadBtn');
    load.addEventListener('click', () => {
      state.draft = JSON.parse(JSON.stringify(trip));
      delete state.draft.id;
      delete state.draft.name;
      state.activeTripId = trip.id;
      saveState();
      buildSelects();
      renderAll();
      showMsg('saveMsg', t('loadedMsg'));
      switchTab('checklist');
    });
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn small danger';
    del.textContent = t('deleteBtn');
    del.addEventListener('click', () => {
      state.trips = state.trips.filter((x) => x.id !== trip.id);
      if (state.activeTripId === trip.id) state.activeTripId = null;
      saveState();
      renderTrips();
      showMsg('saveMsg', t('deletedMsg'));
    });
    actions.appendChild(load);
    actions.appendChild(del);
    li.appendChild(name);
    li.appendChild(meta);
    li.appendChild(actions);
    ul.appendChild(li);
  }
}

function renderAll() {
  renderChecklist();
  renderTimeline();
  renderCosts();
  renderTrips();
}

function showMsg(id, text) {
  const el = $(id);
  el.textContent = text;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 4000);
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.panel').forEach((p) => { p.hidden = p.id !== 'tab-' + name; });
}

// ---------- events ----------

document.querySelectorAll('.tab').forEach((b) => {
  b.addEventListener('click', () => switchTab(b.dataset.tab));
});

$('langBtn').addEventListener('click', () => {
  state.lang = state.lang === 'bn' ? 'en' : 'bn';
  saveState();
  applyLang();
});

$('purposeSel').addEventListener('change', (e) => {
  state.draft.purpose = e.target.value;
  saveState();
  renderChecklist();
});
$('destSel').addEventListener('change', (e) => {
  state.draft.destination = e.target.value;
  saveState();
  renderChecklist();
});
$('travelDate').addEventListener('change', (e) => {
  state.draft.travelDate = e.target.value;
  saveState();
  renderTimeline();
});

$('addCustomBtn').addEventListener('click', () => {
  const inp = $('customInput');
  const label = inp.value.trim();
  if (!label) { showMsg('customMsg', t('customEmpty')); return; }
  if (state.draft.custom.length >= L.MAX_CUSTOM_ITEMS) return;
  state.draft.custom.push({ id: 'c' + Date.now().toString(36), label });
  inp.value = '';
  saveState();
  renderChecklist();
  showMsg('customMsg', t('customAdded'));
});
$('customInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); $('addCustomBtn').click(); }
});

$('resetBtn').addEventListener('click', () => {
  state.draft.checked = {};
  state.draft.custom = [];
  saveState();
  renderChecklist();
  showMsg('resetMsg', t('resetDone'));
});

$('travellersInput').addEventListener('input', (e) => {
  const n = parseInt(e.target.value, 10);
  if (Number.isInteger(n) && n >= 1 && n <= L.MAX_TRAVELERS) {
    state.draft.travellers = n;
    saveState();
    updateTotals();
  }
});

$('saveBtn').addEventListener('click', () => {
  const name = $('tripName').value.trim();
  if (!name) { showMsg('saveMsg', t('needName')); return; }
  const trip = JSON.parse(JSON.stringify(state.draft));
  trip.id = 't' + Date.now().toString(36);
  trip.name = name;
  const v = L.validateTrip(trip);
  if (!v.ok) { showMsg('saveMsg', t('needName')); return; }
  state.trips.push(trip);
  state.activeTripId = trip.id;
  $('tripName').value = '';
  saveState();
  renderTrips();
  showMsg('saveMsg', t('savedMsg'));
});

$('exportBtn').addEventListener('click', () => {
  const blob = new Blob([L.exportPayload(state)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'visa-checklist-bd-export.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});

$('importBtn').addEventListener('click', () => {
  const file = $('importFile').files && $('importFile').files[0];
  if (!file) { showMsg('importMsg', t('importFail')); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const res = L.importPayload(String(reader.result));
    if (!res.ok) { showMsg('importMsg', t('importFail')); return; }
    state = res.state;
    saveState();
    buildSelects();
    renderAll();
    applyLang();
    showMsg('importMsg', t('importOk'));
  };
  reader.readAsText(file);
});

$('eraseBtn').addEventListener('click', () => {
  if ($('eraseInput').value !== 'DELETE') {
    $('eraseWrong').hidden = false;
    return;
  }
  $('eraseWrong').hidden = true;
  const keepLang = state.lang;
  state = L.emptyState();
  state.lang = keepLang;
  $('eraseInput').value = '';
  saveState();
  buildSelects();
  renderAll();
  applyLang();
  showMsg('erasedMsg', t('erasedMsg'));
});

// ---------- boot ----------
applyLang();

window.__vcbd = {
  get state() { return state; },
  logic: L,
  todayStr,
  exportPayload: () => L.exportPayload(state),
  importPayload: (s) => {
    const r = L.importPayload(s);
    if (r.ok) { state = r.state; saveState(); buildSelects(); renderAll(); applyLang(); }
    return r;
  },
  eraseAll: () => {
    state = L.emptyState();
    saveState();
    buildSelects();
    renderAll();
    applyLang();
  },
};
