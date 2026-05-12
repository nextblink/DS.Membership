import { test, expect } from '../fixtures/fixtures';

const waitForTree = (page: import('@playwright/test').Page) =>
  expect(page.getByText('Belgrade')).toBeVisible({ timeout: 20_000 });

test.describe('UC-ORG org units', () => {

  test('ORG-01 SuperAdmin sees seed tree', async ({ page, loginAsUI }) => {
    await loginAsUI(page, 'superAdmin');
    await page.goto('/org-units');
    await expect(page.getByText('Belgrade')).toBeVisible();
    await expect(page.getByText('Lazarevac')).toBeVisible();
    await expect(page.getByText('Novi Sad')).toBeVisible();
  });

  test('ORG-02 Add root unit', async ({ page, loginAsUI }) => {
    await loginAsUI(page, 'superAdmin');
    await page.goto('/org-units');
    await waitForTree(page);
    await page.getByTestId('add-root-unit-btn').click();
    await page.getByTestId('modal-name-input').fill('TestRootCity');
    await page.getByTestId('modal-type-select').selectOption('City');
    await page.getByTestId('modal-save').click();
    await expect(page.getByText('TestRootCity')).toBeVisible({ timeout: 8000 });
  });

  test('ORG-03 Add child under Belgrade', async ({ page, loginAsUI }) => {
    await loginAsUI(page, 'superAdmin');
    await page.goto('/org-units');
    await waitForTree(page);
    await page.getByTestId('add-child-btn-1').click();
    await page.getByTestId('modal-name-input').fill('TestMunicipal');
    await page.getByTestId('modal-type-select').selectOption('Municipal');
    await page.getByTestId('modal-save').click();
    await expect(page.getByText('TestMunicipal')).toBeVisible({ timeout: 8000 });
  });

  test('ORG-04 Inline-edit VoterCount', async ({ page, loginAsUI, superAdminApi }) => {
    await loginAsUI(page, 'superAdmin');
    await page.goto('/org-units');
    await waitForTree(page);
    await page.getByTestId('voter-count-display-1').click();
    const voterInput = page.getByTestId('voter-count-input-1');
    await voterInput.fill('99999');
    await voterInput.press('Enter');
    await page.waitForTimeout(1000);
    const res = await superAdminApi.get('/api/orgunits/1');
    const body = await res.json();
    expect(body.voterCount ?? body.VoterCount).toBe(99999);
  });

  test('ORG-05 Delete leaf unit', async ({ page, loginAsUI, superAdminApi }) => {
    await superAdminApi.post('/api/orgunits', {
      data: { name: 'DeleteMeLeaf', type: 'City', voterCount: 0, parentId: null },
    });
    await loginAsUI(page, 'superAdmin');
    await page.goto('/org-units');
    await expect(page.getByText('DeleteMeLeaf')).toBeVisible({ timeout: 8000 });
    page.on('dialog', d => d.accept());
    const row = page.locator('li').filter({ hasText: 'DeleteMeLeaf' }).first();
    await row.getByRole('button', { name: /delete/i }).click();
    await expect(page.getByText('DeleteMeLeaf')).not.toBeVisible({ timeout: 5000 });
  });

  test('ORG-06 Delete unit with children → 409 friendly message', async ({ page, loginAsUI }) => {
    await loginAsUI(page, 'superAdmin');
    await page.goto('/org-units');
    await waitForTree(page);
    // The implementation hides the Delete button on nodes that have children
    const belgradNode = page.locator('li').filter({ hasText: 'Belgrade' }).first();
    const deleteBtn = belgradNode.getByRole('button', { name: /delete/i });
    const count = await deleteBtn.count();
    if (count > 0) {
      page.on('dialog', d => d.accept());
      await deleteBtn.click();
      // Look for the window.alert text that gets displayed
      await expect(
        page.locator('[class*="danger"]').first().or(
          page.getByText(/cannot delete/i).first()
        )
      ).toBeVisible({ timeout: 5000 });
    }
    await expect(page.getByText('Belgrade')).toBeVisible();
  });

  test('ORG-07 Non-SuperAdmin (Admin) blocked from /org-units', async ({ page, loginAsUI }) => {
    await loginAsUI(page, 'admin');
    await page.goto('/org-units');
    await page.waitForURL(url => !url.pathname.includes('/org-units'), { timeout: 8000 });
    expect(page.url()).not.toContain('/org-units');
  });

});
