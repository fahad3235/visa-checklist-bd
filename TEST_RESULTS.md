# TEST RESULTS — visa-checklist-bd (run 286, 18:00 slot, 2026-11-09)

## Unit tests — 22/22 pass
`node --test tests/logic.test.js` (exit 0, ~165 ms)

- Checklist composition: tourist/general 13, student/general 18, work/usa 19,
  umrah/saudi 16, tourist/schengen 14, medical/uk 16; unknown purpose/destination
  falls back to tourist/general (13).
- Progress: 3/13 = 23%; 0/0 = 0%; over-count clamps to 100%.
- Dates: `isValidDateStr` rejects 2026-02-30 / bad formats; `addDays` crosses
  months (2026-12-24 −60d = 2026-10-25); `daysBetween` exact.
- Timeline (today 2026-11-09, travel 2026-12-24): gather 2026-10-25 overdue
  (−15d), apply 2026-11-09 due-soon (0d), bio 2026-11-24 (15d), decision
  2026-12-10 (31d), travel 2026-12-24 (45d); bad dates rejected.
- Money: `parseAmount` handles commas, taka sign and Bengali digits
  (1,500.50 / ১,৫০০.৫০ → 150050 paisa); rejects empty/negative/3-decimal
  input; `formatMoney` localises digits; `costTotal` 15,000 + 2,500 + 1,000
  × 3 travellers = ৳55,500.00; missing lines = 0; travellers clamped 1–10.
- Trips/import: `validateTrip` accepts a good trip, rejects bad purpose/date/
  name/travellers/cost/custom; export→import round-trip preserves the trip;
  wrong app, wrong version, bad JSON and bad trip all rejected.

Repairs: 1 test-side fix (assertion used `"app": "visa-checklist-bd"` with a
space; `JSON.stringify` emits no space). 0 app bugs in unit tests.

## Smoke tests — 59/59 pass
`node tests/smoke.js` (raw CDP, headless_shell-1187, `?asof=2026-11-09`, exit 0)

Hand-verified in the real DOM: 13 default items; check passport → 1/13, 8%,
struck through; student → 18 items (SOP present); work + USA → 19 items
(DS-160 present); custom item add/delete; reset → 0/13; timeline 5 milestones
with gather 25/10/2026 overdue and 45 days to travel; costs 15,000 + 2,500 × 3
= ৳17,500.00 per person / ৳52,500.00 total; invalid cost shows an error;
save trip → reload persists → delete removes; export/import round-trip with
wrong-app and malformed-JSON rejection leaving data intact; typed-DELETE erase
via UI (wrong word rejected, data kept); BN toggle shows Bengali title/tab/
checklist label and persists after reload; 390px no horizontal overflow on all
5 tabs; zero non-file network requests; 0 console/page errors.

Repairs: 1 real app bug found by the first smoke run — `logic.js` never
exposed a browser global `L` (only `module.exports`), so `app.js` threw
`ReferenceError: L is not defined` at boot and rendered 0 items. Fixed by
exporting `const L = {...}` plus `window.L = L`. The first re-run after the
fix still recorded one stale `L is not defined` exception from a navigation
race while 58/59 checks passed; a clean re-run passed 59/59 with 0 errors.
