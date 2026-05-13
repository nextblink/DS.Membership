const { chromium } = require('playwright')
const path = require('path')

const BASE = 'http://localhost:5180'
const OUT  = path.join(__dirname)
const EMAIL = 'admin@local.com'
const PASSWORD = 'Admin123!'

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await page.goto(BASE)
  await page.evaluate(() => localStorage.setItem('i18nextLng', 'sr'))

  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('[data-testid="login-submit"]')
  await page.waitForURL('**/dashboard')

  // Wait for network idle then extra 3s for chart animations to finish
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)

  await page.screenshot({ path: path.join(OUT, '02-dashboard.png'), fullPage: true })
  console.log('✓ 02-dashboard.png')

  await browser.close()
})()
