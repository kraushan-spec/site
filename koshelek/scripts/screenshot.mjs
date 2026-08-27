import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3107";
const OUT_DIR = process.argv[3] || "/tmp";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();

await page.goto(`${BASE}/login`);
await page.fill('input[type="email"]', "demo@koshelek.online");
await page.fill('input[type="password"]', "demo12345");
await page.getByRole("button", { name: "Войти" }).click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT_DIR}/screenshot-dashboard.png`, fullPage: true });

await page.goto(`${BASE}/tenders`);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT_DIR}/screenshot-tenders.png`, fullPage: true });

const contractLink = await page.$('a[href^="/tenders/"]');
if (contractLink) {
  await contractLink.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT_DIR}/screenshot-contract-detail.png`, fullPage: true });
}

await page.goto(`${BASE}/calendar`);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT_DIR}/screenshot-calendar.png`, fullPage: true });

// Mobile viewport
await context.close();
const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobilePage = await mobileContext.newPage();
await mobilePage.goto(`${BASE}/login`);
await mobilePage.fill('input[type="email"]', "demo@koshelek.online");
await mobilePage.fill('input[type="password"]', "demo12345");
await mobilePage.getByRole("button", { name: "Войти" }).click();
await mobilePage.waitForURL(`${BASE}/`, { timeout: 15000 });
await mobilePage.waitForTimeout(1500);
await mobilePage.screenshot({ path: `${OUT_DIR}/screenshot-mobile.png`, fullPage: true });

await browser.close();
console.log("done");
