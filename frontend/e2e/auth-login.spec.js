import { test, expect } from '@playwright/test';

test.describe('Authentication - Login', () => {
  test('login page renders and has required fields', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Giriş Yap' })).toBeVisible();
    await expect(page.getByLabel('E-posta Adresi')).toBeVisible();
    await expect(page.getByLabel('Şifre')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Giriş Yap' })).toBeVisible();
  });

  test('shows validation errors for invalid submit', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: 'Giriş Yap' }).click();
    await expect(page.getByText('E-posta alanı zorunludur.')).toBeVisible();
    await expect(page.getByText('Şifre alanı zorunludur.')).toBeVisible();

    await page.getByLabel('E-posta Adresi').fill('invalid-email');
    await page.getByLabel('Şifre').fill('123456');
    await page.getByRole('button', { name: 'Giriş Yap' }).click();
    await expect(page.getByText('Geçerli bir e-posta adresi giriniz.')).toBeVisible();
  });
});
