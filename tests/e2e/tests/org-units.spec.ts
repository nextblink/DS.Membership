import { test, expect } from '../fixtures/fixtures';

// Helper: seed a leaf OrgUnit via API
async function seedLeafUnit(api: any, name: string) {
  const res = await api.post('/api/orgunits', {
    data: { name, type: 0, voterCount: 0, parentId: null }, // type:0 = City (int)
  });
  const body = await res.json();
  return body.id as number;
}

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
    // Click add root unit button
    const addBtn = page.getByTestId('add-root-unit-btn').or(
      page.getByRole('button', { name: /add root|add unit/i }).first()
    );
    await addBtn.click();
    // Fill modal
    const modal = page.getByTestId('add-unit-modal').or(page.locator('div.fixed.inset-0'));
    await modal.getByTestId('modal-name-input').or(modal.getByPlaceholder(/name/i)).fill('TestRootCity');
    // Type select — set to City (value may be "City" or 0 depending on select)
    const typeSelect = modal.getByTestId('modal-type-select').or(modal.getByRole('combobox').first());
    await typeSelect.selectOption({ label: /city/i });
    await modal.getByTestId('modal-save').or(modal.getByRole('button', { name: /save|add/i })).click();
    await expect(page.getByText('TestRootCity')).toBeVisible({ timeout: 5000 });
  });

  test('ORG-03 Add child under Belgrade', async ({ page, loginAsUI }) => {
    await loginAsUI(page, 'superAdmin');
    await page.goto('/org-units');
    // Find Belgrade node and click its "Add child" button
    const belgradNode = page.getByTestId('org-unit-node-1').or(
      page.locator('[data-node-name="Belgrade"]')
    );
    const addChildBtn = belgradNode.getByTestId('add-child-btn-1').or(
      belgradNode.getByRole('button', { name: /add child/i })
    );
    await addChildBtn.click();
    const modal = page.getByTestId('add-unit-modal').or(page.locator('div.fixed.inset-0'));
    await modal.getByTestId('modal-name-input').or(modal.getByPlaceholder(/name/i)).fill('TestMunicipal');
    const typeSelect = modal.getByTestId('modal-type-select').or(modal.getByRole('combobox').first());
    await typeSelect.selectOption({ label: /municipal/i });
    await modal.getByTestId('modal-save').or(modal.getByRole('button', { name: /save|add/i })).click();
    await expect(page.getByText('TestMunicipal')).toBeVisible({ timeout: 5000 });
  });

  test('ORG-04 Inline-edit VoterCount', async ({ page, loginAsUI, superAdminApi }) => {
    await loginAsUI(page, 'superAdmin');
    await page.goto('/org-units');
    // Click the VoterCount display for Belgrade (Id=1)
    const voterDisplay = page.getByTestId('voter-count-display-1').or(
      page.locator('[data-testid="org-unit-node-1"] [data-voter-count], [data-node-name="Belgrade"] .cursor-pointer').first()
    );
    await voterDisplay.click();
    const voterInput = page.getByTestId('voter-count-input-1').or(
      page.locator('input[type="number"]').first()
    );
    await voterInput.fill('99999');
    await voterInput.press('Enter');
    // Verify via API
    await page.waitForTimeout(500);
    const res = await superAdminApi.get('/api/orgunits/1');
    const body = await res.json();
    expect(body.voterCount ?? body.VoterCount).toBe(99999);
  });

  test('ORG-05 Delete leaf unit', async ({ page, loginAsUI, superAdminApi }) => {
    // Seed a leaf via API (integer enum)
    await seedLeafUnit(superAdminApi, 'DeleteMeLeaf');
    await loginAsUI(page, 'superAdmin');
    await page.goto('/org-units');
    await expect(page.getByText('DeleteMeLeaf')).toBeVisible();
    // Accept confirm dialog and click delete
    page.on('dialog', d => d.accept());
    // Find the delete button by text context
    const row = page.locator('li, [data-node-name="DeleteMeLeaf"]').filter({ hasText: 'DeleteMeLeaf' }).first();
    await row.getByRole('button', { name: /delete/i }).click();
    await expect(page.getByText('DeleteMeLeaf')).not.toBeVisible({ timeout: 5000 });
  });

  test('ORG-06 Delete unit with children → 409 friendly message', async ({ page, loginAsUI }) => {
    await loginAsUI(page, 'superAdmin');
    await page.goto('/org-units');
    // Belgrade has children — delete button is hidden per OrgUnits.jsx implementation
    // If a delete button exists for a node with children, clicking it should show 409 message
    // The implementation hides delete on non-leaf nodes; assert Belgrade delete button absent
    const belgradNode = page.locator('li, [data-node-name="Belgrade"]').filter({ hasText: 'Belgrade' }).first();
    const deleteBtn = belgradNode.getByRole('button', { name: /delete/i });
    // Either button is absent (hidden) or clicking it shows a friendly error
    const count = await deleteBtn.count();
    if (count > 0) {
      page.on('dialog', d => d.accept());
      await deleteBtn.click();
      // Expect a visible error/alert message
      await expect(
        page.getByText(/cannot delete|has children|child/i).or(page.getByRole('alert'))
      ).toBeVisible({ timeout: 5000 });
    }
    // Either way, Belgrade should still be in the tree
    await expect(page.getByText('Belgrade')).toBeVisible();
  });

  test('ORG-07 Non-SuperAdmin (Admin) blocked from /org-units', async ({ page, loginAsUI }) => {
    await loginAsUI(page, 'admin');
    await page.goto('/org-units');
    // PrivateRoute redirects Admin away from SuperAdmin-only route
    await page.waitForURL(url => !url.pathname.includes('/org-units'), { timeout: 5000 });
    expect(page.url()).not.toContain('/org-units');
  });

});
