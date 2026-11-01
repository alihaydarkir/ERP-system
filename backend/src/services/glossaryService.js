const pool = require('../config/database');

// Şirket sözlüğü: "mavi200" → "Kum Zımparası 200". Tüm sorgular company_id ile kapsamlanır.

// Türkçe harfleri ASCII'ye indirir ve uzunluğu korur (indeksler orijinal metinle aynı kalır).
// DB tarafındaki TRANSLATE ile aynı eşleme.
const TR_FROM = 'İIıĞğÜüŞşÖöÇç';
const TR_TO = 'iiigguussoocc';

const fold = (value) => {
  let out = '';
  for (const ch of String(value ?? '')) {
    const i = TR_FROM.indexOf(ch);
    out += i >= 0 ? TR_TO[i] : ch;
  }
  return out.toLowerCase();
};

const foldSql = (col) => `LOWER(TRANSLATE(${col}, '${TR_FROM}', '${TR_TO}'))`;

// "Mavi-200" / "mavi 200" / "Mavi200" → "mavi200"
const termKey = (term) => fold(term).replace(/[^a-z0-9]/g, '');

const ENTITY_LABELS = { product: 'ürün', customer: 'müşteri', supplier: 'tedarikçi' };
const TERM_MAX = 80;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Apostrofsuz hâl/iyelik/çoğul ekleri (ASCII'ye indirilmiş). Uzun olanlar önce gelir.
const SUFFIXES = [
  'larin', 'lerin', 'lari', 'leri', 'ndaki', 'ndeki', 'ndan', 'nden', 'nin', 'nun', 'yle', 'yla',
  'daki', 'deki', 'den', 'dan', 'ten', 'tan', 'nda', 'nde', 'lar', 'ler', 'lik', 'luk',
  'in', 'un', 'ni', 'nu', 'yi', 'yu', 'si', 'su', 'ya', 'ye', 'na', 'ne', 'de', 'da', 'te', 'ta', 'le', 'la', 'li', 'lu',
  'i', 'u', 'e', 'a'
].join('|');

// Terim → esnek regex: "mavi200" harf/rakam geçişinde, "hasan abi" kelime arasında ayraç kabul eder.
const buildTermPattern = (term) => {
  const words = fold(term).split(/[^a-z0-9]+/).filter(Boolean);
  const parts = [];
  for (const w of words) {
    const segs = w.match(/[a-z]+|[0-9]+/g) || [];
    parts.push(...segs);
  }
  if (!parts.length) return null;
  const sep = '[\\s\\-_.]*';
  const body = parts.map(escapeRegex).join(sep);
  // Ek: mavi200'ün, Mavi-200'ü (kesme işaretinden sonraki ek terimin parçası sayılır) ve
  // apostrofsuz yaygın Türkçe ekler: "cam silikonunun", "hasan abinin" (metin ASCII'ye indirilmiş halde aranır).
  return new RegExp(`(?<![a-z0-9])${body}(?:['’]\\p{L}+|(?:${SUFFIXES})(?![a-z0-9])|(?![a-z0-9]))`, 'gu');
};

async function loadEntity(companyId, type, id) {
  if (type === 'product') {
    const r = await pool.query('SELECT id, name AS canonical FROM products WHERE id = $1 AND company_id = $2', [id, companyId]);
    return r.rows[0] || null;
  }
  if (type === 'customer') {
    const r = await pool.query('SELECT id, full_name AS canonical FROM customers WHERE id = $1 AND company_id = $2', [id, companyId]);
    return r.rows[0] || null;
  }
  if (type === 'supplier') {
    const r = await pool.query('SELECT id, supplier_name AS canonical FROM suppliers WHERE id = $1 AND company_id = $2', [id, companyId]);
    return r.rows[0] || null;
  }
  return null;
}

async function list(companyId) {
  const r = await pool.query(
    `SELECT id, term, entity_type, entity_id, canonical_text, usage_count, created_at
     FROM company_glossary WHERE company_id = $1 ORDER BY term_key ASC`,
    [companyId]
  );
  return r.rows;
}

async function add({ companyId, term, entityType, entityId, userId }) {
  const cleanTerm = String(term || '').trim().replace(/\s+/g, ' ');
  const key = termKey(cleanTerm);
  if (!cleanTerm || cleanTerm.length > TERM_MAX || key.length < 2) {
    const err = new Error('Terim 2-80 karakter olmalı ve harf ya da rakam içermeli');
    err.code = 'INVALID_TERM';
    throw err;
  }
  if (!ENTITY_LABELS[entityType]) {
    const err = new Error('Geçersiz kayıt türü');
    err.code = 'INVALID_TYPE';
    throw err;
  }
  const entity = await loadEntity(companyId, entityType, entityId);
  if (!entity) {
    const err = new Error('Kayıt bulunamadı');
    err.code = 'ENTITY_NOT_FOUND';
    throw err;
  }
  const r = await pool.query(
    `INSERT INTO company_glossary (company_id, term, term_key, entity_type, entity_id, canonical_text, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (company_id, term_key) DO UPDATE
       SET term = EXCLUDED.term, entity_type = EXCLUDED.entity_type, entity_id = EXCLUDED.entity_id,
           canonical_text = EXCLUDED.canonical_text, created_by = EXCLUDED.created_by, updated_at = CURRENT_TIMESTAMP
     RETURNING id, term, entity_type, entity_id, canonical_text`,
    [companyId, cleanTerm, key, entityType, entityId, entity.canonical, userId || null]
  );
  return r.rows[0];
}

async function remove(companyId, term) {
  const r = await pool.query(
    'DELETE FROM company_glossary WHERE company_id = $1 AND term_key = $2 RETURNING id, term',
    [companyId, termKey(term)]
  );
  return r.rows[0] || null;
}

async function removeById(companyId, id) {
  const r = await pool.query('DELETE FROM company_glossary WHERE company_id = $1 AND id = $2 RETURNING id, term', [companyId, id]);
  return r.rows[0] || null;
}

// Mesajdaki sözlük terimlerini gerçek adlarıyla değiştirir.
// Kaynağı silinmiş kayıtlar (ürün/müşteri artık yok) sessizce atlanır.
async function resolveMessage(companyId, message) {
  const text = String(message || '');
  if (!text) return { message: text, matches: [] };

  const entries = await pool.query(
    `SELECT g.id, g.term, g.term_key, g.entity_type, g.entity_id, g.canonical_text
     FROM company_glossary g
     WHERE g.company_id = $1
       AND (
         (g.entity_type = 'product'  AND EXISTS (SELECT 1 FROM products  p WHERE p.id = g.entity_id AND p.company_id = g.company_id)) OR
         (g.entity_type = 'customer' AND EXISTS (SELECT 1 FROM customers c WHERE c.id = g.entity_id AND c.company_id = g.company_id)) OR
         (g.entity_type = 'supplier' AND EXISTS (SELECT 1 FROM suppliers s WHERE s.id = g.entity_id AND s.company_id = g.company_id))
       )
     ORDER BY LENGTH(g.term_key) DESC`,
    [companyId]
  );
  if (!entries.rows.length) return { message: text, matches: [] };

  const folded = fold(text);
  const taken = [];
  const replacements = [];
  const matches = [];

  for (const entry of entries.rows) {
    const re = buildTermPattern(entry.term);
    if (!re) continue;
    let m;
    let used = false;
    while ((m = re.exec(folded)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (taken.some(([s, e]) => start < e && end > s)) continue;
      taken.push([start, end]);
      replacements.push({ start, end, canonical: entry.canonical_text });
      used = true;
      if (m[0].length === 0) re.lastIndex += 1;
    }
    if (used) {
      matches.push({ term: entry.term, canonical: entry.canonical_text, entity_type: entry.entity_type, entity_id: entry.entity_id, id: entry.id });
    }
  }

  if (!replacements.length) return { message: text, matches: [] };

  let out = text;
  replacements.sort((a, b) => b.start - a.start);
  for (const r of replacements) {
    out = `${out.slice(0, r.start)}${r.canonical}${out.slice(r.end)}`;
  }

  // Kullanım sayacı (hata sohbeti bozmasın)
  pool.query('UPDATE company_glossary SET usage_count = usage_count + 1 WHERE id = ANY($1::int[])', [matches.map((x) => x.id)]).catch(() => {});

  return { message: out, matches };
}

// "kum zımparası 200'lük" gibi serbest metni arama kelimelerine ayırır.
const targetWords = (text) => {
  const cleaned = fold(text)
    .replace(/(\d+)\s*['’]?\s*l[iu]k\b/g, '$1')
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ');
  const stop = new Set(['olan', 'olani', 'olanin', 'olandan', 'olana', 'olarak', 'ile', 've', 'bir', 'bu', 'o', 'ki', 'de', 'da', 'icin', 'urun', 'urunu', 'urunden', 'olanlar', 'kastettim', 'kastediyorum', 'dedim', 'demek', 'yani', 'evet', 'hayir']);
  return cleaned.split(/\s+/).filter((w) => w && !stop.has(w) && (w.length >= 2 || /\d/.test(w)));
};

const digitToken = (name, digits) => new RegExp(`(^|[^0-9])${digits}([^0-9]|$)`).test(name);

// Ürün/müşteri/tedarikçi adayları: serbest metne en çok benzeyenler.
// opts.code: "mavi200" gibi bir kod için harf+rakam ipuçlarıyla arar (açıklama alanına da bakar).
async function findCandidates(companyId, text, { limit = 5, code = null } = {}) {
  let words = targetWords(text);
  let letterHints = [];
  let digitHints = [];
  if (code) {
    const f = fold(code);
    letterHints = (f.match(/[a-z]{3,}/g) || []);
    digitHints = (f.match(/\d{2,}/g) || []);
    words = [...new Set([...words, ...letterHints, ...digitHints])];
  }
  if (!words.length) return [];

  const params = [companyId];
  const likeClauses = (cols) => words.map((w) => {
    params.push(`%${w}%`);
    return `(${cols.map((c) => `${foldSql(c)} LIKE $${params.length}`).join(' OR ')})`;
  }).join(' OR ');

  const rows = [];
  const prod = await pool.query(
    `SELECT id, name, sku, category, COALESCE(description, '') AS description FROM products
     WHERE company_id = $1 AND is_active IS NOT FALSE AND (${likeClauses(['name', 'sku', 'category', "COALESCE(description, '')"])})
     LIMIT 60`,
    params
  );
  for (const p of prod.rows) rows.push({ type: 'product', id: p.id, name: p.name, haystack: fold(`${p.name} ${p.sku} ${p.category || ''}`), desc: fold(p.description) });

  const custParams = [companyId];
  const custClauses = words.map((w) => {
    custParams.push(`%${w}%`);
    return `(${foldSql('full_name')} LIKE $${custParams.length} OR ${foldSql('company_name')} LIKE $${custParams.length})`;
  }).join(' OR ');
  const cust = await pool.query(`SELECT id, full_name, company_name FROM customers WHERE company_id = $1 AND (${custClauses}) LIMIT 30`, custParams);
  for (const c of cust.rows) rows.push({ type: 'customer', id: c.id, name: c.full_name, extra: c.company_name, haystack: fold(`${c.full_name} ${c.company_name}`), desc: '' });

  const supParams = [companyId];
  const supClauses = words.map((w) => {
    supParams.push(`%${w}%`);
    return `${foldSql('supplier_name')} LIKE $${supParams.length}`;
  }).join(' OR ');
  const sup = await pool.query(`SELECT id, supplier_name FROM suppliers WHERE company_id = $1 AND (${supClauses}) LIMIT 20`, supParams)
    .catch(() => ({ rows: [] }));
  for (const s of sup.rows) rows.push({ type: 'supplier', id: s.id, name: s.supplier_name, haystack: fold(s.supplier_name), desc: '' });

  const wholeText = fold(text);
  const scored = rows.map((r) => {
    let score = 0;
    let matched = 0;
    for (const w of words) {
      if (/^\d+$/.test(w)) {
        if (digitToken(r.haystack, w)) { score += 3; matched += 1; }
        else if (r.haystack.includes(w)) { score += 1; matched += 1; }
      } else if (r.haystack.includes(w)) { score += 2; matched += 1; }
    }
    // Yan yana gelen kelime çiftleri ("kum zımparası" ≠ "su zımparası ... kum") ek puan alır
    for (let i = 0; i + 1 < words.length; i += 1) {
      if (r.haystack.includes(`${words[i]} ${words[i + 1]}`)) score += 3;
    }
    for (const w of letterHints) if (r.desc.includes(w)) score += 3;
    if (wholeText && r.haystack.includes(wholeText.trim())) score += 3;
    if (fold(r.name) === wholeText.trim()) score += 5;
    return { ...r, score, coverage: words.length ? matched / words.length : 0 };
  }).filter((r) => r.score > 0);

  scored.sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name), 'tr'));
  return scored.slice(0, limit).map(({ type, id, name, extra, score, coverage }) => ({ type, id, name, extra: extra || null, score, coverage }));
}

// "mavi200" gibi kod benzeri bir ifade gerçekten sistemde (ürün, müşteri, sipariş, çek...) geçiyor mu?
async function existsInSystem(companyId, token) {
  // Yazıldığı haliyle (tire dahil) aranır: "su200", "ZMP-SU-200" stok kodunun parçası sayılmaz;
  // "DEMO-ORD-004" ve "LP001" ise sipariş/ürün kodunun içinde aynen geçtiği için bilinir.
  const raw = fold(token).trim();
  if (!raw || raw.length < 2) return false;
  const like = `%${raw.replace(/[%_\\]/g, '\\$&')}%`;
  const r = await pool.query(
    `SELECT 1 WHERE EXISTS (SELECT 1 FROM products  WHERE company_id = $1 AND (${foldSql('name')} LIKE $2 OR ${foldSql('sku')} LIKE $2))
        OR EXISTS (SELECT 1 FROM customers WHERE company_id = $1 AND (${foldSql('full_name')} LIKE $2 OR ${foldSql('company_name')} LIKE $2))
        OR EXISTS (SELECT 1 FROM orders    WHERE company_id = $1 AND ${foldSql('order_number')} LIKE $2)
        OR EXISTS (SELECT 1 FROM cheques   WHERE company_id = $1 AND ${foldSql('check_serial_no')} LIKE $2)`,
    [companyId, like]
  );
  return r.rows.length > 0;
}

module.exports = {
  fold,
  termKey,
  targetWords,
  buildTermPattern,
  ENTITY_LABELS,
  list,
  add,
  remove,
  removeById,
  resolveMessage,
  findCandidates,
  existsInSystem
};
