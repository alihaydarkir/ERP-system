import { describe, expect, it } from 'vitest';
import {
  hasValidationErrors,
  validateEmail,
  validateLoginForm,
  validatePassword,
  validateRegisterForm,
  validateUsername
} from './authValidators';

describe('auth validators', () => {
  it('validateEmail returns error when empty', () => {
    expect(validateEmail('')).toBe('E-posta alanı zorunludur.');
  });

  it('validateEmail returns error when invalid format', () => {
    expect(validateEmail('invalid-email')).toBe('Geçerli bir e-posta adresi giriniz.');
  });

  it('validatePassword enforces minimum length', () => {
    expect(validatePassword('123')).toBe('Şifre en az 8 karakter olmalıdır.');
    expect(validatePassword('Zx9kLm2Qwe')).toBe('');
  });

  it('validatePassword requires a letter and a digit and rejects common passwords', () => {
    expect(validatePassword('sadeceharflerden')).toBe('Şifre en az bir harf ve bir rakam içermelidir.');
    expect(validatePassword('1234567890')).toBe('Şifre en az bir harf ve bir rakam içermelidir.');
    expect(validatePassword('Password123')).toBe('Bu şifre çok yaygın; daha benzersiz bir şifre seçin.');
    expect(validatePassword('a1' + 'x'.repeat(80))).toBe('Şifre çok uzun (en fazla 72 bayt).');
  });

  it('validateUsername enforces minimum length', () => {
    expect(validateUsername('a')).toBe('Ad Soyad en az 2 karakter olmalıdır.');
    expect(validateUsername('Ali')).toBe('');
  });

  it('validateLoginForm returns expected field errors', () => {
    const errors = validateLoginForm({ email: '', password: '' });
    expect(errors.email).toBe('E-posta alanı zorunludur.');
    expect(errors.password).toBe('Şifre alanı zorunludur.');
    expect(hasValidationErrors(errors)).toBe(true);
  });

  it('validateRegisterForm returns no errors for valid data', () => {
    const errors = validateRegisterForm({
      username: 'Ali Haydar',
      email: 'ali@example.com',
      password: 'secret123'
    });
    expect(hasValidationErrors(errors)).toBe(false);
  });
});
