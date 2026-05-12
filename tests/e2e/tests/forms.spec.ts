/**
 * UC-FRM — Forms end-to-end tests.
 *
 * Covers: list/filter, upload via UI, form details, verify, reject,
 * add image, delete image, operator scope, viewer cannot act, delete form.
 */
import { request } from '@playwright/test';
import { test, expect, ROLES, API_BASE_URL } from '../fixtures/fixtures';

// ---------------------------------------------------------------------------
// Minimal 1×1 PNG for file upload tests
// ---------------------------------------------------------------------------
const PNG_1x1 = Buffer.from(
  '89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010DCC3F1B0000000049454E44AE426082',
  'hex',
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a form via the API and return the full details DTO. */
async function apiCreateForm(
  ctx: Awaited<ReturnType<typeof import('@playwright/test').request.newContext>>,
  fields: { formNumber?: string; scanDate?: string } = {},
): Promise<{ id: number; formNumber: string; status: string; images: Array<{ id: number }> }> {
  const scanDate = fields.scanDate ?? '2024-01-15';
  const formNumber = fields.formNumber ?? `F-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const res = await ctx.post('/api/forms', {
    multipart: {
      formNumber,
      scanDate,
      files: { name: 'seed.png', mimeType: 'image/png', buffer: PNG_1x1 },
    },
  });

  if (!res.ok()) {
    const body = await res.text().catch(() => '');
    throw new Error(`apiCreateForm failed: ${res.status()} ${body}`);
  }
  return res.json();
}

/** Create a form with a specified number of image files. */
async function apiCreateFormWithImages(
  ctx: Awaited<ReturnType<typeof import('@playwright/test').request.newContext>>,
  imageCount: number,
  formNumber?: string,
): Promise<{ id: number; formNumber: string; status: string; images: Array<{ id: number }> }> {
  const scanDate = '2024-01-15';
  const fn = formNumber ?? `F-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const parts: Record<string, unknown> = { formNumber: fn, scanDate };
  // Playwright multipart with multiple files — use array form
  const files = Array.from({ length: imageCount }, (_, i) => ({
    name: `image-${i + 1}.png`,
    mimeType: 'image/png',
    buffer: PNG_1x1,
  }));

  // Playwright APIRequestContext multipart only accepts a single `files` field
  // at a time; send them via FormData-style by building the payload manually.
  // We attach each file as a separate `files` key — Playwright supports it
  // by passing an array to the multipart object.
  const multipartPayload: Record<string, unknown> = {
    formNumber: fn,
    scanDate,
  };

  // Build the form data manually — call the endpoint once per file set.
  // For simplicity: create form with 1 image, then add more via /images.
  const createRes = await ctx.post('/api/forms', {
    multipart: {
      ...multipartPayload,
      files: files[0],
    },
  });

  if (!createRes.ok()) {
    const body = await createRes.text().catch(() => '');
    throw new Error(`apiCreateFormWithImages (create) failed: ${createRes.status()} ${body}`);
  }
  const form = (await createRes.json()) as { id: number; formNumber: string; status: string; images: Array<{ id: number }> };

  // Add remaining images one by one.
  for (let i = 1; i < imageCount; i++) {
    const addRes = await ctx.post(`/api/forms/${form.id}/images`, {
      multipart: {
        files: { name: `image-${i + 1}.png`, mimeType: 'image/png', buffer: PNG_1x1 },
      },
    });
    if (!addRes.ok()) {
      const body = await addRes.text().catch(() => '');
      throw new Error(`apiCreateFormWithImages (add image ${i + 1}) failed: ${addRes.status()} ${body}`);
    }
  }

  // Re-fetch to get the updated images list.
  const detailsRes = await ctx.get(`/api/forms/${form.id}`);
  return detailsRes.json();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('UC-FRM — Forms', () => {
  // -------------------------------------------------------------------------
  // FRM-01 — List with filters
  // -------------------------------------------------------------------------
  test('FRM-01 list with filters — formNumber and status filter', async ({
    page,
    superAdminApi,
    loginAsUI,
  }) => {
    // Seed 3 forms with distinct form numbers.
    const f1 = await apiCreateForm(superAdminApi, { formNumber: 'FRM01-AAA', scanDate: '2024-01-10' });
    const f2 = await apiCreateForm(superAdminApi, { formNumber: 'FRM01-BBB', scanDate: '2024-01-11' });
    const f3 = await apiCreateForm(superAdminApi, { formNumber: 'FRM01-CCC', scanDate: '2024-01-12' });

    expect(f1.id).toBeTruthy();
    expect(f2.id).toBeTruthy();
    expect(f3.id).toBeTruthy();

    await loginAsUI(page, 'superAdmin');
    await page.goto('/forms');

    // Wait for the table to appear.
    await expect(page.locator('[data-testid="forms-row"]').first()).toBeVisible({ timeout: 10_000 });

    // --- formNumber filter: only FRM01-AAA should match ---
    await page.locator('[data-testid="filter-formNumber"]').fill('FRM01-AAA');
    await page.locator('[data-testid="filter-search-btn"]').click();
    await page.waitForTimeout(500);

    const rowsAfterNumFilter = page.locator('[data-testid="forms-row"]');
    await expect(rowsAfterNumFilter).toHaveCount(1);
    await expect(rowsAfterNumFilter.first()).toContainText('FRM01-AAA');

    // --- Clear and apply status filter: all 3 are Pending ---
    await page.locator('[data-testid="filter-formNumber"]').fill('');
    await page.locator('[data-testid="filter-status"]').selectOption('Pending');
    await page.locator('[data-testid="filter-search-btn"]').click();
    await page.waitForTimeout(500);

    const rowsAfterStatusFilter = page.locator('[data-testid="forms-row"]');
    const count = await rowsAfterStatusFilter.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  // -------------------------------------------------------------------------
  // FRM-02 — Upload via UI
  // -------------------------------------------------------------------------
  test('FRM-02 upload form via UI → navigates to /forms/:id', async ({
    page,
    loginAsUI,
  }) => {
    await loginAsUI(page, 'superAdmin');
    await page.goto('/forms/new');

    await page.locator('[data-testid="upload-formNumber"]').fill('FRM02-UI-UPLOAD');
    await page.locator('[data-testid="upload-scanDate"]').fill('2024-02-15');

    // Attach 2 PNG files via the hidden file input inside the dropzone.
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles([
      { name: 'file1.png', mimeType: 'image/png', buffer: PNG_1x1 },
      { name: 'file2.png', mimeType: 'image/png', buffer: PNG_1x1 },
    ]);

    // Wait for the file preview items to appear (2 files selected).
    await expect(page.locator('ul li').filter({ hasText: 'file1.png' })).toBeVisible({ timeout: 5_000 });

    await page.locator('[data-testid="upload-submit-btn"]').click();

    // Should navigate to /forms/:id after successful upload.
    await page.waitForURL(/\/forms\/\d+$/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/forms\/\d+$/);

    // Form details page should show our form number.
    await expect(page.locator('[data-testid="form-title"]')).toContainText('FRM02-UI-UPLOAD');
  });

  // -------------------------------------------------------------------------
  // FRM-03 — Form details: metadata + gallery
  // -------------------------------------------------------------------------
  test('FRM-03 form details shows metadata and gallery thumbnails', async ({
    page,
    superAdminApi,
    loginAsUI,
  }) => {
    const form = await apiCreateFormWithImages(superAdminApi, 2, 'FRM03-DETAILS');

    await loginAsUI(page, 'superAdmin');
    await page.goto(`/forms/${form.id}`);

    // Metadata visible.
    await expect(page.locator('[data-testid="form-title"]')).toContainText('FRM03-DETAILS');

    // 2 gallery thumbnails.
    await expect(page.locator('[data-testid="gallery-item"]')).toHaveCount(2, { timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // FRM-04 — Verify
  // -------------------------------------------------------------------------
  test('FRM-04 verify a form → status badge shows Verified', async ({
    page,
    superAdminApi,
    loginAsUI,
  }) => {
    const form = await apiCreateForm(superAdminApi, { formNumber: 'FRM04-VERIFY' });

    await loginAsUI(page, 'superAdmin');
    await page.goto(`/forms/${form.id}`);

    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Pending', { timeout: 10_000 });

    await page.locator('[data-testid="btn-verify"]').click();

    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Verified', { timeout: 10_000 });
    // Verify button disappears after successful verify.
    await expect(page.locator('[data-testid="btn-verify"]')).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // FRM-05 — Reject
  // -------------------------------------------------------------------------
  test('FRM-05 reject a form → status badge shows Rejected', async ({
    page,
    superAdminApi,
    loginAsUI,
  }) => {
    const form = await apiCreateForm(superAdminApi, { formNumber: 'FRM05-REJECT' });

    await loginAsUI(page, 'superAdmin');
    await page.goto(`/forms/${form.id}`);

    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Pending', { timeout: 10_000 });

    await page.locator('[data-testid="btn-reject"]').click();

    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Rejected', { timeout: 10_000 });
    // Reject button disappears after successful reject.
    await expect(page.locator('[data-testid="btn-reject"]')).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // FRM-06 — Add image
  // -------------------------------------------------------------------------
  test('FRM-06 add image to existing form → gallery grows', async ({
    page,
    superAdminApi,
    loginAsUI,
  }) => {
    const form = await apiCreateForm(superAdminApi, { formNumber: 'FRM06-ADD-IMG' });

    await loginAsUI(page, 'superAdmin');
    await page.goto(`/forms/${form.id}`);

    // Initially 1 image from seed.
    await expect(page.locator('[data-testid="gallery-item"]')).toHaveCount(1, { timeout: 10_000 });

    // Add an image via the hidden file input.
    const addInput = page.locator('[data-testid="add-images-input"]');
    await addInput.setInputFiles({ name: 'added.png', mimeType: 'image/png', buffer: PNG_1x1 });

    // Gallery should now show 2 thumbnails.
    await expect(page.locator('[data-testid="gallery-item"]')).toHaveCount(2, { timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // FRM-07 — Delete image
  // -------------------------------------------------------------------------
  test('FRM-07 delete image → gallery shrinks to 1 thumbnail', async ({
    page,
    superAdminApi,
    loginAsUI,
  }) => {
    const form = await apiCreateFormWithImages(superAdminApi, 2, 'FRM07-DEL-IMG');

    await loginAsUI(page, 'superAdmin');
    await page.goto(`/forms/${form.id}`);

    // Initially 2 images.
    await expect(page.locator('[data-testid="gallery-item"]')).toHaveCount(2, { timeout: 10_000 });

    // Click the × delete button on the first gallery item — confirm dialog auto-accepts.
    page.on('dialog', (dialog) => dialog.accept());
    // The gallery item has two buttons: thumbnail viewer + delete (×). Click the delete one.
    await page.locator('[data-testid="gallery-item"]').first().getByRole('button', { name: '×' }).click();

    // Gallery should shrink to 1.
    await expect(page.locator('[data-testid="gallery-item"]')).toHaveCount(1, { timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // FRM-08 — Operator scope
  // -------------------------------------------------------------------------
  test('FRM-08 operator scope — operator2 cannot see operator1 form', async ({
    page,
    loginAsUI,
  }) => {
    // Operator1 uploads a form via UI.
    await loginAsUI(page, 'operator1');
    await page.goto('/forms/new');

    await page.locator('[data-testid="upload-formNumber"]').fill('FRM08-OP1-FORM');
    await page.locator('[data-testid="upload-scanDate"]').fill('2024-03-01');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({ name: 'op1.png', mimeType: 'image/png', buffer: PNG_1x1 });

    await page.locator('[data-testid="upload-submit-btn"]').click();
    await page.waitForURL(/\/forms\/\d+$/, { timeout: 15_000 });

    // Capture the form id from the URL.
    const url = page.url();
    const formId = url.match(/\/forms\/(\d+)$/)?.[1];
    expect(formId).toBeTruthy();

    // Log out — clear storage and navigate to login.
    await page.evaluate(() => {
      localStorage.removeItem('auth.token');
      localStorage.removeItem('auth.user');
    });

    // Operator2 logs in and checks the forms list.
    await loginAsUI(page, 'operator2');
    await page.goto('/forms');

    await page.waitForTimeout(1000);

    // Operator2 should not see FRM08-OP1-FORM.
    const rows = page.locator('[data-testid="forms-row"]');
    const allText = await page.locator('[data-testid="forms-row"]').allTextContents().catch(() => [] as string[]);
    const found = allText.some((t) => t.includes('FRM08-OP1-FORM'));
    expect(found, 'operator2 should not see operator1 form').toBe(false);

    // Direct navigation to the form URL should show error/not-found state.
    await page.goto(`/forms/${formId}`);
    await page.waitForTimeout(1000);

    // The page should show an error message (404/not-found/error state).
    const errorVisible = await page
      .locator('text=/not found|error|404/i')
      .isVisible()
      .catch(() => false);
    const titleText = await page
      .locator('[data-testid="form-title"]')
      .isVisible()
      .catch(() => false);
    // Either an error message is shown OR the form title is not shown.
    expect(errorVisible || !titleText, 'operator2 should see error state for op1 form').toBe(true);
  });

  // -------------------------------------------------------------------------
  // FRM-09 — Viewer cannot see Verify/Reject buttons
  // The Viewer role is excluded from FORMS_ROLES in config.js so the route is
  // guarded by PrivateRoute — the viewer gets a blank/redirect page rather than
  // the form detail view. In both cases Verify/Reject buttons must NOT be present.
  // -------------------------------------------------------------------------
  test('FRM-09 viewer cannot see Verify/Reject buttons', async ({
    page,
    superAdminApi,
    loginAsUI,
  }) => {
    const form = await apiCreateForm(superAdminApi, { formNumber: 'FRM09-VIEWER' });

    await loginAsUI(page, 'viewer1');
    await page.goto(`/forms/${form.id}`);

    // Wait briefly for any navigation/rendering to settle.
    await page.waitForTimeout(2_000);

    // The Viewer role does not have access to Forms routes — the PrivateRoute
    // guard will either redirect or render nothing. In either case, the
    // Verify and Reject action buttons must not be attached to the DOM.
    await expect(page.locator('[data-testid="btn-verify"]')).not.toBeAttached();
    await expect(page.locator('[data-testid="btn-reject"]')).not.toBeAttached();
  });

  // -------------------------------------------------------------------------
  // FRM-10 — Delete form cascades
  // -------------------------------------------------------------------------
  test('FRM-10 delete form → removed from list, API returns 404', async ({
    page,
    superAdminApi,
    loginAsUI,
  }) => {
    const form = await apiCreateFormWithImages(superAdminApi, 1, 'FRM10-DELETE');

    await loginAsUI(page, 'superAdmin');
    await page.goto(`/forms/${form.id}`);

    // Confirm the form is visible.
    await expect(page.locator('[data-testid="form-title"]')).toContainText('FRM10-DELETE', {
      timeout: 10_000,
    });

    // Delete form — accept confirm dialog.
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('[data-testid="btn-delete-form"]').click();

    // Should navigate back to /forms list.
    await page.waitForURL(/\/forms$/, { timeout: 10_000 });

    // The deleted form should not appear in the list.
    await page.locator('[data-testid="filter-formNumber"]').fill('FRM10-DELETE');
    await page.locator('[data-testid="filter-search-btn"]').click();
    await page.waitForTimeout(500);

    const rows = page.locator('[data-testid="forms-row"]');
    await expect(rows).toHaveCount(0, { timeout: 5_000 });

    // API GET /api/forms/{id} → 404.
    const apiRes = await superAdminApi.get(`/api/forms/${form.id}`);
    expect(apiRes.status()).toBe(404);
  });
});
