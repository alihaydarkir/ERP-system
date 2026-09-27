const { formatUser, formatUsers } = require('./formatters');

describe('formatUser', () => {
  const dbUser = {
    id: 3,
    username: 'admin',
    email: 'admin@erp.local',
    password_hash: '$2b$10$abcdefghijklmnopqrstuv',
    email_verify_token: 'secret-token',
    email_verify_expires: '2026-10-01T00:00:00.000Z',
    role: 'admin',
  };

  test('şifre özeti ve doğrulama token\'ını çıkarır', () => {
    const result = formatUser(dbUser);
    expect(result).not.toHaveProperty('password_hash');
    expect(result).not.toHaveProperty('email_verify_token');
    expect(result).not.toHaveProperty('email_verify_expires');
    expect(result).toEqual({ id: 3, username: 'admin', email: 'admin@erp.local', role: 'admin' });
  });

  test('null için null döner', () => {
    expect(formatUser(null)).toBeNull();
  });

  test('formatUsers listedeki her kullanıcıyı temizler', () => {
    const result = formatUsers([dbUser, { ...dbUser, id: 4 }]);
    expect(result.every((u) => !('password_hash' in u))).toBe(true);
  });
});
