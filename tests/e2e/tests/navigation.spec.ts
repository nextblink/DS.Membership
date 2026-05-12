/**
 * UC-NAV — Navigation / Sidebar role-gating tests
 *
 * NAV_ITEMS from config.js:
 *   Dashboard  → SuperAdmin, Admin, LocalAdmin
 *   Members    → SuperAdmin, Admin, LocalAdmin, Operator, Viewer
 *   Forms      → SuperAdmin, Admin, LocalAdmin, Operator
 *   Org Units  → SuperAdmin only
 *   Functions  → SuperAdmin only
 *   Users      → SuperAdmin only
 *   Profile    → all roles
 *
 * PrivateRoute redirects unauthorised role → /dashboard (not a 403 page).
 */
import { test, expect } from '../fixtures/fixtures';

// Use the <aside> element as the sidebar container.
// The data-testid="sidebar-nav" is also added to the inner <nav> for fine-grained
// targeting, but scoping to <aside> is sufficient and more resilient to HMR timing.
const sidebar = 'aside';

/** Asserts a nav link with given text is visible inside the sidebar. */
async function expectLink(page: import('@playwright/test').Page, label: string) {
  await expect(
    page.locator(sidebar).getByRole('link', { name: label, exact: true }),
  ).toBeVisible();
}

/** Asserts a nav link with given text is NOT rendered in the sidebar. */
async function expectNoLink(page: import('@playwright/test').Page, label: string) {
  await expect(
    page.locator(sidebar).getByRole('link', { name: label, exact: true }),
  ).not.toBeVisible();
}

test.describe('UC-NAV — Navigation', () => {
  test.describe('NAV-01 sidebar shows role-permitted links', () => {
    test('SuperAdmin sees all nav links', async ({ page, loginAsUI }) => {
      await loginAsUI(page, 'superAdmin');

      await expectLink(page, 'Dashboard');
      await expectLink(page, 'Members');
      await expectLink(page, 'Forms');
      await expectLink(page, 'Org Units');
      await expectLink(page, 'Functions');
      await expectLink(page, 'Users');
      await expectLink(page, 'Profile');
    });

    test('Admin sees Dashboard, Members, Forms, Profile only', async ({
      page,
      loginAsUI,
    }) => {
      await loginAsUI(page, 'admin');

      await expectLink(page, 'Dashboard');
      await expectLink(page, 'Members');
      await expectLink(page, 'Forms');
      await expectLink(page, 'Profile');

      await expectNoLink(page, 'Org Units');
      await expectNoLink(page, 'Functions');
      await expectNoLink(page, 'Users');
    });

    test('LocalAdmin sees Dashboard, Members, Forms, Profile only', async ({
      page,
      loginAsUI,
    }) => {
      await loginAsUI(page, 'localAdmin1');

      await expectLink(page, 'Dashboard');
      await expectLink(page, 'Members');
      await expectLink(page, 'Forms');
      await expectLink(page, 'Profile');

      await expectNoLink(page, 'Org Units');
      await expectNoLink(page, 'Functions');
      await expectNoLink(page, 'Users');
    });

    test('Operator sees Members, Forms, Profile — no Dashboard', async ({
      page,
      loginAsUI,
    }) => {
      // Operator is not in DASHBOARD_ROLES → redirected to /dashboard after login
      // but the Dashboard link itself should not appear in the sidebar.
      // loginAsUI waits for /dashboard URL; the redirect still works because
      // PrivateRoute only blocks the route component, not the URL.
      // We navigate away first so we can see the sidebar in a clean state.
      await loginAsUI(page, 'operator1');

      await expectLink(page, 'Members');
      await expectLink(page, 'Forms');
      await expectLink(page, 'Profile');

      await expectNoLink(page, 'Dashboard');
      await expectNoLink(page, 'Org Units');
      await expectNoLink(page, 'Functions');
      await expectNoLink(page, 'Users');
    });

    test('Viewer sees Members, Profile — no Dashboard or Forms', async ({
      page,
      loginAsUI,
    }) => {
      await loginAsUI(page, 'viewer1');

      await expectLink(page, 'Members');
      await expectLink(page, 'Profile');

      await expectNoLink(page, 'Dashboard');
      await expectNoLink(page, 'Forms');
      await expectNoLink(page, 'Org Units');
      await expectNoLink(page, 'Functions');
      await expectNoLink(page, 'Users');
    });
  });

  test.describe('NAV-02 direct URL to forbidden route redirects', () => {
    test('Operator navigating to /org-units is redirected away', async ({
      page,
      loginAsUI,
    }) => {
      await loginAsUI(page, 'operator1');
      await page.goto('/org-units');
      // PrivateRoute redirects to /dashboard when role is not permitted
      await page.waitForURL((url) => !url.pathname.startsWith('/org-units'), {
        timeout: 10_000,
      });
      expect(page.url()).not.toMatch(/\/org-units/);
    });

    test('Admin navigating to /users is redirected away', async ({
      page,
      loginAsUI,
    }) => {
      await loginAsUI(page, 'admin');
      await page.goto('/users');
      // PrivateRoute redirects to /dashboard when role is not permitted
      await page.waitForURL((url) => !url.pathname.startsWith('/users'), {
        timeout: 10_000,
      });
      expect(page.url()).not.toMatch(/\/users/);
    });
  });
});
