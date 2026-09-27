// End-to-end proof on two emulated phones:
//   1. Phone A posts a yak; it reaches phone B over WebRTC.
//   2. B upvotes and replies; A sees both.
//   3. The Firebase database holds no yak text, only WebRTC handshakes.
// Needs `npm run emulators` and `npm run dev` running. Screenshots go to ./screenshots.
import { chromium, devices } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const DB = 'http://localhost:9000'
const OUT = new URL('../screenshots/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-proxy-server'],
})
const phone = devices['iPhone 13']
const open = async name => {
  const ctx = await browser.newContext({ ...phone, colorScheme: 'light' })
  const page = await ctx.newPage()
  page.on('pageerror', e => console.log(`[${name}] pageerror`, e.message))
  await page.goto(`${BASE}/?emulator`)
  await page.getByRole('button', { name: /UC Berkeley/ }).click()
  return page
}
const step = msg => console.log(`✔ ${msg}`)
const shot = async (page, name) => { await page.waitForTimeout(500); return page.screenshot({ path: `${OUT}${name}.png` }) }

try {
  const a = await open('A')
  const b = await open('B')
  await a.getByTestId('herd').filter({ hasText: '2 yakkers' }).waitFor({ timeout: 30000 })
  await b.getByTestId('herd').filter({ hasText: '2 yakkers' }).waitFor({ timeout: 30000 })
  step('both phones found each other over WebRTC')

  const text = `Free pizza at the library steps, ${Date.now() % 10000}`
  await a.getByTestId('fab').click()
  await a.getByTestId('compose-input').fill(text)
  await b.getByText('Someone nearby is writing a yak').waitFor({ timeout: 10000 })
  step('phone B sees "someone is writing" (P2P typing signal)')
  await shot(a, '1-compose')
  await a.getByTestId('send').click()

  const bYak = b.getByTestId('yak').filter({ hasText: text })
  await bYak.waitFor({ timeout: 15000 })
  step('yak posted on A arrived on B')
  await bYak.getByRole('button', { name: 'Upvote' }).click()
  const aYak = a.getByTestId('yak').filter({ hasText: text })
  await aYak.getByTestId('score').filter({ hasText: /^1$/ }).waitFor({ timeout: 10000 })
  step('B upvoted, A sees score 1')

  await bYak.click()
  await b.getByTestId('reply-bar').click()
  await b.getByTestId('compose-input').fill('omw 🏃')
  await b.getByTestId('send').click()
  await aYak.locator('.replies').filter({ hasText: '1' }).waitFor({ timeout: 10000 })
  await aYak.click()
  await a.getByTestId('reply').filter({ hasText: 'omw' }).waitFor({ timeout: 10000 })
  step('B replied, A sees the reply with an anonymous icon')
  await shot(a, '2-thread')
  await a.getByRole('button', { name: 'Back' }).click()
  await b.getByRole('button', { name: 'Back' }).click()
  await shot(b, '3-feed-phone-b')

  // A late joiner receives history from the phones already there.
  const c = await open('C')
  await c.getByTestId('yak').filter({ hasText: text }).waitFor({ timeout: 30000 })
  step('late-joining phone C got the yak from its peers (no server copy)')

  const dump = await (await fetch(`${DB}/.json?ns=demo-stikstak`, { headers: { Authorization: 'Bearer owner' } })).text()
  if (dump.includes('pizza') || dump.includes('omw')) throw new Error('yak text found in Firebase!')
  step(`Firebase holds no yak text (${dump.length} bytes of handshake data only)`)
  await b.getByRole('button', { name: /Me/ }).click()
  await shot(b, '4-me')
  console.log('\nALL CHECKS PASSED')
} catch (e) {
  console.error('E2E FAILED:', e.message)
  process.exitCode = 1
} finally {
  await browser.close()
}
