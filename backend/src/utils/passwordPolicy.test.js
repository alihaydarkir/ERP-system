const { passwordProblem, strongPassword, MAX_LENGTH } = require('./passwordPolicy');

describe('parola politikası', () => {
  it('geçerli parolaları kabul eder', () => {
    for (const pw of ['Admin123!', 'sifre-Guclu-42', 'Türkçe1Parola', 'a1b2c3d4']) {
      expect(passwordProblem(pw)).toBeNull();
    }
  });

  it('kısa, yalnız harf, yalnız rakam parolaları reddeder', () => {
    expect(passwordProblem('Ab1!')).toMatch(/en az 8/);
    expect(passwordProblem('sadeceharflerden')).toMatch(/harf ve bir rakam/);
    expect(passwordProblem('1234567890123')).toMatch(/harf ve bir rakam/);
  });

  it('yaygın parolaları reddeder (büyük/küçük harf fark etmez)', () => {
    for (const pw of ['Password123', 'qwerty123', 'ADMIN123', '12345678', 'password1']) {
      expect(passwordProblem(pw)).not.toBeNull();
    }
  });

  it('72 bayttan uzun parolayı reddeder (bcrypt kırpması / CPU koruması)', () => {
    expect(passwordProblem('a1' + 'x'.repeat(MAX_LENGTH))).toMatch(/en fazla/);
    expect(passwordProblem('ş1' + 'ş'.repeat(40))).toMatch(/en fazla/); // çok baytlı karakterler
  });

  it('metin olmayan girdiyi reddeder', () => {
    for (const v of [undefined, null, 123456789, { a: 1 }, ['x']]) {
      expect(passwordProblem(v)).toMatch(/metin/);
    }
  });

  it('Joi şeması aynı kuralı uygular', () => {
    expect(strongPassword.validate('Admin123!').error).toBeUndefined();
    expect(strongPassword.validate('123456').error).toBeDefined();
  });
});
