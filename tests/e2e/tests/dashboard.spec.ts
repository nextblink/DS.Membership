import { test, expect, API_BASE_URL, ROLES } from '../fixtures/fixtures';
import { request } from '@playwright/test';

/**
 * UC-DASH — Dashboard
 *
 * `cleanDb` is auto-use, so every test starts from:
 *  - 3 seeded OrgUnits (Belgrade=1, Lazarevac=2, Novi Sad=3) with VoterCount=0
 *  - 6 seeded test users (admin/localadmin1/localadmin2/operator1/operator2/viewer1)
 *  - 0 members, 0 forms
 *
 * Note: Test users localadmin1@test / operator1@test fail the login form's
 * email validation (/^\S+@\S+\.\S+$/) because their domain has no dot.
 * For these roles we skip the UI form and inject the JWT directly into
 * localStorage after obtaining a token from the backend API. This is the
 * same approach used by AUTH-04 and mirrors real app startup behaviour.
 */

const TOKEN_KEY = 'auth.token';
const USER_KEY = 'auth.user';
const SEED_ORG_UNIT_ID_BELGRADE = 1;
const SEED_ORG_UNIT_ID_NOVI_SAD = 3;

/**
 * Programmatic login: obtains a JWT from the backend and injects it into the
 * page's localStorage, then navigates to /dashboard. Used for roles whose
 * email addresses do not satisfy the login form's pattern validation.
 */
async function loginProgrammatically(
  page: import('@playwright/test').Page,
  roleKey: keyof typeof ROLES,
): Promise<void> {
  const creds = ROLES[roleKey];
  const ctx = await request.newContext({ baseURL: API_BASE_URL, ignoreHTTPSErrors: true });
  const res = await ctx.post('/api/auth/login', { data: { email: creds.email, password: creds.password } });
  if (!res.ok()) {
    await ctx.dispose();
    throw new Error(`Programmatic login failed for ${creds.email}: ${res.status()} ${await res.text().catch(() => '')}`);
  }
  const json = (await res.json()) as { token?: string; user?: unknown };
  await ctx.dispose();
  if (!json.token) throw new Error(`No token returned for ${creds.email}`);

  // Navigate to the app first so we can write to its localStorage origin.
  await page.goto('/login');
  await page.evaluate(
    ({ tk, uk, token, user }) => {
      localStorage.setItem(tk, token);
      if (user) localStorage.setItem(uk, JSON.stringify(user));
    },
    { tk: TOKEN_KEY, uk: USER_KEY, token: json.token, user: json.user ?? null },
  );
  await page.goto('/dashboard');
}

function buildMember(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    firstName: 'Test',
    lastName: 'Member',
    dateOfBirth: '1990-01-01',
    jmbg: '0101990700001',
    gender: 0, // Gender.Male
    maritalStatus: 0, // MaritalStatus.Single
    educationLevel: 1, // EducationLevel.Secondary
    isPublicCompany: false,
    membershipDate: '2024-01-01',
    orgUnitId: SEED_ORG_UNIT_ID_BELGRADE,
    phones: [],
    functions: [],
    ...overrides,
  };
}

test.describe('UC-DASH — Dashboard', () => {
  test('DASH-01 SuperAdmin sees Total Members card, 3-OrgUnit table, and Forms donut', async ({
    page,
    superAdminApi,
    loginAsUI,
  }) => {
    // Seed one member so Total Members >= 1.
    const created = await superAdminApi.post('/api/members', { data: buildMember() });
    expect(
      created.ok(),
      `Failed to seed member: ${created.status()} ${await created.text().catch(() => '')}`,
    ).toBeTruthy();

    await loginAsUI(page, 'superAdmin');
    await expect(page).toHaveURL(/\/dashboard$/);

    // Wait for the dashboard to fully load (not skeleton).
    await expect(page.getByText('Total Members')).toBeVisible();

    // Total Members stat card — the h4 value must be >= 1.
    const totalMembersValue = page
      .getByText('Total Members')
      .locator('xpath=ancestor::div[contains(@class,"rounded-sm")][1]//h4')
      .first();
    await expect(totalMembersValue).toHaveText(/^[1-9]\d*$/);

    // Org Units table — should have 3 data rows.
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    const dataRows = table.locator('tbody tr');
    await expect(dataRows).toHaveCount(3);
    await expect(table).toContainText('Belgrade');
    await expect(table).toContainText('Lazarevac');
    await expect(table).toContainText('Novi Sad');

    // Forms by Status donut heading.
    await expect(page.getByText('Forms by Status')).toBeVisible();
  });

  test('DASH-02 SuperAdmin can sort the OrgUnit table by Members / Voters / %', async ({
    page,
    superAdminApi,
    loginAsUI,
  }) => {
    // Seed two members at different OrgUnits so the Members column has
    // differentiated values across rows.
    const m1 = await superAdminApi.post('/api/members', {
      data: buildMember({ jmbg: '0101990700001', orgUnitId: SEED_ORG_UNIT_ID_BELGRADE }),
    });
    expect(m1.ok()).toBeTruthy();
    const m2 = await superAdminApi.post('/api/members', {
      data: buildMember({
        firstName: 'Other',
        jmbg: '0202990700002',
        orgUnitId: SEED_ORG_UNIT_ID_NOVI_SAD,
      }),
    });
    expect(m2.ok()).toBeTruthy();

    await loginAsUI(page, 'superAdmin');
    await expect(page).toHaveURL(/\/dashboard$/);

    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    await expect(table.locator('tbody tr')).toHaveCount(3);

    const membersHeader = table.locator('th', { hasText: /^Members/ });
    const votersHeader = table.locator('th', { hasText: /^Voters/ });
    const pctHeader = table.locator('th', { hasText: '%' });

    // Default sort is "memberCount desc" — already DESC on first paint.
    await expect(membersHeader).toHaveAttribute('aria-sort', 'descending');

    // Clicking the active DESC header should flip to ASC.
    await membersHeader.click();
    await expect(membersHeader).toHaveAttribute('aria-sort', 'ascending');
    // Click again → back to DESC.
    await membersHeader.click();
    await expect(membersHeader).toHaveAttribute('aria-sort', 'descending');

    // Switch to Voters: first click on a new numeric column = DESC.
    await votersHeader.click();
    await expect(votersHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(membersHeader).toHaveAttribute('aria-sort', 'none');
    await votersHeader.click();
    await expect(votersHeader).toHaveAttribute('aria-sort', 'ascending');

    // Switch to %: numeric → first click DESC, second ASC.
    await pctHeader.click();
    await expect(pctHeader).toHaveAttribute('aria-sort', 'descending');
    await pctHeader.click();
    await expect(pctHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  test('DASH-03 LocalAdmin1 sees a single-row table scoped to their OrgUnit (Belgrade)', async ({
    page,
  }) => {
    // localadmin1@test fails the login form's email validation (no dot in domain).
    // We inject the JWT directly via localStorage to bypass the form.
    await loginProgrammatically(page, 'localAdmin1');

    // LocalAdmin is in DASHBOARD_ROLES so /dashboard should render.
    await expect(page).toHaveURL(/\/dashboard$/);

    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    const rows = table.locator('tbody tr');
    // LocalAdmin scope filter: only their own OrgUnit (Belgrade=1) row.
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Belgrade');
    await expect(table).not.toContainText('Lazarevac');
    await expect(table).not.toContainText('Novi Sad');
  });

  test('DASH-04 Operator cannot access /api/dashboard/stats and dashboard content is not shown', async ({
    page,
    operatorApi,
  }) => {
    // Backend enforces the actual authorization: Operator must be 403 on the
    // dashboard stats endpoint regardless of any client-side route guard.
    const apiRes = await operatorApi.get('/api/dashboard/stats');
    expect(apiRes.status()).toBe(403);

    // UI: operator1@test also fails the login form email validation.
    // Inject their JWT directly and navigate to /dashboard.
    // PrivateRoute with DASHBOARD_ROLES will redirect away or not render
    // dashboard content (Operator is not in DASHBOARD_ROLES).
    await loginProgrammatically(page, 'operator1');

    // Give React Router time to settle after redirect or render cycle.
    await page.waitForLoadState('networkidle').catch(() => undefined);

    // The Dashboard component's unique headings should NOT be visible for Operator.
    // (PrivateRoute redirects to /dashboard which loops, so the page URL stays
    // at /dashboard but the <Dashboard /> component is never mounted.)
    await expect(page.getByText('Members by Org Unit')).toHaveCount(0);
    await expect(page.getByText('Forms by Status')).toHaveCount(0);
    await expect(page.getByText('Total Members')).toHaveCount(0);
  });

  test('DASH-05 Empty state — with zero forms the donut shows "No forms yet"', async ({
    page,
    superAdminApi,
    loginAsUI,
  }) => {
    // Confirm there are zero forms via the API (cleanDb already wiped them).
    const formsRes = await superAdminApi.get('/api/forms?page=1&pageSize=1');
    expect(formsRes.ok()).toBeTruthy();
    const body = (await formsRes.json()) as { totalCount: number };
    expect(body.totalCount).toBe(0);

    await loginAsUI(page, 'superAdmin');
    await expect(page).toHaveURL(/\/dashboard$/);

    // Wait for dashboard content to load.
    await expect(page.getByText('Forms by Status')).toBeVisible();

    // With zero forms the donut shows the empty-state fallback.
    await expect(page.getByText(/no forms yet/i)).toBeVisible();
  });
});
