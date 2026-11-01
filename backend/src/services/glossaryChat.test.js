jest.mock('../config/database', () => ({ query: jest.fn() }));

const glossaryChat = require('./glossaryChat');

describe('glossaryChat.parseTeach', () => {
  it('"X = Y" biçimini tanır', () => {
    expect(glossaryChat.parseTeach('mavi200 = kum zımparası 200')).toEqual({ term: 'mavi200', target: 'kum zımparası 200' });
    expect(glossaryChat.parseTeach('"cam silikonu" = şeffaf silikon 280 ml')).toEqual({ term: 'cam silikonu', target: 'şeffaf silikon 280 ml' });
  });

  it('"X Y demek" biçimini tanır', () => {
    expect(glossaryChat.parseTeach("mavi200 kum zımparası 200'lük demek")).toEqual({ term: 'mavi200', target: "kum zımparası 200'lük" });
    expect(glossaryChat.parseTeach('su400, su zımparası 400 anlamına gelir')).toEqual({ term: 'su400', target: 'su zımparası 400' });
  });

  it('"X Y olarak kaydet" biçimini tanır', () => {
    expect(glossaryChat.parseTeach("mavi200'ü kum zımparası 200 olarak kaydet")).toEqual({ term: 'mavi200', target: 'kum zımparası 200' });
  });

  it('"X dediğimde Y kastediyorum" biçimini tanır', () => {
    expect(glossaryChat.parseTeach("hasan abi dediğimde Hasan Demirci'yi kastediyorum")).toEqual({ term: 'hasan abi', target: expect.stringContaining('Hasan Demirci') });
  });

  it('sıradan sorularda öğretme sanmaz', () => {
    expect(glossaryChat.parseTeach('Laptop Pro 15 stoğu kaç?')).toBeNull();
    expect(glossaryChat.parseTeach('bugün ne yapmalıyım')).toBeNull();
    expect(glossaryChat.parseTeach('vadesi geçmiş alacaklarımız var mı?')).toBeNull();
    expect(glossaryChat.parseTeach('2 + 2 = 4')).toBeNull();
  });
});

describe('glossaryChat.parseDelete / isListCommand', () => {
  it('silme komutunu tanır', () => {
    expect(glossaryChat.parseDelete("mavi200'ü sözlükten sil")).toEqual({ term: 'mavi200' });
    expect(glossaryChat.parseDelete('cam silikonu sözlükten kaldır')).toEqual({ term: 'cam silikonu' });
    expect(glossaryChat.parseDelete('stoku sil')).toBeNull();
  });

  it('listeleme komutunu tanır', () => {
    expect(glossaryChat.isListCommand('sözlük')).toBe(true);
    expect(glossaryChat.isListCommand('Sözlükte neler var?')).toBe(true);
    expect(glossaryChat.isListCommand('takma adlar')).toBe(true);
    expect(glossaryChat.isListCommand('sözlük kaç tane ürün var')).toBe(false);
  });
});

describe('glossaryChat yardımcıları', () => {
  it('pickUnique: açık farkla öndeyse seçer, yakınsa seçmez', () => {
    expect(glossaryChat.pickUnique([])).toBeNull();
    // tek aday: sorudaki kelimelerin çoğunu kapsıyorsa seç, zayıf eşleşmeyse sor
    expect(glossaryChat.pickUnique([{ score: 7, coverage: 1 }])).toEqual({ score: 7, coverage: 1 });
    expect(glossaryChat.pickUnique([{ score: 2, coverage: 0.33 }])).toBeNull();
    // tüm kelimeleri yalnızca birinci kapsıyorsa seç ("kum zımparası 200'lük")
    expect(glossaryChat.pickUnique([{ score: 7, coverage: 1 }, { score: 5, coverage: 0.67 }])).toEqual({ score: 7, coverage: 1 });
    // iki aday da tam kapsıyorsa ve puanlar yakınsa sor
    expect(glossaryChat.pickUnique([{ score: 7, coverage: 1 }, { score: 7, coverage: 1 }])).toBeNull();
    expect(glossaryChat.pickUnique([{ score: 9, coverage: 0.7 }, { score: 5, coverage: 0.7 }])).toEqual({ score: 9, coverage: 0.7 });
  });

  it('replaceTerm terimi eki ve ayraçlarıyla birlikte değiştirir', () => {
    expect(glossaryChat.replaceTerm("Mavi 200'ün stoku", 'mavi200', 'Kum Zımparası 200 Kum')).toBe('Kum Zımparası 200 Kum stoku');
  });
});

describe('glossaryChat.process: kapsam', () => {
  it('müşteri rolü için sözlüğe dokunmaz', async () => {
    const out = await glossaryChat.process({ message: 'mavi200 stoku', context: { company_id: 1, user_id: 5, role: 'customer' } });
    expect(out).toEqual({ message: 'mavi200 stoku' });
  });

  it('şirket yoksa dokunmaz', async () => {
    const out = await glossaryChat.process({ message: 'selam', context: { user_id: 5, role: 'admin' } });
    expect(out).toEqual({ message: 'selam' });
  });

  it('kullanıcı rolü terim ekleyemez ve veritabanına gitmez', async () => {
    const pool = require('../config/database');
    pool.query.mockClear();
    const out = await glossaryChat.process({ message: 'mavi200 = kum zımparası 200', context: { company_id: 1, user_id: 5, role: 'user' } });
    expect(out.response.answer).toMatch(/yönetici ya da müdür/);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
