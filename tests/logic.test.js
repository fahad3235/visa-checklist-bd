// visa-checklist-bd -- node unit tests for logic.js.
// Run: node --test tests/logic.test.js
// Expected values below were computed by hand / independently of logic.js.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const L = require('../logic.js');

const T = '\u09f3';

// ---------- checklist composition ----------

test('tourist/general has 13 items (12 common + travel plan)', () => {
  const items = L.getChecklist('tourist', 'general');
  assert.strictEqual(items.length, 13);
  const ids = items.map((i) => i.id);
  assert.ok(ids.includes('passport'));
  assert.ok(ids.includes('travelplan'));
  assert.ok(!ids.includes('offer'));
  assert.ok(!ids.includes('ds160'));
});

test('student/general has 18 items (12 common + 6 student)', () => {
  const items = L.getChecklist('student', 'general');
  assert.strictEqual(items.length, 18);
  assert.ok(items.some((i) => i.id === 'sop'));
  assert.ok(items.some((i) => i.id === 'englishtest'));
  assert.ok(!items.some((i) => i.id === 'joboffer'));
});

test('work/usa has 19 items (12 + 5 work + DS-160 + interview)', () => {
  const items = L.getChecklist('work', 'usa');
  assert.strictEqual(items.length, 19);
  assert.ok(items.some((i) => i.id === 'ds160'));
  assert.ok(items.some((i) => i.id === 'usinterview'));
  assert.ok(items.some((i) => i.id === 'police'));
});

test('umrah/saudi has 16 items (12 + 4 umrah, no dest extras)', () => {
  const items = L.getChecklist('umrah', 'saudi');
  assert.strictEqual(items.length, 16);
  assert.ok(items.some((i) => i.id === 'nusuk'));
  assert.ok(items.some((i) => i.id === 'vaccine'));
});

test('tourist/schengen adds the EUR 30,000 insurance item (14 total)', () => {
  const items = L.getChecklist('tourist', 'schengen');
  assert.strictEqual(items.length, 14);
  assert.ok(items.some((i) => i.id === 'schengenins'));
});

test('medical/uk adds TB test (16 total)', () => {
  const items = L.getChecklist('medical', 'uk');
  assert.strictEqual(items.length, 16);
  assert.ok(items.some((i) => i.id === 'tbtest'));
  assert.ok(items.some((i) => i.id === 'hospital'));
});

test('unknown purpose/destination fall back to tourist/general', () => {
  assert.strictEqual(L.getChecklist('bogus', 'bogus').length, 13);
  assert.strictEqual(L.getChecklist().length, 13);
});

// ---------- progress ----------

test('progress 3 of 13 is 23%', () => {
  assert.deepStrictEqual(L.progress(3, 13), { done: 3, total: 13, pct: 23 });
  assert.deepStrictEqual(L.progress(0, 0), { done: 0, total: 0, pct: 0 });
  assert.deepStrictEqual(L.progress(13, 13), { done: 13, total: 13, pct: 100 });
  assert.deepStrictEqual(L.progress(20, 13), { done: 13, total: 13, pct: 100 });
});

// ---------- dates ----------

test('isValidDateStr rejects impossible dates', () => {
  assert.strictEqual(L.isValidDateStr('2026-11-09'), true);
  assert.strictEqual(L.isValidDateStr('2026-02-30'), false);
  assert.strictEqual(L.isValidDateStr('2026-13-01'), false);
  assert.strictEqual(L.isValidDateStr('09-11-2026'), false);
  assert.strictEqual(L.isValidDateStr(''), false);
  assert.strictEqual(L.isValidDateStr(null), false);
});

test('addDays crosses month boundaries', () => {
  assert.strictEqual(L.addDays('2026-12-24', -60), '2026-10-25');
  assert.strictEqual(L.addDays('2026-12-24', -45), '2026-11-09');
  assert.strictEqual(L.addDays('2026-01-05', -10), '2025-12-26');
});

test('daysBetween counts whole days', () => {
  assert.strictEqual(L.daysBetween('2026-11-09', '2026-12-24'), 45);
  assert.strictEqual(L.daysBetween('2026-11-09', '2026-10-25'), -15);
  assert.strictEqual(L.daysBetween('2026-11-09', '2026-11-09'), 0);
});

// ---------- timeline ----------
// today 2026-11-09, travel 2026-12-24 (hand-computed):
// gather 2026-10-25 (-15d, overdue), apply 2026-11-09 (0d, due-soon),
// bio 2026-11-24 (15d), decision 2026-12-10 (31d), travel 2026-12-24 (45d).
test('timeline for 2026-12-24 from 2026-11-09', () => {
  const r = L.timeline('2026-12-24', '2026-11-09');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.daysToTravel, 45);
  assert.strictEqual(r.milestones.length, 5);
  assert.deepStrictEqual(r.milestones[0], { id: 'gather', en: 'Start gathering documents', date: '2026-10-25', daysLeft: -15, status: 'overdue' });
  assert.deepStrictEqual(r.milestones[1], { id: 'apply', en: 'Submit the visa application', date: '2026-11-09', daysLeft: 0, status: 'due-soon' });
  assert.deepStrictEqual(r.milestones[2], { id: 'bio', en: 'Biometrics / interview appointment', date: '2026-11-24', daysLeft: 15, status: 'upcoming' });
  assert.deepStrictEqual(r.milestones[3], { id: 'decision', en: 'Decision expected - buffer week', date: '2026-12-10', daysLeft: 31, status: 'upcoming' });
  assert.deepStrictEqual(r.milestones[4], { id: 'travel', en: 'Travel day', date: '2026-12-24', daysLeft: 45, status: 'upcoming' });
});

test('timeline rejects bad dates', () => {
  assert.strictEqual(L.timeline('2026-02-30', '2026-11-09').ok, false);
  assert.strictEqual(L.timeline('2026-12-24', 'not-a-date').ok, false);
});

// ---------- money ----------

test('parseAmount handles commas, taka sign and Bengali digits', () => {
  assert.strictEqual(L.parseAmount('1,500.50'), 150050);
  assert.strictEqual(L.parseAmount('1500'), 150000);
  assert.strictEqual(L.parseAmount('\u09f3200'), 20000);
  assert.strictEqual(L.parseAmount('\u09e7,\u09eb\u09e6\u09e6.\u09eb\u09e6'), 150050);
  assert.strictEqual(L.parseAmount('0'), 0);
  assert.strictEqual(L.parseAmount('0.05'), 5);
});

test('parseAmount rejects bad input', () => {
  assert.strictEqual(L.parseAmount(''), null);
  assert.strictEqual(L.parseAmount('   '), null);
  assert.strictEqual(L.parseAmount('abc'), null);
  assert.strictEqual(L.parseAmount('-5'), null);
  assert.strictEqual(L.parseAmount('10.999'), null);
  assert.strictEqual(L.parseAmount('1.2.3'), null);
  assert.strictEqual(L.parseAmount(null), null);
});

test('formatMoney rounds to paisa and localises digits', () => {
  assert.strictEqual(L.formatMoney(150050, 'en'), T + '1,500.50');
  assert.strictEqual(L.formatMoney(0, 'en'), T + '0.00');
  assert.strictEqual(L.formatMoney(150050, 'bn'), T + '\u09e7,\u09eb\u09e6\u09e6.\u09eb\u09e6');
});

test('costTotal sums per-person lines and multiplies by travellers', () => {
  const r = L.costTotal({ visaFee: 1500000, serviceFee: 250000, insurance: 100000 }, 3);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.perPersonPaisa, 1850000);
  assert.strictEqual(r.totalPaisa, 5550000);
  assert.strictEqual(r.travellers, 3);
});

test('costTotal treats missing lines as 0 and clamps travellers', () => {
  const r = L.costTotal({}, 0);
  assert.strictEqual(r.perPersonPaisa, 0);
  assert.strictEqual(r.totalPaisa, 0);
  assert.strictEqual(r.travellers, 1);
  const r2 = L.costTotal({ visaFee: 50000 }, 11);
  assert.strictEqual(r2.travellers, 1);
  const r3 = L.costTotal({ visaFee: -5 }, 2);
  assert.strictEqual(r3.perPersonPaisa, 0); // negative line ignored
});

// ---------- trips / import ----------

function goodTrip() {
  return {
    id: 't1', name: 'Thailand trip', purpose: 'tourist', destination: 'thailand',
    travelDate: '2026-12-24', checked: { passport: true }, custom: [{ id: 'c1', label: 'Extra photos' }],
    costs: { visaFee: 500000, serviceFee: null, insurance: null, photos: null, certificates: null, translation: null, other: null },
    travellers: 2,
  };
}

test('validateTrip accepts a good trip and rejects bad ones', () => {
  assert.strictEqual(L.validateTrip(goodTrip()).ok, true);
  assert.strictEqual(L.validateTrip(Object.assign({}, goodTrip(), { purpose: 'nope' })).ok, false);
  assert.strictEqual(L.validateTrip(Object.assign({}, goodTrip(), { travelDate: '2026-02-30' })).ok, false);
  assert.strictEqual(L.validateTrip(Object.assign({}, goodTrip(), { name: '   ' })).ok, false);
  assert.strictEqual(L.validateTrip(Object.assign({}, goodTrip(), { travellers: 0 })).ok, false);
  assert.strictEqual(L.validateTrip(Object.assign({}, goodTrip(), { costs: { visaFee: -1 } })).ok, false);
  assert.strictEqual(L.validateTrip(Object.assign({}, goodTrip(), { custom: [{ id: 'c', label: '' }] })).ok, false);
  assert.strictEqual(L.validateTrip(null).ok, false);
});

test('export/import round-trip preserves a trip', () => {
  const st = L.emptyState();
  st.trips = [goodTrip()];
  st.draft.purpose = 'student';
  const payload = L.exportPayload(st);
  assert.ok(payload.includes('"app":"visa-checklist-bd"'));
  const back = L.importPayload(payload);
  assert.strictEqual(back.ok, true);
  assert.strictEqual(back.state.trips[0].name, 'Thailand trip');
  assert.strictEqual(back.state.draft.purpose, 'student');
});

test('importPayload rejects wrong app, bad JSON and bad trips', () => {
  assert.strictEqual(L.importPayload('{not json').ok, false);
  assert.strictEqual(L.importPayload('{"app":"bus-fare-bd","version":1,"state":{}}').ok, false);
  assert.strictEqual(L.importPayload('{"app":"visa-checklist-bd","version":2,"state":{}}').ok, false);
  const st = L.emptyState();
  st.trips = [Object.assign({}, goodTrip(), { purpose: 'nope' })];
  assert.strictEqual(L.importPayload(L.exportPayload(st)).ok, false);
  const st2 = L.emptyState();
  st2.lang = 'fr';
  assert.strictEqual(L.importPayload(L.exportPayload(st2)).ok, false);
});

test('emptyDraft/emptyState shapes', () => {
  const d = L.emptyDraft();
  assert.strictEqual(d.purpose, 'tourist');
  assert.strictEqual(d.destination, 'general');
  assert.strictEqual(d.travelDate, '');
  assert.deepStrictEqual(d.checked, {});
  assert.deepStrictEqual(d.custom, []);
  assert.strictEqual(d.travellers, 1);
  assert.strictEqual(d.costs.visaFee, null);
  const s = L.emptyState();
  assert.strictEqual(s.lang, 'en');
  assert.deepStrictEqual(s.trips, []);
  assert.strictEqual(s.activeTripId, null);
});
