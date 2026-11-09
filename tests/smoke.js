// visa-checklist-bd -- headless-Chrome smoke test via raw CDP (no puppeteer dependency).
// Usage: node tests/smoke.js
// Exits non-zero on any failed assertion; fails on page console errors.
// ?asof=2026-11-09 pins "today" for timeline dates.
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 9353;
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html') + '?asof=2026-11-09';
let failures = 0;
let count = 0;
const pageErrors = [];
function check(name, cond, extra) {
  count++;
  console.log((cond ? 'ok - ' : 'FAIL - ') + name + (cond ? '' : ' :: ' + (extra || '')));
  if (!cond) failures++;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const CHROME_BIN = process.env.CHROME_BIN ||
    require('os').homedir() + '/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';
  const chrome = spawn(CHROME_BIN, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/vcbd-smoke-' + process.pid,
    'about:blank',
  ], { stdio: 'ignore' });
  let targets = [];
  for (let i = 0; i < 50 && targets.length === 0; i++) {
    await wait(200);
    try {
      targets = JSON.parse(await new Promise((res, rej) => {
        http.get('http://127.0.0.1:' + PORT + '/json/list', (r) => {
          let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(d));
        }).on('error', rej);
      }));
    } catch (e) { /* retry */ }
  }
  if (!targets.length) { console.log('FAIL - chrome did not start'); process.exit(2); }
  const wsUrl = targets[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise((res) => { ws.onopen = res; });
  let seq = 0; const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      pageErrors.push('exception: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 300));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      pageErrors.push('console.error: ' + JSON.stringify(msg.params.args).slice(0, 300));
    }
  };
  function send(method, params) {
    return new Promise((res) => {
      const id = ++seq;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: FILE });
  await wait(1500);
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) return { error: JSON.stringify(r.result.exceptionDetails).slice(0, 300) };
    return r.result ? r.result.result.value : undefined;
  };
  const T = '\u09f3'; // taka sign
  const BN = (s) => s.replace(/[0-9]/g, (d) => '\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef'[+d]);

  check('page title contains Visa Checklist', (await ev('document.title'))?.includes('Visa Checklist'));
  check('5 tabs render', (await ev(`document.querySelectorAll('.tab').length`)) === 5);
  check('checklist tab visible by default', (await ev(`document.getElementById('tab-checklist').hidden`)) === false);
  check('disclaimer renders', (await ev(`document.getElementById('disclaimer').textContent.length`)) > 40);
  check('disclaimer names embassy verification', (await ev(`document.getElementById('disclaimer').textContent`)).includes('embassy'));

  // Default: tourist/general -> 13 items, 0% progress.
  check('default checklist has 13 items', (await ev(`document.querySelectorAll('#checklist li').length`)) === 13);
  check('default progress 0 / 13', (await ev(`document.getElementById('progressText').textContent`)).includes('0 / 13'));
  check('passport item present', (await ev(`document.getElementById('checklist').textContent`)).includes('Passport valid 6+ months'));

  // Check one item -> progress 1 / 13, 8%.
  await ev(`document.querySelector('#checklist input[type=checkbox]').click()`);
  check('checking passport -> 1 / 13', (await ev(`document.getElementById('progressText').textContent`)).includes('1 / 13'));
  check('progress bar 8%', (await ev(`document.getElementById('progressBar').style.width`)) === '8%');
  check('checked item struck through', (await ev(`document.querySelector('#checklist li').classList.contains('done')`)) === true);

  // Purpose switch: student -> 18 items; work + usa -> 19 items.
  await ev(`window.__vcbd.eraseAll()`);
  await ev(`document.getElementById('purposeSel').value='student'; document.getElementById('purposeSel').dispatchEvent(new Event('change',{bubbles:true}))`);
  check('student checklist has 18 items', (await ev(`document.querySelectorAll('#checklist li').length`)) === 18);
  check('student item SOP present', (await ev(`document.getElementById('checklist').textContent`)).includes('Statement of purpose'));
  await ev(`document.getElementById('purposeSel').value='work'; document.getElementById('purposeSel').dispatchEvent(new Event('change',{bubbles:true}))`);
  await ev(`document.getElementById('destSel').value='usa'; document.getElementById('destSel').dispatchEvent(new Event('change',{bubbles:true}))`);
  check('work/usa checklist has 19 items', (await ev(`document.querySelectorAll('#checklist li').length`)) === 19);
  check('DS-160 item present', (await ev(`document.getElementById('checklist').textContent`)).includes('DS-160'));
  await ev(`document.getElementById('purposeSel').value='tourist'; document.getElementById('purposeSel').dispatchEvent(new Event('change',{bubbles:true}))`);
  await ev(`document.getElementById('destSel').value='general'; document.getElementById('destSel').dispatchEvent(new Event('change',{bubbles:true}))`);

  // Custom item: add -> 14 items; delete -> back to 13.
  await ev(`document.getElementById('customInput').value='Extra passport photos'; document.getElementById('addCustomBtn').click()`);
  check('custom item added -> 14 items', (await ev(`document.querySelectorAll('#checklist li').length`)) === 14);
  check('custom item label renders', (await ev(`document.getElementById('checklist').textContent`)).includes('Extra passport photos'));
  await ev(`document.querySelector('#checklist .del-item').click()`);
  check('custom item deleted -> 13 items', (await ev(`document.querySelectorAll('#checklist li').length`)) === 13);

  // Reset: check two, reset -> 0%.
  await ev(`document.querySelectorAll('#checklist input[type=checkbox]')[0].click(); document.querySelectorAll('#checklist input[type=checkbox]')[1].click();`);
  check('two checked -> 2 / 13', (await ev(`document.getElementById('progressText').textContent`)).includes('2 / 13'));
  await ev(`document.getElementById('resetBtn').click()`);
  check('reset -> 0 / 13', (await ev(`document.getElementById('progressText').textContent`)).includes('0 / 13'));

  // Timeline: travel 2026-12-24, asof 2026-11-09 -> 5 milestones, gather overdue.
  await ev(`document.getElementById('travelDate').value='2026-12-24'; document.getElementById('travelDate').dispatchEvent(new Event('change',{bubbles:true}))`);
  await ev(`document.getElementById('tabbtn-timeline').click()`);
  check('timeline has 5 milestones', (await ev(`document.querySelectorAll('#timelineList li').length`)) === 5);
  check('gather milestone date 25/10/2026', (await ev(`document.getElementById('timelineList').textContent`)).includes('25/10/2026'));
  check('gather milestone overdue', (await ev(`document.querySelector('#timelineList li .badge').textContent`)).includes('Overdue'));
  check('travel summary 45 days', (await ev(`document.getElementById('travelSummary').textContent`)).includes('45'));

  // Costs: visa 15000 + service 2500, 3 travellers -> per person 17,500.00, total 52,500.00.
  await ev(`document.getElementById('tabbtn-costs').click()`);
  const setCost = async (key, val) => {
    await ev(`var el=document.getElementById('cost-${key}'); el.value='${val}'; el.dispatchEvent(new Event('input',{bubbles:true}))`);
  };
  await setCost('visaFee', '15000');
  await setCost('serviceFee', '2500');
  await ev(`document.getElementById('travellersInput').value='3'; document.getElementById('travellersInput').dispatchEvent(new Event('input',{bubbles:true}))`);
  check('per person ' + T + '17,500.00', (await ev(`document.getElementById('perPersonTotal').textContent`)) === T + '17,500.00');
  check('total ' + T + '52,500.00', (await ev(`document.getElementById('grandTotal').textContent`)) === T + '52,500.00');
  // Invalid cost shows error.
  await setCost('photos', 'abc');
  check('invalid cost shows error', (await ev(`document.getElementById('costErr').hidden`)) === false);
  await setCost('photos', '500');
  check('valid cost clears error', (await ev(`document.getElementById('costErr').hidden`)) === true);
  check('total now ' + T + '54,000.00', (await ev(`document.getElementById('grandTotal').textContent`)) === T + '54,000.00');

  // Trips: save + reload persistence + delete.
  await ev(`window.__vcbd.eraseAll()`);
  await ev(`document.getElementById('purposeSel').value='tourist'; document.getElementById('purposeSel').dispatchEvent(new Event('change',{bubbles:true}))`);
  await ev(`document.getElementById('travelDate').value='2026-12-24'; document.getElementById('travelDate').dispatchEvent(new Event('change',{bubbles:true}))`);
  await ev(`document.querySelectorAll('#checklist input[type=checkbox]')[0].click()`);
  await ev(`document.getElementById('tabbtn-trips').click()`);
  await ev(`document.getElementById('tripName').value='Thailand family trip'; document.getElementById('saveBtn').click();`);
  check('saved message shows', (await ev(`document.getElementById('saveMsg').hidden`)) === false);
  check('trip row shows name', (await ev(`document.getElementById('tripList').textContent`)).includes('Thailand family trip'));
  check('trip row shows 8% progress', (await ev(`document.getElementById('tripList').textContent`)).includes('8%'));
  await send('Page.navigate', { url: FILE });
  await wait(1200);
  await ev(`document.getElementById('tabbtn-trips').click()`);
  check('trip persists after reload', (await ev(`document.getElementById('tripList').textContent`)).includes('Thailand family trip'));
  await ev(`document.querySelector('#tripList .trip-actions .btn.small.danger').click()`);
  check('delete removes trip', (await ev(`document.querySelectorAll('#tripList li').length`)) === 0);
  check('empty state returns', (await ev(`document.getElementById('noTrips').hidden`)) === false);

  // Export / import round-trip + malformed import rejected, data intact.
  await ev(`document.getElementById('tabbtn-checklist').click()`);
  await ev(`document.getElementById('travelDate').value='2026-12-24'; document.getElementById('travelDate').dispatchEvent(new Event('change',{bubbles:true}))`);
  await ev(`document.getElementById('tabbtn-trips').click()`);
  await ev(`document.getElementById('tripName').value='Roundtrip'; document.getElementById('saveBtn').click();`);
  const payload = await ev(`window.__vcbd.exportPayload()`);
  check('export payload is visa-checklist-bd v1', payload.includes('"app":"visa-checklist-bd"') && payload.includes('"version":1'), payload);
  check('export payload carries saved trip', payload.includes('Roundtrip'));
  await ev(`window.__vcbd.eraseAll()`);
  check('eraseAll clears trips', (await ev(`window.__vcbd.exportPayload()`)).includes('"trips":[]'));
  const imp = await ev(`JSON.stringify(window.__vcbd.importPayload(${JSON.stringify(payload)}))`);
  check('import valid payload ok', imp.includes('"ok":true'), imp);
  check('import restores saved trip', (await ev(`JSON.stringify(window.__vcbd.exportPayload())`)).includes('Roundtrip'));
  const badImp = await ev(`JSON.stringify(window.__vcbd.importPayload('{"app":"bus-fare-bd","version":1}'))`);
  check('import wrong app rejected', badImp.includes('"ok":false'));
  check('invalid import leaves data intact', (await ev(`JSON.stringify(window.__vcbd.exportPayload())`)).includes('Roundtrip'));
  const badJson = await ev(`JSON.stringify(window.__vcbd.importPayload('{not json'))`);
  check('malformed JSON rejected', badJson.includes('"ok":false'));
  await ev(`window.__vcbd.eraseAll()`);

  // Data tab: typed-DELETE erase via UI; wrong word rejected.
  await ev(`document.getElementById('tabbtn-trips').click()`);
  await ev(`document.getElementById('tripName').value='EraseTest'; document.getElementById('saveBtn').click();`);
  await ev(`document.getElementById('tabbtn-data').click()`);
  await ev(`document.getElementById('eraseInput').value='delete'; document.getElementById('eraseBtn').click();`);
  check('wrong erase word rejected', (await ev(`document.getElementById('eraseWrong').hidden`)) === false);
  check('wrong erase keeps data', (await ev(`JSON.stringify(window.__vcbd.exportPayload())`)).includes('EraseTest'));
  await ev(`document.getElementById('eraseInput').value='DELETE'; document.getElementById('eraseBtn').click();`);
  check('DELETE erases data', (await ev(`window.__vcbd.exportPayload()`)).includes('"trips":[]'));
  check('erase success message shows', (await ev(`document.getElementById('erasedMsg').hidden`)) === false);

  // Language toggle: Bengali title + checklist label, persists after reload.
  await ev(`document.getElementById('langBtn').click()`);
  check('BN toggle: title in Bengali', (await ev(`document.getElementById('title').textContent`)) === '\u09ad\u09bf\u09b8\u09be \u099a\u09c7\u0995\u09b2\u09bf\u09b8\u09cd\u099f \u09ac\u09bf\u09a1\u09bf');
  check('BN toggle: tab label in Bengali', (await ev(`document.getElementById('tabbtn-checklist').textContent`)) === '\u099a\u09c7\u0995\u09b2\u09bf\u09b8\u09cd\u099f');
  check('BN toggle: passport label in Bengali', (await ev(`document.getElementById('checklist').textContent`)).includes('\u09aa\u09be\u09b8\u09aa\u09cb\u09b0\u09cd\u099f'));
  await send('Page.navigate', { url: FILE });
  await wait(1200);
  check('BN toggle persists after reload', (await ev(`window.__vcbd.state.lang`)) === 'bn');
  await ev(`document.getElementById('langBtn').click()`);
  check('back to EN', (await ev(`window.__vcbd.state.lang`)) === 'en');

  // Mobile 390px: no horizontal overflow on checklist + timeline + costs + trips + data tabs.
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: FILE });
  await wait(1200);
  const overflow = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  check('390px no horizontal overflow (checklist)', overflow <= 0, 'overflow=' + overflow);
  await ev(`document.getElementById('tabbtn-timeline').click()`);
  const overflow2 = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  check('390px no horizontal overflow (timeline)', overflow2 <= 0, 'overflow=' + overflow2);
  await ev(`document.getElementById('tabbtn-costs').click()`);
  const overflow3 = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  check('390px no horizontal overflow (costs)', overflow3 <= 0, 'overflow=' + overflow3);
  await ev(`document.getElementById('tabbtn-trips').click()`);
  const overflow4 = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  check('390px no horizontal overflow (trips)', overflow4 <= 0, 'overflow=' + overflow4);
  await ev(`document.getElementById('tabbtn-data').click()`);
  const overflow5 = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  check('390px no horizontal overflow (data)', overflow5 <= 0, 'overflow=' + overflow5);

  // Zero network requests: app is fully offline (only file:// loads).
  const reqs = await ev(`performance.getEntriesByType('resource').map(r => r.name).filter(n => !n.startsWith('file://')).length`);
  check('zero non-file network requests', reqs === 0, 'non-file=' + reqs);

  check('no console/page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  chrome.kill();
  console.log('\n' + count + ' checks, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.log('FAIL - harness error: ' + e.message); try { chrome.kill(); } catch (_) {} process.exit(2); });
