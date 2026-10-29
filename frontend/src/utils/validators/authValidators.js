const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  if (!email?.trim()) return 'E-posta alanı zorunludur.';
  if (!emailRegex.test(email.trim())) return 'Geçerli bir e-posta adresi giriniz.';
  return '';
}

// Backend ile aynı politika (backend/src/utils/passwordPolicy.js): 8–72 bayt, harf + rakam
export const PASSWORD_HINT = 'En az 8 karakter; en az bir harf ve bir rakam içermelidir.';
const COMMON_PASSWORDS = new Set(['12345678', '123456789', 'password', 'password1', 'password123', 'qwerty123', 'admin123', 'sifre123', 'parola123']);

export function validatePassword(password) {
  if (!password) return 'Şifre alanı zorunludur.';
  if (password.length < 8) return 'Şifre en az 8 karakter olmalıdır.';
  if (new TextEncoder().encode(password).length > 72) return 'Şifre çok uzun (en fazla 72 bayt).';
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(password) || !/\d/.test(password)) return 'Şifre en az bir harf ve bir rakam içermelidir.';
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return 'Bu şifre çok yaygın; daha benzersiz bir şifre seçin.';
  return '';
}

export function validateUsername(username) {
  if (!username?.trim()) return 'Ad Soyad alanı zorunludur.';
  if (username.trim().length < 2) return 'Ad Soyad en az 2 karakter olmalıdır.';
  return '';
}

export function validateLoginForm({ email, password }) {
  return {
    email: validateEmail(email),
    password: password ? '' : 'Şifre alanı zorunludur.'
  };
}

export function validateRegisterForm({ username, email, password }) {
  return {
    username: validateUsername(username),
    email: validateEmail(email),
    password: validatePassword(password)
  };
}

export function hasValidationErrors(errors) {
  return Object.values(errors).some(Boolean);
}
