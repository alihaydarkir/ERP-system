const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  if (!email?.trim()) return 'E-posta alanı zorunludur.';
  if (!emailRegex.test(email.trim())) return 'Geçerli bir e-posta adresi giriniz.';
  return '';
}

export function validatePassword(password) {
  if (!password) return 'Şifre alanı zorunludur.';
  if (password.length < 6) return 'Şifre en az 6 karakter olmalıdır.';
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
