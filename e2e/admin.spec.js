import { test, expect } from '@playwright/test';
import { english, adminLogin, ADMIN } from './helpers.js';

test('admin panel pages load and site settings are saved', async ({ page }) => {
  test.setTimeout(180_000);
  await english(page);
  await adminLogin(page);
  for (const [path, heading] of [
    ['/', 'Overview'],
    ['/payments', 'Payments'],
    ['/reports', 'Reports and complaints'],
    ['/tickets', 'Support tickets'],
    ['/users', 'Users and roles'],
    ['/contact', 'Contact inbox'],
    ['/resources', 'Downloads'],
    ['/audit', 'Audit log'],
  ]) {
    await page.goto(`${ADMIN}${path}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
  }

  await page.goto(`${ADMIN}/settings`);
  await page.getByLabel('Support phone').fill('01700000000');
  await page.getByLabel('Announcement (English)').fill('Office closed on Friday');
  await page.getByLabel('Announcement (Bangla)').fill('শুক্রবার অফিস বন্ধ');
  await page.getByLabel('Show the announcement').check();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved')).toBeVisible();

  // The website shows it (the website caches settings for 30 seconds).
  await expect(async () => {
    await page.goto('/');
    await expect(page.locator('.announcement')).toHaveText('Office closed on Friday', { timeout: 1000 });
  }).toPass({ timeout: 120_000, intervals: [5000] });
});

test('payments export downloads a CSV', async ({ page }) => {
  await english(page);
  await adminLogin(page);
  await page.goto(`${ADMIN}/payments`);
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ]);
  expect(file.suggestedFilename()).toMatch(/ghotok-payments-\d{4}-\d{2}-\d{2}\.csv/);
});
