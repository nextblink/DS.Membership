const { chromium } = require('playwright')
const path = require('path')

const BASE = 'http://localhost:5180'
const API  = 'http://localhost:5145'
const OUT  = path.join(__dirname)
const EMAIL = 'admin@local.com'
const PASSWORD = 'Admin123!'

async function shot(page, name) {
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true })
  console.log(`✓ ${name}.png`)
}

;(async () => {
  const browser = await chromium.launch()

  // --- Desktop context (1440×900) ---
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await desktop.newPage()

  // Set Serbian language
  await page.goto(BASE)
  await page.evaluate(() => localStorage.setItem('i18nextLng', 'sr'))

  // 01 Login
  await page.goto(`${BASE}/login`)
  await shot(page, '01-login')

  // Log in
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('[data-testid="login-submit"]')
  await page.waitForURL('**/dashboard')

  // 02 Dashboard
  await shot(page, '02-dashboard')

  // 03 Members list
  await page.goto(`${BASE}/members`)
  await shot(page, '03-members-list')

  // 04 Member create
  await page.goto(`${BASE}/members/new`)
  await shot(page, '04-member-create')

  // 05 Member details, 06 Member edit — get first ID from API
  const loginRes = await page.request.post(`${API}/api/auth/login`, {
    data: { email: EMAIL, password: PASSWORD }
  })
  const { token } = await loginRes.json()

  const membersRes = await page.request.get(`${API}/api/members?page=1&pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const firstMemberId = (await membersRes.json()).items?.[0]?.id
  if (firstMemberId) {
    await page.goto(`${BASE}/members/${firstMemberId}`)
    await shot(page, '05-member-details')
    await page.goto(`${BASE}/members/${firstMemberId}/edit`)
    await shot(page, '06-member-edit')
  }

  // 07 Forms list
  await page.goto(`${BASE}/forms`)
  await shot(page, '07-forms-list')

  // 08 QR / Upload from Phone popup (open modal on forms list)
  await page.goto(`${BASE}/forms`)
  await page.waitForLoadState('networkidle')
  const qrBtn = page.locator('button', { hasText: /phone|telefon/i }).first()
  if (await qrBtn.count()) {
    await qrBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(OUT, '08-forms-qr-popup.png'), fullPage: false })
    console.log('✓ 08-forms-qr-popup.png')
    // close modal
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  }

  // 09 Form upload / new
  await page.goto(`${BASE}/forms/new`)
  await shot(page, '09-form-upload')

  // 10 Form details — get first form ID from API
  const formsRes = await page.request.get(`${API}/api/forms?page=1&pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const firstFormId = (await formsRes.json()).items?.[0]?.id
  if (firstFormId) {
    await page.goto(`${BASE}/forms/${firstFormId}`)
    await shot(page, '10-form-details')
  }

  // 11 Org Units
  await page.goto(`${BASE}/org-units`)
  await shot(page, '11-org-units')

  // 12 Functions
  await page.goto(`${BASE}/functions`)
  await shot(page, '12-functions')

  // 13 Users
  await page.goto(`${BASE}/users`)
  await shot(page, '13-users')

  // 14 Profile
  await page.goto(`${BASE}/profile`)
  await shot(page, '14-profile')

  await desktop.close()

  // --- Mobile context (390×844, iPhone 14) ---
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 3,
  })
  const mPage = await mobile.newPage()
  await mPage.goto(`${BASE}/m/upload?jwt=${encodeURIComponent(token)}`)
  await shot(mPage, '15-mobile-upload')
  await mobile.close()

  await browser.close()
  console.log('\nAll screenshots saved to', OUT)
})()
