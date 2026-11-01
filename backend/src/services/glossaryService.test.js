jest.mock('../config/database', () => ({ query: jest.fn() }));

const pool = require('../config/database');
const glossary = require('./glossaryService');

describe('glossaryService: normalleştirme', () => {
  it('fold Türkçe harfleri ASCII yapar ve uzunluğu korur', () => {
    const text = 'İNŞAAT Kum Zımparası ÇÖĞÜŞ';
    expect(glossary.fold(text)).toBe('insaat kum zimparasi cogus');
    expect(glossary.fold(text)).toHaveLength(text.length);
  });

  it('termKey boşluk, tire ve büyük/küçük harf farkını yok sayar', () => {
    const keys = ['mavi200', 'Mavi 200', 'MAVI-200', 'mavi_200', ' mavi.200 '].map(glossary.termKey);
    expect(new Set(keys)).toEqual(new Set(['mavi200']));
    expect(glossary.termKey('Çelik 8')).toBe('celik8');
  });
});

describe('glossaryService: terim deseni', () => {
  const find = (term, text) => {
    const re = glossary.buildTermPattern(term);
    const m = re.exec(glossary.fold(text));
    return m ? m[0] : null;
  };

  it('harf-rakam geçişinde ayraç kabul eder', () => {
    expect(find('mavi200', "mavi200'ün stoku")).toBe("mavi200'un");
    expect(find('mavi200', 'Mavi 200 ne kadar?')).toBe('mavi 200');
    expect(find('mavi200', 'MAVI-200 stoğu')).toBe('mavi-200');
  });

  it('çok kelimeli terimde ve apostrofsuz ekte çalışır', () => {
    expect(find('cam silikonu', 'cam silikonunun stoğu')).toBe('cam silikonunun');
    expect(find('hasan abi', 'hasan abinin çekleri')).toBe('hasan abinin');
    expect(find('hasan abi', 'hasanabi geldi')).toBe('hasanabi');
  });

  it('daha uzun bir kelimenin ya da sayının içinde eşleşmez', () => {
    expect(find('mavi200', 'mavi2005 diye bir şey')).toBeNull();
    expect(find('su400', 'susuz400')).toBeNull();
    expect(find('kum', 'kumbara aldık')).toBeNull();
  });
});

describe('glossaryService: add doğrulaması', () => {
  beforeEach(() => pool.query.mockReset());

  it('çok kısa ya da boş terimi reddeder', async () => {
    await expect(glossary.add({ companyId: 1, term: 'a', entityType: 'product', entityId: 1 }))
      .rejects.toMatchObject({ code: 'INVALID_TERM' });
    await expect(glossary.add({ companyId: 1, term: '  ', entityType: 'product', entityId: 1 }))
      .rejects.toMatchObject({ code: 'INVALID_TERM' });
  });

  it('geçersiz kayıt türünü reddeder', async () => {
    await expect(glossary.add({ companyId: 1, term: 'mavi200', entityType: 'order', entityId: 1 }))
      .rejects.toMatchObject({ code: 'INVALID_TYPE' });
  });

  it('başka şirketin kaydına bağlamayı reddeder (kayıt şirkette bulunamaz)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // loadEntity: company_id kapsamı boş döner
    await expect(glossary.add({ companyId: 1, term: 'mavi200', entityType: 'product', entityId: 999 }))
      .rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
    expect(pool.query.mock.calls[0][1]).toEqual([999, 1]);
    expect(pool.query.mock.calls[0][0]).toContain('company_id');
  });
});

describe('glossaryService: resolveMessage', () => {
  beforeEach(() => pool.query.mockReset());

  it('sözlük boşsa mesajı değiştirmez', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const out = await glossary.resolveMessage(1, 'mavi200 stoku');
    expect(out).toEqual({ message: 'mavi200 stoku', matches: [] });
  });

  it('terimi gerçek adıyla değiştirir, eki atar ve kullanım sayacını artırır', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 7, term: 'mavi200', term_key: 'mavi200', entity_type: 'product', entity_id: 2, canonical_text: 'Kum Zımparası 200 Kum' }] })
      .mockResolvedValueOnce({ rows: [] });
    const out = await glossary.resolveMessage(1, "Mavi-200'ün stoku kaç?");
    expect(out.message).toBe('Kum Zımparası 200 Kum stoku kaç?');
    expect(out.matches).toHaveLength(1);
    expect(pool.query.mock.calls[0][1]).toEqual([1]);
  });

  it('uzun terim kısa terimle çakışmaz', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [
        { id: 1, term: 'mavi 200 ince', term_key: 'mavi200ince', entity_type: 'product', entity_id: 3, canonical_text: 'İnce Zımpara' },
        { id: 2, term: 'mavi200', term_key: 'mavi200', entity_type: 'product', entity_id: 2, canonical_text: 'Kum Zımparası 200 Kum' }
      ] })
      .mockResolvedValueOnce({ rows: [] });
    const out = await glossary.resolveMessage(1, 'mavi 200 ince kaç tane?');
    expect(out.message).toBe('İnce Zımpara kaç tane?');
    expect(out.matches.map((m) => m.term)).toEqual(['mavi 200 ince']);
  });
});

describe('glossaryService: targetWords', () => {
  it('"200\'lük" ekini atar ve gereksiz kelimeleri ayıklar', () => {
    expect(glossary.targetWords("kum zımparası 200'lük olandan")).toEqual(['kum', 'zimparasi', '200']);
  });
});
