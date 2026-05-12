import { test, expect, ROLES } from '../fixtures/fixtures';
import { selectors } from '../fixtures/selectors';

const TOKEN_KEY = 'auth.token';

test.describe('UC-AUTH — Authentication', () => {
  test('AUTH-01 valid login redirects to /dashboard with token in localStorage', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.locator(selectors.login.email).fill(ROLES.superAdmin.email);
    await page.locator(selectors.login.password).fill(ROLES.superAdmin.password);
    await page.locator(selectors.login.submit).click();

    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);

    const token = await page.evaluate((k) => localStorage.getItem(k), TOKEN_KEY);
    expect(token, 'JWT token should be persisted in localStorage').toBeTruthy();
    expect(token!.split('.').length).toBe(3); // looks like a JWT
  });

  test('AUTH-02 wrong password shows inline error and stays on /login', async ({ page }) => {
    await page.goto('/login');
    await page.locator(selectors.login.email).fill(ROLES.superAdmin.email);
    await page.locator(selectors.login.password).fill('wrong-password-xyz');
    await page.locator(selectors.login.submit).click();

    const error = page.locator(selectors.login.error);
    await expect(error).toBeVisible();
    await expect(error).toContainText(/invalid/i);
    await expect(page).toHaveURL(/\/login$/);

    const token = await page.evaluate((k) => localStorage.getItem(k), TOKEN_KEY);
    expect(token).toBeFalsy();
  });

  test('AUTH-03 logout returns to /login and clears localStorage', async ({
    page,
    loginAsUI,
  }) => {
    await loginAsUI(page, 'superAdmin');

    await page.locator(selectors.header.userMenuToggle).click();
    await page.locator(selectors.header.logout).click();

    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/\/login$/);

    const token = await page.evaluate((k) => localStorage.getItem(k), TOKEN_KEY);
    expect(token).toBeFalsy();
  });

  test('AUTH-04 tampered token triggers 401 → redirect to /login', async ({
    page,
    loginAsUI,
  }) => {
    await loginAsUI(page, 'superAdmin');

    // Replace the real token with garbage and try to load a protected page.
    await page.evaluate((k) => {
      localStorage.setItem(k, 'tampered.jwt.token');
    }, TOKEN_KEY);

    // Use 'commit' so ERR_ABORTED on immediate redirect doesn't throw.
    await page.goto('/members', { waitUntil: 'commit' }).catch(() => {});
    // 401 interceptor in api.js clears auth and forces /login.
    await page.waitForURL('**/login', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('AUTH-05 reload after login keeps the session', async ({ page, loginAsUI }) => {
    await loginAsUI(page, 'superAdmin');

    await page.reload();

    await expect(page).toHaveURL(/\/dashboard$/);
    const token = await page.evaluate((k) => localStorage.getItem(k), TOKEN_KEY);
    expect(token).toBeTruthy();
  });

  test('AUTH-06 unauthenticated visit to /members redirects to /login', async ({ page }) => {
    // Ensure we're logged out before navigating.
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.removeItem('auth.token');
      localStorage.removeItem('auth.user');
    });

    await page.goto('/members');
    await expect(page).toHaveURL(/\/login$/);
  });
});
