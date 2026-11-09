# Visa Checklist BD

Offline bilingual (English / বাংলা) visa application checklist and planner for Bangladeshi travellers. Pick a purpose and destination, work through a tailored document checklist, plan the timeline to your travel date, estimate the costs, and save trips for later — all on your device, no account, no network.

## Features

- **Tailored checklists** — 5 purposes (Tourist, Student, Work, Medical, Umrah) × 15 destinations (General + India, Thailand, Malaysia, Singapore, UAE, Saudi Arabia, UK, USA, Schengen, Canada, Australia, China, Japan, Turkey). 12 common documents plus purpose extras (offer letter, SOP, work permit, police clearance, hospital letter, Nusuk registration…) and destination extras (DS-160 + interview for the USA, TB test for the UK, €30,000 insurance for Schengen).
- **Progress tracking** — live progress bar and count, items strike through when done, add your own custom items, reset per plan. Everything persists in localStorage.
- **Timeline planner** — enter a travel date and get milestones (start gathering documents −60 days, submit −45, biometrics/interview −30, decision buffer −14, travel day) with overdue / due-soon / upcoming badges and a days-to-travel countdown.
- **Cost estimator** — visa fee, VFS/service fee, travel insurance, photos, certificates/attestation, translation and other costs, per person × up to 10 travellers, in integer paisa (exact money math). Amounts are entered by you — no official fees are baked in.
- **My Trips** — save named trips with their checklist state, load them back, delete them.
- **Data portability** — JSON export / strict import (wrong app or malformed data is rejected and your data is left untouched) and typed-`DELETE` erase-all.
- **Bilingual** — full English / বাংলা toggle, persisted, with Bengali digits. Fully responsive (verified at 390px) and fully offline (zero network requests).

## Stack

Vanilla HTML/CSS/JavaScript, no dependencies, no build step. Logic is split into a pure, Node-testable module (`logic.js`) and DOM wiring (`app.js`); strings live in `i18n.js`.

## Prerequisites

Any modern browser. For tests: Node.js 18+ and a headless Chromium (the smoke test uses the Playwright `headless_shell` binary if present, or set `CHROME_BIN`).

## Run

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Testing

```bash
node --test tests/logic.test.js   # 22 unit tests (checklist composition, timeline dates, money math, import validation)
node tests/smoke.js               # 59 headless-Chrome checks (real DOM: toggles, timeline, costs, trips, export/import, BN toggle, 390px, zero network requests)
```

See `TEST_RESULTS.md` for the latest run.

## Deployment

Static site — any static host works. GitHub Pages (main branch, root) is the live deployment for this repo.

## Limitations

- Checklists are **general starting points**, not embassy advice. Requirements change by embassy, visa category and season — always verify with the embassy, VFS or the official website before applying. The app's disclaimer says this on the checklist tab.
- No official visa fees are included: fees change often, so every cost field starts empty and you enter the current amount.
- Data lives in the browser's localStorage only; clearing browser data erases it (export first).
- The timeline's milestone offsets (−60/−45/−30/−14 days) are planning rules of thumb, not official processing times.

## Status

Complete MVP, tested (22/22 unit + 59/59 smoke, 0 console/page errors), published.
