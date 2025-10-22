import { test, expect } from '@playwright/test'

test('profile theme toggle snapshots', async ({ page }) => {
  await page.goto('/profile')
  await page.setViewportSize({ width: 1024, height: 768 })
  // ensure light by default
  await page.waitForSelector('text=Theme')
  await page.screenshot({ path: 'e2e/snapshots/profile-light.png', fullPage: true })

  // switch to dark via clicking Dark label
  await page.click('label:has-text("Dark")')
  // small wait for class application
  await page.waitForTimeout(200)
  await page.screenshot({ path: 'e2e/snapshots/profile-dark.png', fullPage: true })
})
