import { test, expect } from '../fixtures/fixtures';

/**
 * Locate a table row that contains a cell with the given exact text.
 * Works both with and without data-testid attributes.
 */
function rowByName(page: import('@playwright/test').Page, name: string) {
  return page.locator('table tbody tr').filter({ hasText: name });
}

test.describe('UC-FUN — Functions', () => {
  /**
   * FUN-01 — Inline add
   * Login as superadmin, go to /functions, type a unique name in the add row,
   * click Add, assert the new name appears in the table.
   */
  test('FUN-01 inline add creates a new function and shows it in the table', async ({
    page,
    loginAsUI,
  }) => {
    await loginAsUI(page, 'superAdmin');
    await page.goto('/functions');

    // Wait for the table to render (seed data visible)
    await expect(page.getByText('Member OB')).toBeVisible({ timeout: 15_000 });

    const funcName = `TestFunc-${Date.now()}`;

    // Fill the inline-add input — prefer testid, fall back to placeholder
    const addInput = page.locator('[data-testid="functions-add-input"]').or(
      page.locator('input[placeholder="New function name"]'),
    );
    await addInput.fill(funcName);

    // Click the Add button
    const addBtn = page.locator('[data-testid="functions-add-btn"]').or(
      page.getByRole('button', { name: 'Add' }),
    );
    await addBtn.click();

    // Wait for the new name to appear in the table
    await expect(page.getByText(funcName)).toBeVisible({ timeout: 10_000 });
  });

  /**
   * FUN-02 — Inline edit
   * Login as superadmin, go to /functions. Find Function Id=1 ("Member OB"
   * after cleanDb). Click Edit, change the name, Save. Assert the edited name
   * appears in the table.
   */
  test('FUN-02 inline edit updates the function name', async ({ page, loginAsUI }) => {
    await loginAsUI(page, 'superAdmin');
    await page.goto('/functions');

    // Wait for seed data to load
    await expect(page.getByText('Member OB')).toBeVisible({ timeout: 15_000 });

    // Find the "Member OB" row and click its Edit button
    // NOTE: after clicking Edit, the row's text node changes to an <input> so
    // we cannot re-use a hasText filter. We click the Edit button while the row
    // still contains the text node, then switch to a broader selector.
    const memberObRow = rowByName(page, 'Member OB');
    await memberObRow
      .locator('[data-testid^="functions-edit-btn-"]')
      .or(memberObRow.getByRole('button', { name: 'Edit' }))
      .click();

    // After clicking Edit the row switches to input mode.
    // The edit input is NOT the add-row input (different placeholder / no placeholder).
    // Use the testid if present, otherwise fall back to any input without the add placeholder.
    const editInput = page
      .locator('[data-testid^="functions-edit-input-"]')
      .or(page.locator('input[type="text"]:not([placeholder="New function name"])'));

    await expect(editInput).toBeVisible({ timeout: 5_000 });
    await editInput.fill('Member OB Edited');

    // Click Save
    const saveBtn = page
      .locator('[data-testid^="functions-save-btn-"]')
      .or(page.getByRole('button', { name: 'Save' }));
    await saveBtn.click();

    // Wait for edit mode to exit and the updated name to appear
    await expect(page.getByText('Member OB Edited')).toBeVisible({ timeout: 10_000 });
    // Original name should no longer be present
    await expect(page.getByText('Member OB', { exact: true })).not.toBeVisible();
  });

  /**
   * FUN-03 — Delete unused function
   * API-seed a new function, go to /functions, find "ToDelete", click Delete,
   * confirm the dialog, assert it is gone from the table.
   */
  test('FUN-03 delete an unused function removes it from the table', async ({
    page,
    loginAsUI,
    superAdminApi,
  }) => {
    // Seed a function to delete
    const res = await superAdminApi.post('/api/functions', { data: { name: 'ToDelete' } });
    expect(res.ok(), `Seed POST /api/functions failed: ${res.status()}`).toBeTruthy();

    await loginAsUI(page, 'superAdmin');
    await page.goto('/functions');

    // Wait for "ToDelete" to appear in the table
    await expect(page.getByText('ToDelete')).toBeVisible({ timeout: 10_000 });

    const toDeleteRow = rowByName(page, 'ToDelete');

    // Accept the confirm dialog before clicking Delete
    page.once('dialog', (dialog) => dialog.accept());
    await toDeleteRow
      .locator('[data-testid^="functions-delete-btn-"]')
      .or(toDeleteRow.getByRole('button', { name: 'Delete' }))
      .click();

    // Row should disappear
    await expect(page.getByText('ToDelete')).not.toBeVisible({ timeout: 10_000 });
  });

  /**
   * FUN-04 — Delete in-use function → 409
   * Arrange: create a member in OrgUnit=1, assign Function Id=1 to them.
   * Login superadmin, go to /functions, attempt to delete Function Id=1.
   * Assert a "function is in use" error message is visible and the row remains.
   */
  test('FUN-04 deleting a function in use shows a 409 error and keeps the row', async ({
    page,
    loginAsUI,
    superAdminApi,
  }) => {
    // Create a member (gender/maritalStatus/educationLevel sent as integers
    // because the API uses default System.Text.Json enum → integer serialization)
    const jmbg = String(Date.now()).slice(0, 13).padEnd(13, '0');
    const memberRes = await superAdminApi.post('/api/members', {
      data: {
        firstName: 'F',
        lastName: 'U',
        dateOfBirth: '1990-01-01',
        jmbg,
        gender: 0,           // Gender.Male
        maritalStatus: 0,    // MaritalStatus.Single
        educationLevel: 1,   // EducationLevel.Secondary
        membershipDate: '2024-01-01',
        orgUnitId: 1,
      },
    });
    expect(
      memberRes.ok(),
      `Seed POST /api/members failed: ${memberRes.status()} ${await memberRes.text().catch(() => '')}`,
    ).toBeTruthy();
    const member = (await memberRes.json()) as { id: number };

    // Assign Function Id=1 to the member
    const assignRes = await superAdminApi.post(`/api/members/${member.id}/functions`, {
      data: { functionId: 1, assignedDate: '2024-01-01' },
    });
    expect(
      assignRes.ok(),
      `Seed POST /api/members/${member.id}/functions failed: ${assignRes.status()} ${await assignRes.text().catch(() => '')}`,
    ).toBeTruthy();

    await loginAsUI(page, 'superAdmin');
    await page.goto('/functions');

    // Wait for seed data to load — Function Id=1 is "Member OB" after cleanDb
    await expect(page.getByText('Member OB')).toBeVisible({ timeout: 15_000 });

    const memberObRow = rowByName(page, 'Member OB');

    // Accept the confirm dialog before clicking Delete
    page.once('dialog', (dialog) => dialog.accept());
    await memberObRow
      .locator('[data-testid^="functions-delete-btn-"]')
      .or(memberObRow.getByRole('button', { name: 'Delete' }))
      .click();

    // The error banner should appear with a "function is in use" / cannot delete message
    const errorBanner = page
      .locator('[data-testid="functions-error"]')
      .or(page.locator('.bg-red-50'));
    await expect(errorBanner).toBeVisible({ timeout: 10_000 });
    await expect(errorBanner).toContainText(/in use|cannot delete/i);

    // The "Member OB" row must still be in the table
    await expect(page.getByText('Member OB')).toBeVisible();
  });
});
