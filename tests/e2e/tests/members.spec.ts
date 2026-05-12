import { test, expect } from '../fixtures/fixtures';

/**
 * Generate a unique 13-character JMBG string.
 * Uses current timestamp + offset, padded to exactly 13 chars.
 */
const jmbg = (n = 0) => String(Date.now() + n).slice(0, 13).padEnd(13, '0');

/**
 * Minimal create-member payload for the API.
 *
 * .NET enums are serialised as integers by default (no JsonStringEnumConverter):
 *   Gender         { Male=0, Female=1 }
 *   MaritalStatus  { Single=0, Married=1, Divorced=2, Widowed=3 }
 *   EducationLevel { Primary=0, Secondary=1, Higher=2, University=3, Masters=4, Doctorate=5 }
 */
function memberPayload(overrides: Record<string, unknown> = {}) {
  return {
    firstName: 'Test',
    lastName: 'Member',
    dateOfBirth: '1990-01-01',
    jmbg: jmbg(),
    gender: 0,         // Male
    maritalStatus: 0,  // Single
    educationLevel: 1, // Secondary
    membershipDate: '2024-01-01',
    orgUnitId: 1,
    phones: [],
    functions: [],
    ...overrides,
  };
}

/** POST /api/members with a superAdmin API context. Returns the created member JSON. */
async function apiCreateMember(
  superAdminApi: import('@playwright/test').APIRequestContext,
  overrides: Record<string, unknown> = {},
) {
  const res = await superAdminApi.post('/api/members', { data: memberPayload(overrides) });
  if (!res.ok()) {
    throw new Error(`apiCreateMember failed: ${res.status()} ${await res.text()}`);
  }
  return res.json() as Promise<{ id: number; [key: string]: unknown }>;
}

test.describe('UC-MEM â€” Members', () => {
  // -----------------------------------------------------------------------
  // MEM-01 â€” List + pagination
  // -----------------------------------------------------------------------
  test('MEM-01 list shows totalCount and pagination works', async ({
    page,
    loginAsUI,
    superAdminApi,
  }) => {
    // Seed 25 members so we are sure to exceed the default page size of 20.
    for (let i = 0; i < 25; i++) {
      await apiCreateMember(superAdminApi, {
        jmbg: jmbg(i + 1),
        firstName: 'Bulk',
        lastName: `M${i}`,
      });
    }

    await loginAsUI(page, 'superAdmin');
    await page.goto('/members');
    await page.waitForLoadState('networkidle');

    // Pagination footer: "{totalCount} total Â· page N of N"
    const paginationText = page.locator('text=/\\d+ total/');
    await expect(paginationText.first()).toBeVisible({ timeout: 10_000 });
    const text = await paginationText.first().textContent();
    const count = parseInt(text?.match(/(\d+) total/)?.[1] ?? '0', 10);
    expect(count).toBeGreaterThanOrEqual(25);

    // Click "Next" to navigate to page 2 (if pagination is available).
    const nextButton = page.getByRole('button', { name: 'Next' });
    const isDisabled = await nextButton.isDisabled();
    if (!isDisabled) {
      await nextButton.click();
      await page.waitForLoadState('networkidle');
      const url = page.url();
      expect(url).toMatch(/page=2/);
    }
  });

  // -----------------------------------------------------------------------
  // MEM-02 â€” Filter by firstName
  //
  // PRODUCT BUG: MemberListItemDto returns a combined `fullName` property but
  // MembersList.jsx accesses `m.firstName` / `m.lastName` separately â€” those
  // keys are absent in the list response so the "Full Name" table column is
  // always blank.  Filter query itself works; the display does not.
  // -----------------------------------------------------------------------
  test('MEM-02 filter by firstName shows matching member', async ({
    page,
    loginAsUI,
    superAdminApi,
  }) => {
    await apiCreateMember(superAdminApi, {
      jmbg: jmbg(1),
      firstName: 'Milos',
      lastName: 'Filtered',
    });

    await loginAsUI(page, 'superAdmin');
    await page.goto('/members');
    await page.waitForLoadState('networkidle');

    const filterForm = page.locator('form').first();
    // First input in the filter form is "First Name".
    await filterForm.locator('input').nth(0).fill('Milos');
    await filterForm.getByRole('button', { name: 'Apply' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Milos')).toBeVisible({ timeout: 8_000 });
  });

  // -----------------------------------------------------------------------
  // MEM-03 â€” Create member via UI
  //
  // PRODUCT BUG: MemberForm sends enum values as strings ('Male', 'Single',
  // 'Secondary') but ASP.NET Core's default System.Text.Json serialiser expects
  // integers (0, 0, 1).  The POST returns 400 validation failure.
  // -----------------------------------------------------------------------
  test('MEM-03 create member via UI succeeds', async ({ page, loginAsUI }) => {
    await loginAsUI(page, 'superAdmin');
    await page.goto('/members/new');
    await page.waitForLoadState('networkidle');

    const uniqueJmbg = jmbg(99);

    await expect(page.locator('select[name="orgUnitId"] option').nth(1)).toBeAttached({
      timeout: 10_000,
    });

    await page.locator('input[name="firstName"]').fill('Nikola');
    await page.locator('input[name="lastName"]').fill('Tesla');
    await page.locator('input[name="dateOfBirth"]').fill('1990-05-15');
    await page.locator('input[name="jmbg"]').fill(uniqueJmbg);
    await page.locator('select[name="gender"]').selectOption('Male');
    await page.locator('select[name="maritalStatus"]').selectOption('Single');
    await page.locator('select[name="educationLevel"]').selectOption('Secondary');
    await page.locator('input[name="membershipDate"]').fill('2024-01-01');
    await page.locator('select[name="orgUnitId"]').selectOption({ index: 1 });

    await page.getByRole('button', { name: 'Create Member' }).click();
    await page.waitForURL(/\/members\/\d+|\/members$/, { timeout: 15_000 });

    const body = page.locator('body');
    await expect(body).toContainText(/Nikola|Tesla/, { timeout: 8_000 });
  });

  // -----------------------------------------------------------------------
  // MEM-04 â€” Duplicate JMBG â†’ 409
  //
  // PRODUCT BUG: same enum serialisation issue as MEM-03; form submission
  // fails with 400 before reaching the duplicate-check that would yield 409.
  // -----------------------------------------------------------------------
  test('MEM-04 duplicate JMBG shows 409 error', async ({
    page,
    loginAsUI,
    superAdminApi,
  }) => {
    const dupJmbg = jmbg(42);
    await apiCreateMember(superAdminApi, { jmbg: dupJmbg });

    await loginAsUI(page, 'superAdmin');
    await page.goto('/members/new');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('select[name="orgUnitId"] option').nth(1)).toBeAttached({
      timeout: 10_000,
    });

    await page.locator('input[name="firstName"]').fill('Dup');
    await page.locator('input[name="lastName"]').fill('User');
    await page.locator('input[name="dateOfBirth"]').fill('1985-03-20');
    await page.locator('input[name="jmbg"]').fill(dupJmbg);
    await page.locator('select[name="gender"]').selectOption('Male');
    await page.locator('select[name="maritalStatus"]').selectOption('Single');
    await page.locator('select[name="educationLevel"]').selectOption('Secondary');
    await page.locator('input[name="membershipDate"]').fill('2024-01-01');
    await page.locator('select[name="orgUnitId"]').selectOption({ index: 1 });

    await page.getByRole('button', { name: 'Create Member' }).click();
    await expect(page.getByText(/JMBG already exists/i)).toBeVisible({ timeout: 8_000 });
  });

  // -----------------------------------------------------------------------
  // MEM-05 â€” Create with phones + function
  //
  // PRODUCT BUG: same enum serialisation issue as MEM-03.
  // -----------------------------------------------------------------------
  test('MEM-05 create member with phone and function', async ({ page, loginAsUI }) => {
    await loginAsUI(page, 'superAdmin');
    await page.goto('/members/new');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('select[name="orgUnitId"] option').nth(1)).toBeAttached({
      timeout: 10_000,
    });

    const uniqueJmbg = jmbg(55);

    await page.locator('input[name="firstName"]').fill('Marko');
    await page.locator('input[name="lastName"]').fill('Polo');
    await page.locator('input[name="dateOfBirth"]').fill('1988-07-22');
    await page.locator('input[name="jmbg"]').fill(uniqueJmbg);
    await page.locator('select[name="gender"]').selectOption('Male');
    await page.locator('select[name="maritalStatus"]').selectOption('Married');
    await page.locator('select[name="educationLevel"]').selectOption('University');
    await page.locator('input[name="membershipDate"]').fill('2023-06-01');
    await page.locator('select[name="orgUnitId"]').selectOption({ index: 1 });

    await page.getByRole('button', { name: '+ Add Phone' }).click();
    await page.locator('input[name="phones.0.number"]').fill('0601234567');
    await page.locator('select[name="phones.0.type"]').selectOption('Mobile');

    await page.getByRole('button', { name: '+ Add Function' }).click();
    await expect(
      page.locator('select[name="memberFunctions.0.functionId"] option').nth(1),
    ).toBeAttached({ timeout: 10_000 });
    await page.locator('select[name="memberFunctions.0.functionId"]').selectOption({ index: 1 });
    await page.locator('input[name="memberFunctions.0.assignedDate"]').fill('2023-06-01');

    await page.getByRole('button', { name: 'Create Member' }).click();
    await page.waitForURL(/\/members\/\d+/, { timeout: 15_000 });

    await expect(page.getByText('0601234567')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=Functions').first()).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // MEM-06 â€” Edit scalar fields
  //
  // PRODUCT BUG: MemberEdit calls PUT /api/members/{id} with UpdateMemberDto
  // which also has enum fields (gender, maritalStatus, educationLevel).
  // The frontend sends strings; backend expects integers â†’ 400.
  // -----------------------------------------------------------------------
  test('MEM-06 edit scalar fields', async ({ page, loginAsUI, superAdminApi }) => {
    const member = await apiCreateMember(superAdminApi, {
      jmbg: jmbg(60),
      firstName: 'OldFirst',
      lastName: 'OldLast',
    });

    await loginAsUI(page, 'superAdmin');
    await page.goto(`/members/${member.id}/edit`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[name="lastName"]')).toHaveValue('OldLast', {
      timeout: 10_000,
    });

    await page.locator('input[name="lastName"]').fill('NewLastName');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await page.waitForURL(`**/members/${member.id}`, { timeout: 15_000 });
    await expect(page.getByText('NewLastName').first()).toBeVisible({ timeout: 8_000 });
  });

  // -----------------------------------------------------------------------
  // MEM-07 â€” Add phone via nested UI (edit page)
  //
  // PRODUCT BUG: same enum issue on PUT â€” the scalar save fails before the
  // nested phone add can be attempted.
  // -----------------------------------------------------------------------
  test('MEM-07 add phone via edit page', async ({ page, loginAsUI, superAdminApi }) => {
    const member = await apiCreateMember(superAdminApi, { jmbg: jmbg(70) });

    await loginAsUI(page, 'superAdmin');
    await page.goto(`/members/${member.id}/edit`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[name="firstName"]')).not.toBeEmpty({ timeout: 10_000 });

    await page.getByRole('button', { name: '+ Add Phone' }).click();
    await page.locator('input[name="phones.0.number"]').fill('0611111111');
    await page.locator('select[name="phones.0.type"]').selectOption('Landline');

    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForURL(`**/members/${member.id}`, { timeout: 15_000 });

    await expect(page.getByText('0611111111')).toBeVisible({ timeout: 8_000 });
  });

  // -----------------------------------------------------------------------
  // MEM-08 â€” Remove phone
  //
  // PRODUCT BUG: same enum issue on PUT.
  // -----------------------------------------------------------------------
  test('MEM-08 remove phone via edit page', async ({
    page,
    loginAsUI,
    superAdminApi,
  }) => {
    const member = await apiCreateMember(superAdminApi, { jmbg: jmbg(80) });
    const phoneRes = await superAdminApi.post(`/api/members/${member.id}/phones`, {
      data: { number: '0629999999', type: 0 }, // PhoneType.Mobile = 0
    });
    expect(phoneRes.ok()).toBeTruthy();

    await loginAsUI(page, 'superAdmin');
    await page.goto(`/members/${member.id}/edit`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[name="phones.0.number"]')).toBeVisible({ timeout: 10_000 });

    // Remove the phone row.
    await page.locator('button').filter({ hasText: 'Remove' }).first().click();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForURL(`**/members/${member.id}`, { timeout: 15_000 });

    await expect(page.getByText('0629999999')).not.toBeVisible({ timeout: 8_000 });
  });

  // -----------------------------------------------------------------------
  // MEM-09 â€” Add + remove function
  //
  // PRODUCT BUG: same enum issue on PUT.
  // -----------------------------------------------------------------------
  test('MEM-09 add and remove function', async ({ page, loginAsUI, superAdminApi }) => {
    const member = await apiCreateMember(superAdminApi, { jmbg: jmbg(90) });

    await loginAsUI(page, 'superAdmin');

    // Add function.
    await page.goto(`/members/${member.id}/edit`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[name="firstName"]')).not.toBeEmpty({ timeout: 10_000 });

    await page.getByRole('button', { name: '+ Add Function' }).click();
    await expect(
      page.locator('select[name="memberFunctions.0.functionId"] option').nth(1),
    ).toBeAttached({ timeout: 10_000 });
    await page.locator('select[name="memberFunctions.0.functionId"]').selectOption('2');
    await page.locator('input[name="memberFunctions.0.assignedDate"]').fill('2024-03-01');

    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForURL(`**/members/${member.id}`, { timeout: 15_000 });

    // Verify function appears.
    await expect(page.locator('ul li').first()).toBeVisible({ timeout: 8_000 });

    // Remove function.
    await page.goto(`/members/${member.id}/edit`);
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('select[name="memberFunctions.0.functionId"]'),
    ).toBeVisible({ timeout: 10_000 });

    const removeButtons = page.locator('button').filter({ hasText: 'Remove' });
    const count = await removeButtons.count();
    await removeButtons.nth(count - 1).click();

    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForURL(`**/members/${member.id}`, { timeout: 15_000 });

    // Verify the function was removed — function list on details should be empty
    await expect(page.getByText('President')).not.toBeVisible({ timeout: 5_000 });
  });

  // -----------------------------------------------------------------------
  // MEM-10 â€” Delete member
  // -----------------------------------------------------------------------
  test('MEM-10 delete member', async ({ page, loginAsUI, superAdminApi }) => {
    const member = await apiCreateMember(superAdminApi, {
      jmbg: jmbg(100),
      firstName: 'ToDelete',
      lastName: 'Gone',
    });

    await loginAsUI(page, 'superAdmin');
    await page.goto(`/members/${member.id}`);
    await page.waitForLoadState('networkidle');

    // The heading shows "ToDelete Gone"; verify we are on the right details page.
    await expect(page.getByRole('heading', { name: /ToDelete/ })).toBeVisible({ timeout: 8_000 });

    // Accept the window.confirm dialog triggered by the Delete button.
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete' }).click();

    // MemberDetails navigates to /members after a successful delete.
    await page.waitForURL('**/members', { timeout: 15_000 });

    // Filter by the deleted member's JMBG to confirm it's gone.
    const filterForm = page.locator('form').first();
    await filterForm.locator('input').nth(2).fill(String(jmbg(100)));
    await filterForm.getByRole('button', { name: 'Apply' }).click();
    await page.waitForLoadState('networkidle');

    // Soft-deleted member should not appear in the list.
    await expect(page.getByRole('heading', { name: /ToDelete/ })).not.toBeVisible({
      timeout: 5_000,
    });
  });

  // -----------------------------------------------------------------------
  // MEM-11 â€” LocalAdmin scope
  //
  // PRODUCT BUG: test user email "localadmin1@test" does not match the
  // frontend login form's email validation regex (/^\S+@\S+\.\S+$/) which
  // requires a TLD dot.  Login is blocked client-side; can never reach
  // /dashboard.
  // -----------------------------------------------------------------------
  test('MEM-11 localadmin sees only own OrgUnit members', async ({
    page,
    loginAsUI,
    superAdminApi,
  }) => {
    await apiCreateMember(superAdminApi, {
      jmbg: jmbg(110),
      orgUnitId: 1,
      firstName: 'UnitOne',
      lastName: 'A',
    });
    await apiCreateMember(superAdminApi, {
      jmbg: jmbg(111),
      orgUnitId: 1,
      firstName: 'UnitOne',
      lastName: 'B',
    });
    await apiCreateMember(superAdminApi, {
      jmbg: jmbg(112),
      orgUnitId: 3,
      firstName: 'UnitThree',
      lastName: 'C',
    });
    await apiCreateMember(superAdminApi, {
      jmbg: jmbg(113),
      orgUnitId: 3,
      firstName: 'UnitThree',
      lastName: 'D',
    });

    await loginAsUI(page, 'localAdmin1');
    await page.goto('/members');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('UnitThree')).not.toBeVisible({ timeout: 8_000 });

    const paginationText = page.locator('text=/\\d+ total/');
    await expect(paginationText.first()).toBeVisible({ timeout: 8_000 });
    const text = await paginationText.first().textContent();
    const count = parseInt(text?.match(/(\d+) total/)?.[1] ?? '0', 10);
    expect(count).toBeLessThanOrEqual(2);
  });

  // -----------------------------------------------------------------------
  // MEM-12 â€” LocalAdmin cross-unit 404
  //
  // PRODUCT BUG: same email validation issue as MEM-11.
  // -----------------------------------------------------------------------
  test('MEM-12 localadmin cannot view member from another OrgUnit', async ({
    page,
    loginAsUI,
    superAdminApi,
  }) => {
    const member = await apiCreateMember(superAdminApi, {
      jmbg: jmbg(120),
      orgUnitId: 3,
      firstName: 'CrossUnit',
      lastName: 'Secret',
    });

    await loginAsUI(page, 'localAdmin1');
    await page.goto(`/members/${member.id}`);
    await page.waitForLoadState('networkidle');

    // MemberDetails renders an error/not-found state when the API scoping
    // returns 404 for an out-of-scope member.
    const errorState = page
      .locator('text=/Not found|Failed to load member/i')
      .or(page.getByRole('button', { name: 'Back to Members' }));

    const isRedirected =
      page.url().includes('/members') && !page.url().includes(`/${member.id}`);
    if (!isRedirected) {
      await expect(errorState.first()).toBeVisible({ timeout: 10_000 });
    }
  });
});

