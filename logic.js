// visa-checklist-bd -- pure logic (no DOM). Node-requireable and browser-safe.
// Money is integer paisa (1 BDT = 100 paisa). Dates are YYYY-MM-DD (UTC).
'use strict';

const APP = 'visa-checklist-bd';
const VERSION = 1;

const PURPOSES = ['tourist', 'student', 'work', 'medical', 'umrah'];
const DESTINATIONS = ['general', 'india', 'thailand', 'malaysia', 'singapore', 'uae', 'saudi', 'uk', 'usa', 'schengen', 'canada', 'australia', 'china', 'japan', 'turkey'];
const MAX_TRAVELERS = 10;
const MAX_CUSTOM_ITEMS = 20;

// Checklist items. `purposes: ['all']` or a subset; `destinations: ['all']` or a subset.
// `en` is the English label; `detailEn` is the short English tip. Bengali strings
// live in i18n.js (keyed by item id) so this file stays pure ASCII.
const ITEMS = [
  // ---- common to every purpose ----
  { id: 'passport', purposes: ['all'], destinations: ['all'], en: 'Passport valid 6+ months', detailEn: 'At least 6 months validity beyond travel and 2 blank pages.' },
  { id: 'photos', purposes: ['all'], destinations: ['all'], en: 'Passport-size photos (35x45 mm)', detailEn: 'Recent, white background, no glasses or head covering (unless religious).' },
  { id: 'form', purposes: ['all'], destinations: ['all'], en: 'Visa application form, filled and signed', detailEn: 'Fill online where required, print and sign every page that asks for it.' },
  { id: 'itinerary', purposes: ['all'], destinations: ['all'], en: 'Flight reservation / travel itinerary', detailEn: 'A reservation is usually enough; do not buy a non-refundable ticket before approval.' },
  { id: 'hotel', purposes: ['all'], destinations: ['all'], en: 'Hotel booking / accommodation proof', detailEn: 'Booking confirmation, or host invitation letter with host address.' },
  { id: 'bankstmt', purposes: ['all'], destinations: ['all'], en: 'Bank statement (last 6 months)', detailEn: 'Original, bank-stamped, showing steady balance and transactions.' },
  { id: 'solvency', purposes: ['all'], destinations: ['all'], en: 'Bank solvency certificate', detailEn: 'Issued by your bank on letterhead, dated within the last month.' },
  { id: 'nid', purposes: ['all'], destinations: ['all'], en: 'NID / birth certificate copy', detailEn: 'Photocopy of your National ID; carry the original to the appointment.' },
  { id: 'ties', purposes: ['all'], destinations: ['all'], en: 'Proof of ties to Bangladesh', detailEn: 'Job letter, student ID, property papers or family ties - shows you will return.' },
  { id: 'insurance', purposes: ['all'], destinations: ['all'], en: 'Travel insurance', detailEn: 'Covering the whole trip; some destinations require a minimum cover.' },
  { id: 'coverletter', purposes: ['all'], destinations: ['all'], en: 'Cover letter', detailEn: 'One page: who you are, why you travel, where you stay, who pays.' },
  { id: 'prevvisa', purposes: ['all'], destinations: ['all'], en: 'Previous passports / old visas (if any)', detailEn: 'Photocopies of old visas and entry stamps strengthen the file.' },
  // ---- tourist ----
  { id: 'travelplan', purposes: ['tourist'], destinations: ['all'], en: 'Day-wise travel plan', detailEn: 'Simple day-by-day list of places, stays and transport.' },
  // ---- student ----
  { id: 'offer', purposes: ['student'], destinations: ['all'], en: 'Admission / offer letter', detailEn: 'Unconditional or conditional offer from the institution.' },
  { id: 'tuition', purposes: ['student'], destinations: ['all'], en: 'Tuition fee payment receipt', detailEn: 'Proof of deposit paid, where the institution asks for it.' },
  { id: 'academic', purposes: ['student'], destinations: ['all'], en: 'Academic certificates + transcripts', detailEn: 'Attested copies of SSC/HSC/bachelor results as applicable.' },
  { id: 'englishtest', purposes: ['student'], destinations: ['all'], en: 'English test score (IELTS / TOEFL)', detailEn: 'Valid score card meeting the institution and visa requirement.' },
  { id: 'sponsor', purposes: ['student'], destinations: ['all'], en: 'Sponsor affidavit + sponsor bank statement', detailEn: 'Affidavit from your sponsor with their 6-month bank statement.' },
  { id: 'sop', purposes: ['student'], destinations: ['all'], en: 'Statement of purpose', detailEn: 'Why this course, why this country, and your plans after study.' },
  // ---- work ----
  { id: 'joboffer', purposes: ['work'], destinations: ['all'], en: 'Job offer / employment contract', detailEn: 'Signed offer with role, salary and start date.' },
  { id: 'workpermit', purposes: ['work'], destinations: ['all'], en: 'Work permit / sponsor letter', detailEn: 'Permit or sponsorship certificate from the employer or authority.' },
  { id: 'noc', purposes: ['work'], destinations: ['all'], en: 'Employer NOC (if currently employed)', detailEn: 'No-objection certificate from your current employer.' },
  { id: 'police', purposes: ['work'], destinations: ['all'], en: 'Police clearance certificate', detailEn: 'From Bangladesh Police; allow 2-4 weeks to receive it.' },
  { id: 'medicalfit', purposes: ['work'], destinations: ['all'], en: 'Medical fitness report', detailEn: 'From an approved clinic where the destination requires it.' },
  // ---- medical ----
  { id: 'hospital', purposes: ['medical'], destinations: ['all'], en: 'Hospital appointment / invitation letter', detailEn: 'Letter from the treating hospital with dates and treatment plan.' },
  { id: 'medreports', purposes: ['medical'], destinations: ['all'], en: 'Medical reports + prescriptions', detailEn: 'Recent reports, prescriptions and referral letter from your doctor.' },
  { id: 'treatmentfunds', purposes: ['medical'], destinations: ['all'], en: 'Proof of funds for treatment', detailEn: 'Bank statement showing you can pay for treatment and stay.' },
  // ---- umrah ----
  { id: 'nusuk', purposes: ['umrah'], destinations: ['all'], en: 'Nusuk app registration', detailEn: 'Create your Nusuk account and keep the permit/QR ready.' },
  { id: 'mahram', purposes: ['umrah'], destinations: ['all'], en: 'Mahram proof (if applicable)', detailEn: 'Relationship proof where the rules ask for it.' },
  { id: 'vaccine', purposes: ['umrah'], destinations: ['all'], en: 'Meningitis vaccination certificate', detailEn: 'Valid meningococcal vaccine certificate as required for Umrah.' },
  { id: 'umrahhotel', purposes: ['umrah'], destinations: ['all'], en: 'Confirmed hotel + transport in Saudi Arabia', detailEn: 'Hotel booking and transport confirmation for the whole stay.' },
  // ---- destination-specific ----
  { id: 'ds160', purposes: ['all'], destinations: ['usa'], en: 'DS-160 confirmation page (USA)', detailEn: 'Complete the DS-160 online and print the confirmation page.' },
  { id: 'usinterview', purposes: ['all'], destinations: ['usa'], en: 'Interview appointment (USA)', detailEn: 'Book the embassy interview and keep the appointment letter.' },
  { id: 'tbtest', purposes: ['all'], destinations: ['uk'], en: 'TB test certificate (UK)', detailEn: 'Tuberculosis test from an approved clinic for stays over 6 months.' },
  { id: 'schengenins', purposes: ['all'], destinations: ['schengen'], en: 'Insurance min EUR 30,000 (Schengen)', detailEn: 'Schengen requires travel medical insurance of at least EUR 30,000.' },
];

// Timeline milestones, in days before the travel date.
const MILESTONES = [
  { id: 'gather', daysBefore: 60, en: 'Start gathering documents' },
  { id: 'apply', daysBefore: 45, en: 'Submit the visa application' },
  { id: 'bio', daysBefore: 30, en: 'Biometrics / interview appointment' },
  { id: 'decision', daysBefore: 14, en: 'Decision expected - buffer week' },
  { id: 'travel', daysBefore: 0, en: 'Travel day' },
];

const COST_LINES = ['visaFee', 'serviceFee', 'insurance', 'photos', 'certificates', 'translation', 'other'];

// ---------- helpers ----------

function isValidDateStr(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  // whole days from a to b (b - a)
  const da = new Date(a + 'T00:00:00Z').getTime();
  const db = new Date(b + 'T00:00:00Z').getTime();
  return Math.round((db - da) / 86400000);
}

const BN_DIGITS = ['\u09e6', '\u09e7', '\u09e8', '\u09e9', '\u09ea', '\u09eb', '\u09ec', '\u09ed', '\u09ee', '\u09ef'];
function toBnDigits(s) {
  return String(s).replace(/[0-9]/g, (d) => BN_DIGITS[+d]);
}

// Parse an amount string ("1,500.50", Bengali digits, "1500") to integer paisa.
// Returns null for empty/invalid/negative input.
function parseAmount(str) {
  if (str === null || str === undefined) return null;
  let s = String(str).trim();
  if (s === '') return null;
  s = s.replace(/[\u09e6-\u09ef]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
  s = s.replace(/[,\s\u09f3$]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const parts = s.split('.');
  let paisa = parseInt(parts[0], 10) * 100;
  if (parts[1]) paisa += parseInt((parts[1] + '00').slice(0, 2), 10);
  if (!Number.isSafeInteger(paisa) || paisa < 0) return null;
  return paisa;
}

function formatMoney(paisa, lang) {
  const neg = paisa < 0;
  const abs = Math.abs(paisa);
  const taka = Math.floor(abs / 100);
  const p = abs % 100;
  let s = '\u09f3' + taka.toLocaleString('en-US') + '.' + String(p).padStart(2, '0');
  if (neg) s = '-' + s;
  return lang === 'bn' ? toBnDigits(s) : s;
}

// ---------- checklist ----------

function getChecklist(purpose, destination) {
  const p = PURPOSES.includes(purpose) ? purpose : 'tourist';
  const d = DESTINATIONS.includes(destination) ? destination : 'general';
  return ITEMS.filter((it) => {
    const purposeOk = it.purposes.includes('all') || it.purposes.includes(p);
    const destOk = it.destinations.includes('all') || it.destinations.includes(d);
    return purposeOk && destOk;
  }).map((it) => ({ id: it.id, en: it.en, detailEn: it.detailEn }));
}

function checklistIds(purpose, destination) {
  return getChecklist(purpose, destination).map((it) => it.id);
}

function progress(checked, total) {
  const done = Math.min(checked, total);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, total, pct };
}

// ---------- timeline ----------

function timeline(travelDate, todayStr) {
  if (!isValidDateStr(travelDate) || !isValidDateStr(todayStr)) return { ok: false, error: 'bad-date' };
  const milestones = MILESTONES.map((m) => {
    const date = addDays(travelDate, -m.daysBefore);
    const daysLeft = daysBetween(todayStr, date);
    let status = 'upcoming';
    if (daysLeft < 0) status = 'overdue';
    else if (daysLeft <= 7) status = 'due-soon';
    return { id: m.id, en: m.en, date, daysLeft, status };
  });
  const daysToTravel = daysBetween(todayStr, travelDate);
  return { ok: true, milestones, daysToTravel, travelDate };
}

// ---------- costs ----------

function costTotal(lines, travellers) {
  // lines: {visaFee: paisa|null, ...}; null/undefined treated as 0.
  const t = Number.isInteger(travellers) && travellers >= 1 && travellers <= MAX_TRAVELERS ? travellers : 1;
  let perPerson = 0;
  const breakdown = {};
  for (const key of COST_LINES) {
    const v = lines && Number.isInteger(lines[key]) && lines[key] >= 0 ? lines[key] : 0;
    breakdown[key] = v;
    perPerson += v;
  }
  return { ok: true, perPersonPaisa: perPerson, travellers: t, totalPaisa: perPerson * t, breakdown };
}

// ---------- trips / state ----------

function emptyDraft() {
  return {
    purpose: 'tourist',
    destination: 'general',
    travelDate: '',
    checked: {},
    custom: [], // {id, label}
    costs: { visaFee: null, serviceFee: null, insurance: null, photos: null, certificates: null, translation: null, other: null },
    travellers: 1,
  };
}

function emptyState() {
  return { lang: 'en', trips: [], activeTripId: null, draft: emptyDraft() };
}

function validateTrip(t) {
  if (!t || typeof t !== 'object') return { ok: false, error: 'not-object' };
  if (typeof t.id !== 'string' || t.id.length === 0 || t.id.length > 40) return { ok: false, error: 'bad-id' };
  if (typeof t.name !== 'string' || t.name.trim().length === 0 || t.name.length > 80) return { ok: false, error: 'bad-name' };
  if (!PURPOSES.includes(t.purpose)) return { ok: false, error: 'bad-purpose' };
  if (!DESTINATIONS.includes(t.destination)) return { ok: false, error: 'bad-destination' };
  if (t.travelDate !== '' && !isValidDateStr(t.travelDate)) return { ok: false, error: 'bad-date' };
  if (!t.checked || typeof t.checked !== 'object' || Array.isArray(t.checked)) return { ok: false, error: 'bad-checked' };
  if (!Array.isArray(t.custom) || t.custom.length > MAX_CUSTOM_ITEMS) return { ok: false, error: 'bad-custom' };
  for (const c of t.custom) {
    if (!c || typeof c.id !== 'string' || typeof c.label !== 'string' || c.label.trim().length === 0 || c.label.length > 120) {
      return { ok: false, error: 'bad-custom-item' };
    }
  }
  if (!t.costs || typeof t.costs !== 'object') return { ok: false, error: 'bad-costs' };
  for (const key of COST_LINES) {
    const v = t.costs[key];
    if (v !== null && (!Number.isInteger(v) || v < 0)) return { ok: false, error: 'bad-cost' };
  }
  if (!Number.isInteger(t.travellers) || t.travellers < 1 || t.travellers > MAX_TRAVELERS) return { ok: false, error: 'bad-travellers' };
  return { ok: true };
}

function exportPayload(state) {
  return JSON.stringify({ app: APP, version: VERSION, state });
}

function importPayload(jsonStr) {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    return { ok: false, error: 'bad-json' };
  }
  if (!data || typeof data !== 'object' || data.app !== APP || data.version !== VERSION) {
    return { ok: false, error: 'wrong-app' };
  }
  const st = data.state;
  if (!st || typeof st !== 'object') return { ok: false, error: 'bad-state' };
  if (st.lang !== 'en' && st.lang !== 'bn') return { ok: false, error: 'bad-lang' };
  if (!Array.isArray(st.trips)) return { ok: false, error: 'bad-trips' };
  for (const t of st.trips) {
    const v = validateTrip(t);
    if (!v.ok) return { ok: false, error: 'bad-trip:' + v.error };
  }
  if (st.activeTripId !== null && typeof st.activeTripId !== 'string') return { ok: false, error: 'bad-active' };
  if (!st.draft || typeof st.draft !== 'object') return { ok: false, error: 'bad-draft' };
  // validate draft as a trip-shaped object (id/name optional)
  const draftAsTrip = Object.assign({ id: 'draft', name: 'draft' }, st.draft);
  const dv = validateTrip(draftAsTrip);
  if (!dv.ok) return { ok: false, error: 'bad-draft:' + dv.error };
  return { ok: true, state: st };
}

const L = {
  APP, VERSION, PURPOSES, DESTINATIONS, COST_LINES, MAX_TRAVELERS, MAX_CUSTOM_ITEMS,
  ITEMS, MILESTONES, getChecklist, checklistIds, progress,
  isValidDateStr, addDays, daysBetween, toBnDigits,
  parseAmount, formatMoney, timeline, costTotal,
  emptyDraft, emptyState, validateTrip, exportPayload, importPayload,
};
if (typeof module !== 'undefined' && module.exports) module.exports = L;
if (typeof window !== 'undefined') window.L = L;
