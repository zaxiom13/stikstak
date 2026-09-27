// Screenshots of the ?demo mode (simulated neighbours), light and dark.
import { chromium, devices } from 'playwright-core'
const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = new URL('../screenshots/', import.meta.url).pathname
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-proxy-server'] })
for (const scheme of ['light', 'dark']) {
  const page = await (await browser.newContext({ ...devices['iPhone 13'], colorScheme: scheme })).newPage()
  page.on('pageerror', e => console.log('pageerror', e.message))
  await page.goto(`${BASE}/?demo`)
  if (scheme === 'light') await page.screenshot({ path: `${OUT}0-welcome.png` })
  await page.getByRole('button', { name: /UT Austin/ }).click()
  await page.getByTestId('yak').first().waitFor()
  await page.getByRole('tab', { name: /Hot/ }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}demo-hot-${scheme}.png` })
}
await browser.close()
