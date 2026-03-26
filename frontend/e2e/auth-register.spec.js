import { test, expect } from '@playwright/test';

test.describe('Authentication - Register', () => {
  test('register page shows validation errors', async ({ page }) => {
    await page.goto('/register');

    await page.getByRole('button', { name: 'Kayıt Ol' }).click();

    await expect(page.getByText('Ad Soyad alanı zorunludur.')).toBeVisible();
    await expect(page.getByText('E-posta alanı zorunludur.')).toBeVisible();
    await expect(page.getByText('Şifre alanı zorunludur.')).toBeVisible();
  });
});
