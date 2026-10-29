// Ortak parola politikası: kayıt, parola değişimi, sıfırlama ve yönetici parola atamasında aynı kural.
// Üst sınır 72: bcrypt 72 bayttan fazlasını sessizce kırpar ve çok uzun girdi CPU yakar.
const Joi = require('joi');

const MIN_LENGTH = 8;
const MAX_LENGTH = 72;
const COMMON = new Set([
  '12345678', '123456789', '1234567890', 'password', 'password1', 'password123', 'qwertyui', 'qwerty123',
  'iloveyou', 'admin123', 'letmein1', '11111111', 'abc12345', 'welcome1', 'sifre123', 'parola123',
]);

// Sorun varsa kullanıcıya gösterilecek mesaj, yoksa null
const passwordProblem = (value) => {
  if (typeof value !== 'string') return 'Parola metin olmalıdır';
  if (value.length < MIN_LENGTH) return `Parola en az ${MIN_LENGTH} karakter olmalıdır`;
  if (Buffer.byteLength(value, 'utf8') > MAX_LENGTH) return `Parola en fazla ${MAX_LENGTH} bayt olabilir`;
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(value) || !/\d/.test(value)) return 'Parola en az bir harf ve bir rakam içermelidir';
  if (COMMON.has(value.toLowerCase())) return 'Bu parola çok yaygın; daha benzersiz bir parola seçin';
  return null;
};

const strongPassword = Joi.string().custom((value, helpers) => {
  const problem = passwordProblem(value);
  return problem ? helpers.message(problem) : value;
}, 'parola politikası');

module.exports = { passwordProblem, strongPassword, MIN_LENGTH, MAX_LENGTH };
