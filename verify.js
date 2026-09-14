/* Re-measure the lowest PASSING batch readings with wut.js itself, at the same width and
   lens value, to make sure none of them is a batch artefact. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const S = '/tmp/claude-0/-home-user-nathanhaslewoodportfolio/57f13989-f2af-5763-9724-d30af51d07b8/scratchpad';
const { withThreeAt } = require(S + '/harness2.js');
const { worstUnderText } = require(S + '/wut.js');
const CASES = [
  [390, 0.625, '.pagehead .eyebrow', 'designed'],
  [390, 0.625, '.lens-head-in .lens-k dt', 'outside main'],
  [390, 0.8125, '.lens-ld b', 'Audit of main'],
  [1280, 0.8125, '.lens-ld b', 'Audit of main'],
  [390, 0.625, '.pagehead .eyebrow .path', '/systems/'],
  [390, 0.5625, '.lens-navnote', 'navnote'],
  [1280, 0.8125, '.lens-head-in .lens-cap', 'cap'],
  [1280, 0.25, '.sim-eyebrow', 'eyebrow'],
  [1280, 0.3125, '.outcomes > div:nth-child(1) p', 'outcome p'],
  [1280, 0.625, '.lens-tag', 'tag'],
];
(async () => {
  const b = await chromium.launch();
  for (const [w, lv, sel, note] of CASES) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await withThreeAt(page, 'http://127.0.0.1:8000');
    await page.goto('http://127.0.0.1:8000/systems/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.lens-ctl'); await page.waitForTimeout(3000);
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    await page.evaluate(v => {
      document.body.style.setProperty('--lens', v.toFixed(4));
      document.body.classList.toggle('lens-open', v > 0.0001);
      document.body.classList.toggle('lens-goog', v >= 0.5);
      document.body.classList.toggle('lens-ai', v >= 1.5);
    }, lv);
    await page.waitForTimeout(400);
    const loc = page.locator(sel).last();
    await loc.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForTimeout(300);
    const r = await worstUnderText(page, loc);
    const t = await loc.evaluate(e => e.textContent.trim().slice(0, 28));
    console.log('w=' + w + ' lens=' + lv + ' ' + sel.padEnd(30) + ' -> ' + JSON.stringify(r) + '  "' + t + '"');
    await ctx.close();
  }
  await b.close();
})();
