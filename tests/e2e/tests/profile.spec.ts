import { test, expect } from '../fixtures/fixtures';

test.describe('UC-PRF — Profile', () => {
  test('PRF-01 profile page shows user email, role and org unit', async ({
    page,
    loginAsUI,
  }) => {
    await loginAsUI(page, 'localAdmin1');
    await page.goto('/profile');

    // Wait for the async GET /api/auth/me to finish rendering
    const emailEl = page.locator('[data-testid="profile-email"]');
    await expect(emailEl).toBeVisible();
    await expect(emailEl).toHaveText('localadmin1@test.local');

    const roleEl = page.locator('[data-testid="profile-role"]');
    await expect(roleEl).toBeVisible();
    await expect(roleEl).toHaveText('LocalAdmin');

    // OrgUnit — seeded as Belgrade (id=1); the API may return the name or the id reference
    const orgEl = page.locator('[data-testid="profile-org-unit"]');
    await expect(orgEl).toBeVisible();
    // Accept either the city name or the fallback "#1" id reference
    await expect(orgEl).toContainText(/Belgrade|#1/i);
  });

  test('PRF-02 submitting change-password form shows not-implemented banner', async ({
    page,
    loginAsUI,
  }) => {
    await loginAsUI(page, 'localAdmin1');
    await page.goto('/profile');

    // Fill the change-password form
    await page.locator('#currentPassword').fill('Test123!');
    await page.locator('#newPassword').fill('NewPass123!');
    await page.locator('#confirmNewPassword').fill('NewPass123!');

    await page.locator('button[type="submit"]').click();

    // The backend returns 404; the page shows the not-implemented warning banner
    const banner = page.locator('[data-testid="pw-not-implemented"]');
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await expect(banner).toContainText(/not yet supported/i);
  });
});
