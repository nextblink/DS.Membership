import { test as base, expect, request, APIRequestContext, Page } from '@playwright/test';
import { selectors } from './selectors';

/**
 * Backend base URL (HTTPS). All API calls hit this directly; the Playwright
 * `baseURL` is the Vite dev server for UI navigation.
 */
export const API_BASE_URL = 'https://localhost:7226';

/**
 * Role identifiers shared by all fixtures.
 */
export type RoleKey =
  | 'superAdmin'
  | 'admin'
  | 'localAdmin1'
  | 'localAdmin2'
  | 'operator1'
  | 'operator2'
  | 'viewer1';

interface RoleCreds {
  email: string;
  password: string;
}

export const ROLES: Record<RoleKey, RoleCreds> = {
  superAdmin: { email: 'admin@local.com', password: 'Admin123!' },
  admin: { email: 'admin@test', password: 'Test123!' },
  localAdmin1: { email: 'localadmin1@test', password: 'Test123!' },
  localAdmin2: { email: 'localadmin2@test', password: 'Test123!' },
  operator1: { email: 'operator1@test', password: 'Test123!' },
  operator2: { email: 'operator2@test', password: 'Test123!' },
  viewer1: { email: 'viewer1@test', password: 'Test123!' },
};

/**
 * Hit `/api/auth/login`, return a bearer token. Throws on failure so a
 * misconfigured role fixture fails the test instead of silently using
 * unauthenticated requests.
 */
async function loginForToken(email: string, password: string): Promise<string> {
  const ctx = await request.newContext({ baseURL: API_BASE_URL, ignoreHTTPSErrors: true });
  const res = await ctx.post('/api/auth/login', { data: { email, password } });
  if (!res.ok()) {
    const body = await res.text().catch(() => '');
    await ctx.dispose();
    throw new Error(`Login failed for ${email}: ${res.status()} ${body}`);
  }
  const json = (await res.json()) as { token?: string };
  await ctx.dispose();
  if (!json.token) throw new Error(`Login for ${email} returned no token`);
  return json.token;
}

async function authedContext(role: RoleCreds): Promise<APIRequestContext> {
  const token = await loginForToken(role.email, role.password);
  return await request.newContext({
    baseURL: API_BASE_URL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}

type Fixtures = {
  /** Auto-use: resets the DB + seeds test users before every test. */
  cleanDb: void;
  /** Unauthenticated API context bound to the backend HTTPS base URL. */
  apiContext: APIRequestContext;
  superAdminApi: APIRequestContext;
  adminApi: APIRequestContext;
  localAdminApi: APIRequestContext;
  operatorApi: APIRequestContext;
  viewerApi: APIRequestContext;
  /** UI helper: drives the login form and waits for /dashboard. */
  loginAsUI: (page: Page, role: RoleKey) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  cleanDb: [
    async ({}, use) => {
      const ctx = await request.newContext({
        baseURL: API_BASE_URL,
        ignoreHTTPSErrors: true,
      });
      const resetRes = await ctx.post('/api/dev/reset');
      if (!resetRes.ok()) {
        throw new Error(
          `dev/reset failed: ${resetRes.status()} ${await resetRes.text().catch(() => '')}`,
        );
      }
      const seedRes = await ctx.post('/api/dev/seed-test-users');
      if (!seedRes.ok()) {
        throw new Error(
          `dev/seed-test-users failed: ${seedRes.status()} ${await seedRes.text().catch(() => '')}`,
        );
      }
      await ctx.dispose();
      await use();
    },
    { auto: true },
  ],

  apiContext: async ({}, use) => {
    const ctx = await request.newContext({
      baseURL: API_BASE_URL,
      ignoreHTTPSErrors: true,
    });
    await use(ctx);
    await ctx.dispose();
  },

  superAdminApi: async ({}, use) => {
    const ctx = await authedContext(ROLES.superAdmin);
    await use(ctx);
    await ctx.dispose();
  },
  adminApi: async ({}, use) => {
    const ctx = await authedContext(ROLES.admin);
    await use(ctx);
    await ctx.dispose();
  },
  localAdminApi: async ({}, use) => {
    const ctx = await authedContext(ROLES.localAdmin1);
    await use(ctx);
    await ctx.dispose();
  },
  operatorApi: async ({}, use) => {
    const ctx = await authedContext(ROLES.operator1);
    await use(ctx);
    await ctx.dispose();
  },
  viewerApi: async ({}, use) => {
    const ctx = await authedContext(ROLES.viewer1);
    await use(ctx);
    await ctx.dispose();
  },

  loginAsUI: async ({}, use) => {
    const helper = async (page: Page, role: RoleKey) => {
      const creds = ROLES[role];
      await page.goto('/login');
      await page.locator(selectors.login.email).fill(creds.email);
      await page.locator(selectors.login.password).fill(creds.password);
      await page.locator(selectors.login.submit).click();
      await page.waitForURL('**/dashboard');
    };
    await use(helper);
  },
});

export { expect };
