import { test, expect, ROLES } from '../fixtures/fixtures';

/**
 * UC-USR — Users management
 *
 * The /users page is gated to SuperAdmin only.  The create/edit/delete UI uses
 * react-hook-form inside a custom ModalShell.
 *
 * We scope all modal interactions to `div.fixed.inset-0` so selectors are
 * unambiguous even when a page heading shares the same text.  Users.jsx was
 * extended with htmlFor/id pairs on form elements, but the selectors here
 * work with or without those attributes (structural fallback).
 */

const SEEDED_TEST_EMAILS = [
  'admin@test',
  'localadmin1@test',
  'localadmin2@test',
  'operator1@test',
  'operator2@test',
  'viewer1@test',
];

const ALL_SEEDED_EMAILS = ['admin@local.com', ...SEEDED_TEST_EMAILS];

/** Navigate to /users as SuperAdmin and wait for the table to be ready. */
async function gotoUsersAsSuperAdmin(page: any, loginAsUI: any) {
  await loginAsUI(page, 'superAdmin');
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible();
  // Wait for the loading spinner to clear.
  await expect(page.getByText('Loading…')).toHaveCount(0);
}

/** Locate the tbody row that contains the given email text. */
function userRow(page: any, email: string) {
  return page.locator('tbody tr', { hasText: email });
}

/** The modal overlay container — present only when a modal is open. */
function modalOverlay(page: any) {
  return page.locator('div.fixed.inset-0');
}

/**
 * Click "Create user" and wait for the modal to appear.
 * Returns the modal overlay locator.
 */
async function openCreateModal(page: any) {
  await page.getByRole('button', { name: 'Create user' }).click();
  const modal = modalOverlay(page);
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('heading', { name: 'Create user' })).toBeVisible();
  return modal;
}

test.describe('UC-USR — Users', () => {
  // cleanDb + seed-test-users is auto-use in fixtures — each test starts clean.

  test('USR-01 SuperAdmin lists exactly the 7 seeded users', async ({ page, loginAsUI }) => {
    await gotoUsersAsSuperAdmin(page, loginAsUI);

    for (const email of ALL_SEEDED_EMAILS) {
      await expect(userRow(page, email)).toHaveCount(1);
    }
    // Ensure no unexpected extra rows.
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBe(ALL_SEEDED_EMAILS.length); // 7
  });

  test('USR-02 Create a new Admin user', async ({ page, loginAsUI }) => {
    await gotoUsersAsSuperAdmin(page, loginAsUI);

    const email = `newadmin-${Date.now()}@test.local`;
    const modal = await openCreateModal(page);

    // Structural selectors: email input, password input, first/second select.
    await modal.locator('input[type="email"]').fill(email);
    await modal.locator('input[type="password"]').fill('Test123!');
    // First <select> in the modal is Role.
    await modal.locator('select').first().selectOption('Admin');
    // Org Unit (second select) is not required for Admin — leave "— None —".

    await modal.getByRole('button', { name: 'Create', exact: true }).click();

    // Modal closes on success.
    await expect(modalOverlay(page)).toHaveCount(0);
    await expect(userRow(page, email)).toBeVisible();
    await expect(userRow(page, email)).toContainText('Admin');
  });

  test('USR-03 Create LocalAdmin without OrgUnit is blocked client-side', async ({
    page,
    loginAsUI,
  }) => {
    await gotoUsersAsSuperAdmin(page, loginAsUI);

    const email = `localadmin-noorg-${Date.now()}@test.local`;
    const modal = await openCreateModal(page);
    await modal.locator('input[type="email"]').fill(email);
    await modal.locator('input[type="password"]').fill('Test123!');
    // First <select> = Role.
    await modal.locator('select').first().selectOption('LocalAdmin');
    // Leave Org Unit (second select) on "— None —".

    await modal.getByRole('button', { name: 'Create', exact: true }).click();

    // Client-side validation fires — modal must remain open.
    await expect(modal.getByRole('heading', { name: 'Create user' })).toBeVisible();
    await expect(modal.getByText('Org Unit is required for this role')).toBeVisible();

    // The user must NOT have been created.
    await expect(userRow(page, email)).toHaveCount(0);
  });

  test('USR-04 Create Operator with OrgUnit Belgrade (id=1)', async ({ page, loginAsUI }) => {
    await gotoUsersAsSuperAdmin(page, loginAsUI);

    const email = `newop-${Date.now()}@test.local`;
    const modal = await openCreateModal(page);
    await modal.locator('input[type="email"]').fill(email);
    await modal.locator('input[type="password"]').fill('Test123!');
    // First <select> = Role.
    await modal.locator('select').first().selectOption('Operator');
    // Second <select> = Org Unit; select Belgrade by value (id=1).
    await modal.locator('select').nth(1).selectOption('1');

    await modal.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(modalOverlay(page)).toHaveCount(0);
    await expect(userRow(page, email)).toBeVisible();
    await expect(userRow(page, email)).toContainText('Operator');
  });

  test('USR-05 Duplicate email surfaces a 409 error inline', async ({ page, loginAsUI }) => {
    await gotoUsersAsSuperAdmin(page, loginAsUI);

    const modal = await openCreateModal(page);
    // admin@local.com is the seeded SuperAdmin — definitely already exists.
    await modal.locator('input[type="email"]').fill(ROLES.superAdmin.email);
    await modal.locator('input[type="password"]').fill('Test123!');
    await modal.locator('select').first().selectOption('Admin');

    await modal.getByRole('button', { name: 'Create', exact: true }).click();

    // The 409 handler in CreateUserModal surfaces a friendly message.
    await expect(modal.getByText('A user with this email already exists.')).toBeVisible();
    // Modal must stay open.
    await expect(modal.getByRole('heading', { name: 'Create user' })).toBeVisible();
  });

  test('USR-06 Edit operator1@test: change role to LocalAdmin', async ({ page, loginAsUI }) => {
    await gotoUsersAsSuperAdmin(page, loginAsUI);

    const row = userRow(page, 'operator1@test');
    await expect(row).toContainText('Operator');
    await row.getByRole('button', { name: 'Edit' }).click();

    const modal = modalOverlay(page);
    await expect(modal).toBeVisible();
    await expect(
      modal.getByRole('heading', { name: /Edit user — operator1@test/ }),
    ).toBeVisible();

    // EditUserModal: first <select> is Role.
    await modal.locator('select').first().selectOption('LocalAdmin');
    // operator1@test was seeded with OrgUnit Belgrade (id=1) — already satisfies LocalAdmin.

    await modal.getByRole('button', { name: 'Save', exact: true }).click();

    // Modal closes on success.
    await expect(modalOverlay(page)).toHaveCount(0);
    await expect(userRow(page, 'operator1@test')).toContainText('LocalAdmin');
  });

  test('USR-07 Delete a freshly API-created user', async ({
    page,
    loginAsUI,
    superAdminApi,
  }) => {
    // Seed the throwaway user via the API so this test is self-contained.
    const email = `delete-me-${Date.now()}@test.local`;
    const createRes = await superAdminApi.post('/api/users', {
      data: { email, password: 'Test123!', role: 'Admin', orgUnitId: null },
    });
    expect(createRes.ok(), `Pre-seed POST /api/users failed: ${createRes.status()}`).toBeTruthy();

    await gotoUsersAsSuperAdmin(page, loginAsUI);
    await expect(userRow(page, email)).toBeVisible();

    // Click Delete for the target row.
    await userRow(page, email).getByRole('button', { name: 'Delete' }).click();

    const modal = modalOverlay(page);
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Delete user' })).toBeVisible();

    // The ConfirmModal's confirm button is the last "Delete" button in the overlay.
    await modal.getByRole('button', { name: 'Delete', exact: true }).last().click();

    // Confirmation modal closes and the row disappears.
    await expect(modalOverlay(page)).toHaveCount(0);
    await expect(userRow(page, email)).toHaveCount(0);
  });

  test('USR-08 Non-SuperAdmin (Admin role) visiting /users is redirected away', async ({
    page,
    loginAsUI,
  }) => {
    // admin@test has role=Admin, not SuperAdmin → PrivateRoute redirects to /dashboard.
    await loginAsUI(page, 'admin');
    await page.goto('/users');

    // PrivateRoute redirects non-SuperAdmin to /dashboard.
    await page.waitForURL((url: URL) => !url.pathname.endsWith('/users'), { timeout: 10_000 });
    const finalPath = new URL(page.url()).pathname;
    expect(finalPath).not.toBe('/users');
  });
});
