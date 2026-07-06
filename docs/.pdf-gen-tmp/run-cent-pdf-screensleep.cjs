
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('file:///Users/benfehnert/Documents/health-protocol-app/apps/api/output/cent-screen-sleep-anna/reports-preview.html', { waitUntil: 'networkidle0', timeout: 60000 });
  await page.pdf({
    path: "/Users/benfehnert/Documents/health-protocol-app/apps/api/output/cent-screen-sleep-anna/kind-cent-screen-sleep-anna-reports.pdf",
    format: 'A4',
    printBackground: true,
    margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' }
  });
  await browser.close();
  console.log('Wrote PDF');
})().catch((e) => { console.error(e); process.exit(1); });
