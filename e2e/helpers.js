import { expect } from '@playwright/test';

export const API = 'http://localhost:5000';
export const ADMIN = 'http://localhost:5173';
export const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@ghotok.com.bd';
export const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe!2026';

/** Use the English UI (the default is Bangla). */
export async function english(page) {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: 'http://localhost:3000' }]);
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ghotok_admin_lang', 'en');
    } catch {
      /* ignore */
    }
  });
}

let n = 0;
export const unique = (prefix) => `${prefix}${Date.now().toString(36)}${(n += 1)}`;

/** Bangladeshi mobile numbers that do not collide between runs. */
export const phone = () => `017${String(Date.now()).slice(-8)}`;

export async function register(page, { name, email, password = 'password123', gender = 'male', phoneNumber }) {
  await page.goto('/register');
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel(gender === 'male' ? 'Male' : 'Female', { exact: true }).check();
  await page.getByLabel('Email', { exact: true }).fill(email);
  if (phoneNumber) await page.getByLabel('Mobile number').fill(phoneNumber);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('checkbox', { name: /I agree/ }).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function login(page, identifier, password = 'password123') {
  await page.goto('/login');
  await page.getByLabel('Email or mobile number').fill(identifier);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function adminLogin(page) {
  await page.goto(ADMIN);
  await page.getByLabel('Email or mobile number').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('navigation', { name: 'Admin' })).toBeVisible();
}

/** Get an API token directly (for setup steps that are not under test). */
export async function apiToken(request, identifier, password) {
  const res = await request.post(`${API}/api/auth/login`, { data: { identifier, password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).token;
}
