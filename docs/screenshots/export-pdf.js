const { chromium } = require('playwright')
const path = require('path')

const HTML = path.join(__dirname, '..', 'user-manual.html')
const OUT  = path.join(__dirname, '..', 'user-manual.pdf')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto(`file:///${HTML.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000) // let fonts/images settle

  await page.pdf({
    path: OUT,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  })

  await browser.close()
  console.log('✓ user-manual.pdf')
})()
