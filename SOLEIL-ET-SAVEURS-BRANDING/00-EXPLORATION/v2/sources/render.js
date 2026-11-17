// Usage: node render.js page.html out.png width height [scale] [fullPage]
const { chromium } = require('playwright');
(async () => {
  const [,, html, out, w, h, scale = '1', full = '0'] = process.argv;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +scale });
  await page.goto('file://' + require('path').resolve(html));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await page.screenshot({ path: out, fullPage: full === '1' });
  await browser.close();
})();
