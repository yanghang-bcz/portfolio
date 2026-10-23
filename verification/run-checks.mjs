/* Runs verification/check.html in real Chrome and writes verification/checks.json.
 *
 *   python3 -m http.server 4173 --bind 127.0.0.1     # from the repo root
 *   NODE_PATH=… node verification/run-checks.mjs
 *
 * check.html embeds ../index.html in an iframe and drives it with real events, so this
 * runner only has to open the harness, wait for the `data-done` flag and read the JSON.
 */
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const here = path.dirname(fileURLToPath(import.meta.url));
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:4173';
const timeout = Number(process.env.QA_TIMEOUT || 180000);

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-proxy-server'], // the machine runs a system proxy; keep loopback direct
});
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto(`${origin}/verification/check.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.done === 'true', null, { timeout, polling: 250 });

  const raw = await page.evaluate(() => document.querySelector('#result').textContent);
  const report = JSON.parse(raw);
  const passed = report.results.filter(r => r.pass).length;
  const score = `${passed}/${report.results.length}`;

  const failures = report.results.filter(r => !r.pass);
  await writeFile(path.join(here, 'checks.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`passed= ${report.passed === report.results.length} score= ${score}`);
  for (const f of failures) console.log(`  FAIL ${f.name}${f.detail ? ` ${JSON.stringify(f.detail)}` : ''}`);
  process.exitCode = failures.length ? 1 : 0;
} finally {
  await browser.close();
}
