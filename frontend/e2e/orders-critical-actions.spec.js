import { test, expect } from '@playwright/test';

const profilePayload = {
  success: true,
  data: {
    id: 1,
    username: 'admin',
    email: 'admin@test.com',
    role: 'admin',
    company_id: 1,
    onboarding_completed: true,
  },
};

const permissionsPayload = {
  success: true,
  data: ['orders.view', 'orders.complete', 'orders.cancel', 'orders.edit'],
};

const createOrder = (status = 'pending') => ({
  id: 101,
  status,
  total_amount: 1250,
  created_at: '2026-04-27T08:00:00.000Z',
  customer_name: 'Acme Ltd',
  customer_company: 'Acme Ltd',
  items: [{ product_name: 'Demo Urun' }],
});

async function mockAuthAndPermissions(page) {
  await page.route('**/api/auth/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(profilePayload),
    });
  });

  await page.route('**/api/permissions/my-permissions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(permissionsPayload),
    });
  });
}

test.describe('Orders critical actions', () => {
  test('can complete a pending order', async ({ page }) => {
    let orderStatus = 'pending';
    let patchCallCount = 0;

    await mockAuthAndPermissions(page);

    await page.route('**/api/orders**', async (route, request) => {
      const method = request.method();
      const url = request.url();

      if (method === 'GET' && /\/api\/orders(\?|$)/.test(url)) {
        const orders = orderStatus === 'pending' ? [createOrder('pending')] : [createOrder('completed')];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: orders }),
        });
        return;
      }

      if (method === 'GET' && /\/api\/orders\/\d+$/.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: createOrder(orderStatus) }),
        });
        return;
      }

      if (method === 'PATCH' && /\/api\/orders\/\d+\/status$/.test(url)) {
        const body = request.postDataJSON();
        if (body?.status === 'completed') {
          orderStatus = 'completed';
        }
        patchCallCount += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto('/orders');

    await expect(page.locator('main').getByRole('heading', { name: 'Siparişler', level: 1 })).toBeVisible();

    await page.getByRole('button', { name: /Tamamla/ }).first().click();
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByRole('heading', { name: 'Siparişi Tamamla' })).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Tamamla', exact: true }).click();

    await expect.poll(() => patchCallCount).toBeGreaterThan(0);
    await expect(page.getByText('✅ Tamamlandı')).toBeVisible();
  });

  test('can cancel a pending order', async ({ page }) => {
    let cancelCallCount = 0;

    await mockAuthAndPermissions(page);

    await page.route('**/api/orders**', async (route, request) => {
      const method = request.method();
      const url = request.url();

      if (method === 'GET' && /\/api\/orders(\?|$)/.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [createOrder('pending')] }),
        });
        return;
      }

      if (method === 'POST' && /\/api\/orders\/\d+\/cancel$/.test(url)) {
        cancelCallCount += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto('/orders');

    await expect(page.locator('main').getByRole('heading', { name: 'Siparişler', level: 1 })).toBeVisible();

    await page.getByRole('button', { name: /İptal$/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Siparişi İptal Et' })).toBeVisible();
    await page.getByRole('button', { name: 'İptal Et' }).click();

    await expect.poll(() => cancelCallCount).toBeGreaterThan(0);
  });
});
