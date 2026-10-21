import { test, expect } from '@playwright/test';
import { english } from './helpers.js';

test.describe('public website', () => {
  test('home page in Bangla by default, switchable to English and dark mode', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('পরিবার');
    const toggles = page.locator('.site-header .seg').first();
    if (!(await toggles.isVisible())) await page.getByRole('button', { name: 'মেনু' }).click();
    await page.getByRole('button', { name: 'EN' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('families meet');
    await page.getByRole('button', { name: 'Dark mode' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('search with filters and open a biodata without leaking contact details', async ({ page, isMobile }) => {
    await english(page);
    await page.goto('/biodatas?religion=muslim');
    const cards = page.locator('.bio-card');
    await expect(cards.first()).toBeVisible();
    for (const text of await cards.locator('.meta').allInnerTexts()) expect(text).toContain('Muslim');

    if (isMobile) await page.locator('label[for=show-filters]').click();
    const division = page.getByLabel('Division').first();
    await expect(division.locator('option', { hasText: /\(\d+\)/ }).first()).toBeAttached(); // live counts
    await division.selectOption('dhaka');
    await expect(page.getByLabel('District').first().locator('option')).toContainText(['Gazipur']);

    await cards
      .first()
      .getByRole('link', { name: /View biodata/ })
      .click();
    await expect(page).toHaveURL(/\/biodatas\/GH-\d+/);
    await expect(page.getByRole('heading', { name: 'General information' })).toBeVisible();
    await expect(page.getByText('Log in to unlock')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/01710\d{6}/); // demo guardian numbers stay hidden
  });

  test('static pages, child safety and contact form', async ({ page }) => {
    await english(page);
    for (const [path, heading] of [
      ['/faq', 'Frequently asked questions'],
      ['/guide', 'How to use Ghotok'],
      ['/child-safety', 'Child safety policy'],
      ['/privacy-policy', 'Privacy policy'],
      ['/resources', 'Downloads'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    }
    await page.goto('/contact');
    await page.getByLabel('Your name').fill('E2E Visitor');
    await page.getByLabel('Email', { exact: true }).fill('visitor@example.com');
    await page.getByLabel('Subject').fill('Question about verification');
    await page.getByLabel('Message').fill('How long does NID verification usually take?');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Your message has reached our team')).toBeVisible();
  });

  test('mobile tab bar', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phones only');
    await english(page);
    await page.goto('/');
    const tabs = page.getByRole('navigation', { name: 'Quick links' });
    await expect(tabs).toBeVisible();
    await tabs.getByRole('link', { name: 'Search' }).click();
    await expect(page).toHaveURL(/\/biodatas/);
  });
});
