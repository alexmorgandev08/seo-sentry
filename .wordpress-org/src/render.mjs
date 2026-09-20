/*
 * Renders the listing artwork at exact pixel sizes. WordPress.org rejects
 * assets that are not precisely 128/256 square and 772x250 / 1544x500, and the
 * retina banner must be the same design at 2x rather than a separate file - so
 * both come from one source with deviceScaleFactor.
 *
 *   node .wordpress-org/src/render.mjs            (run from the plugin root)
 *   node .wordpress-org/src/render.mjs --variants (render the icon concepts)
 */
import { chromium } from '@playwright/test'
import path from 'node:path'

const here = path.dirname(new URL(import.meta.url).pathname)
const out = path.join(here, '..', 'assets')
const variantsOnly = process.argv.includes('--variants')

const jobs = variantsOnly
  ? [
      ['icon-a.html', 'concept-a.png', 256, 256, 1],
      ['icon-b.html', 'concept-b.png', 256, 256, 1],
      ['icon-c.html', 'concept-c.png', 256, 256, 1]
    ]
  : [
      ['icon.html', 'icon-128x128.png', 128, 128, 1],
      ['icon.html', 'icon-256x256.png', 256, 256, 1],
      ['banner.html', 'banner-772x250.png', 772, 250, 1],
      ['banner.html', 'banner-1544x500.png', 772, 250, 2]
    ]

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
for (const [src, name, width, height, deviceScaleFactor] of jobs) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor })
  await page.goto('file://' + path.join(here, src))
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path.join(out, name), omitBackground: true })
  await page.close()
  console.log(`  ${name}  ${width * deviceScaleFactor}x${height * deviceScaleFactor}`)
}
await browser.close()
