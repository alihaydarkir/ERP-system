import { test, expect } from '@playwright/test';

test.describe('Public smoke navigation', () => {
  test('can navigate from login to register', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Hemen kayıt olun' }).click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByRole('heading', { name: 'Hesap Oluştur' })).toBeVisible();

    await page.getByRole('link', { name: 'Giriş yapın' }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Giriş Yap' })).toBeVisible();
  });
});
