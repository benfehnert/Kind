
const fs = require('fs');
const puppeteer = require('puppeteer');
(async () => {
  const html = fs.readFileSync("/Users/benfehnert/Documents/health-protocol-app/apps/api/output/onboarding-flow/onboarding-flow-preview.html", 'utf8');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.pdf({
      path: "/Users/benfehnert/Documents/health-protocol-app/apps/api/output/onboarding-flow/kind-onboarding-flow.pdf",
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });
    console.log('Wrote PDF');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
