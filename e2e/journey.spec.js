/**
 * The core product loop across the website and the admin panel:
 * register → fill the biodata → submit → admin approves → another family buys
 * connections → admin verifies the payment → unlock the guardian contact.
 */
import { test, expect } from '@playwright/test';
import { english, register, login, adminLogin, unique, phone, ADMIN } from './helpers.js';

test.describe.configure({ mode: 'serial' });

const groom = { name: 'E2E Groom', email: `${unique('groom')}@example.com`, phoneNumber: phone(), gender: 'male' };
const bride = { name: 'E2E Bride', email: `${unique('bride')}@example.com`, gender: 'female' };
let code;

async function next(page) {
  await page.getByRole('button', { name: /Save and continue/ }).click();
}

test('a groom creates and submits his biodata step by step', async ({ page }) => {
  await english(page);
  await register(page, groom);
  await page.goto('/dashboard/biodata');

  // 1 General
  await page.getByLabel('Groom', { exact: true }).check();
  await page.getByLabel('Marital status', { exact: true }).selectOption('never_married');
  await page.getByLabel('Date of birth', { exact: true }).fill('1994-03-15');
  await page.getByLabel('Height', { exact: true }).selectOption({ label: '5′ 8″' });
  await page.getByLabel('Religion', { exact: true }).selectOption('hindu');
  await next(page);
  // 2 Address — cascading selects
  await page.getByLabel('Permanent division', { exact: true }).selectOption('dhaka');
  await page.getByLabel('Permanent district', { exact: true }).selectOption('gazipur');
  await page.getByLabel('Permanent upazila', { exact: true }).selectOption({ label: 'Kaliakair' });
  await page.getByRole('radiogroup').first().getByLabel('No').check();
  await page.getByLabel('Present district', { exact: true }).selectOption('dhaka');
  await next(page);
  // 3 Education
  await page.getByLabel('Education method', { exact: true }).selectOption('general');
  await page.getByLabel('Highest education', { exact: true }).selectOption('masters');
  await next(page);
  // 4 Family
  await page.getByLabel('Family economic status', { exact: true }).selectOption('middle');
  await next(page);
  // 5 Personal, 6 Faith (Hindu questions appear)
  await next(page);
  await expect(page.getByLabel('Gotra')).toBeVisible();
  await expect(page.getByText('Do you pray five times a day?')).toHaveCount(0);
  await next(page);
  // 7 Occupation
  await page.getByLabel('Profession', { exact: true }).selectOption('engineer');
  await next(page);
  // 8 Marriage
  await page
    .getByRole('group', { name: /guardians agree/ })
    .getByLabel('Yes')
    .check();
  await next(page);
  // 9 Expected partner
  await next(page);
  // 10 Contact — own number is rejected
  await page.getByLabel("Guardian's name", { exact: true }).fill('Mr Guardian');
  await page.getByLabel('Relationship with guardian', { exact: true }).selectOption('father');
  await page.getByLabel("Guardian's mobile number", { exact: true }).fill(groom.phoneNumber);
  await next(page);
  // 11 Photo & NID, 12 Pledge
  await page.getByRole('button', { name: /Save and continue/ }).click();
  for (const box of await page.getByRole('checkbox').all()) await box.check();
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByText('Guardian number cannot be your own number')).toBeVisible();

  await page.getByRole('button', { name: 'Contact', exact: true }).click(); // jump from the problem list
  await page.getByLabel("Guardian's mobile number", { exact: true }).fill(`018${groom.phoneNumber.slice(3)}`);
  await page.getByRole('button', { name: /12\s*Pledge/ }).click();
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByText('Submitted for review')).toBeVisible();
  await expect(page.locator('.pill').filter({ hasText: 'Under review' })).toBeVisible();
});

test('an admin reviews and approves it', async ({ page }) => {
  await english(page);
  await adminLogin(page);
  await page.getByRole('link', { name: /Biodata approvals/ }).click();
  const row = page.getByRole('row').filter({ hasText: groom.email });
  await row.getByRole('link', { name: 'Review' }).click();
  await expect(page.getByText('Mr Guardian')).toBeVisible(); // staff see the private contact
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.locator('.pill').filter({ hasText: 'Approved' }).first()).toBeVisible();
  code = (await page.getByRole('heading', { level: 1 }).innerText()).match(/GH-\d+/)[0];
});

test('a bride pays by bKash, the payment is verified, and she unlocks the contact', async ({ page, context }) => {
  await english(page);
  await register(page, bride);
  await page.goto('/packages');
  await page.getByRole('radiogroup').first().getByRole('radio').first().check(); // Starter: 3 connections
  await page.getByLabel(/bKash/).first().check();
  await page.getByLabel('Number you paid from').fill('01811112222');
  const trx = unique('TRX').toUpperCase();
  await page.getByLabel('Transaction ID (TrxID)').fill(trx);
  await page.getByRole('button', { name: 'Submit for verification' }).click();
  await expect(page.getByText('Payment submitted')).toBeVisible();

  const admin = await context.newPage();
  await english(admin);
  await adminLogin(admin);
  await admin.goto(`${ADMIN}/payments`);
  await admin.getByRole('row').filter({ hasText: trx }).getByRole('button', { name: 'Approve' }).click();
  await expect(admin.getByRole('row').filter({ hasText: trx })).toHaveCount(0);
  await admin.close();

  await page.goto(`/biodatas/${code}`);
  await expect(page.getByText(/Your balance: 3 connections/)).toBeVisible();
  await page.getByRole('button', { name: 'Unlock with 1 connection' }).click();
  await expect(page.getByRole('link', { name: /018/ })).toBeVisible();
  await page.goto('/dashboard/unlocked');
  await expect(page.getByText(code)).toBeVisible();
  await page.goto('/dashboard');
  await expect(page.locator('.panel')).toContainText('2');
});

test('the groom sees the visit and can sign in by phone', async ({ page }) => {
  await english(page);
  await login(page, `+88${groom.phoneNumber}`);
  await expect(page.locator('.stat').filter({ hasText: 'Visits today' })).toContainText('1');
});
