/**
 * Hırdavat / yapı malzemesi toptancısı demo şirketi (jargon ve şirket sözlüğü denemeleri için).
 * Ayrı bir şirket oluşturur; "Varsayılan Şirket" demo verisine dokunmaz. İdempotenttir.
 *
 *   docker compose exec backend node scripts/seed_hirdavat_demo.js
 *
 * Giriş (yerel demo): admin@hirdavat.local / manager@hirdavat.local / user@hirdavat.local
 * Şifre diğer demo hesaplarıyla aynıdır (CLAUDE.md). Üretimde çalıştırılmaz.
 */
const bcrypt = require('bcryptjs');
const pool = require('../src/config/database');

if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
  console.error('Demo seed üretim ortamında çalıştırılmaz (--force ile zorlanabilir).');
  process.exit(1);
}

const COMPANY = { name: 'Demirci Hırdavat ve Yapı Market', code: 'DEMO_HIRDAVAT' };

const USERS = [
  { username: 'hirdavat_admin', email: 'admin@hirdavat.local', role: 'admin' },
  { username: 'hirdavat_manager', email: 'manager@hirdavat.local', role: 'manager' },
  { username: 'hirdavat_user', email: 'user@hirdavat.local', role: 'user' }
];

// Açıklama alanı sektörün gerçek jargonunu taşır (mavi kağıt, siyah su zımparası, cam silikonu...).
const PRODUCTS = [
  ['ZMP-KUM-120', 'Kum Zımparası 120 Kum', 'Zımpara', 18.5, 380, 'kırmızı kağıt kum zımpara, kaba ve orta düzeltme, 230x280 mm'],
  ['ZMP-KUM-200', 'Kum Zımparası 200 Kum', 'Zımpara', 18.5, 420, 'mavi kağıt kum zımpara, ince düzeltme, ahşap ve boya, 230x280 mm'],
  ['ZMP-KUM-400', 'Kum Zımparası 400 Kum', 'Zımpara', 19.5, 240, 'yeşil kağıt kum zımpara, çok ince, cila öncesi'],
  ['ZMP-SU-200', 'Su Zımparası 200 Kum', 'Zımpara', 22, 150, 'siyah su zımparası, ıslak kullanım, kaba'],
  ['ZMP-SU-400', 'Su Zımparası 400 Kum', 'Zımpara', 22, 260, 'siyah su zımparası, ıslak kullanım, oto boya ve ahşap'],
  ['DUB-CEL-08', 'Çelik Dübel 8 mm', 'Bağlantı', 4.2, 3000, 'çelik çivili dübel, beton ve tuğla, 8 mm'],
  ['DUB-PLS-08', 'Plastik Dübel 8 mm', 'Bağlantı', 0.65, 12000, 'plastik dübel, sıva ve gazbeton, 8 mm'],
  ['VDA-ALC-35', 'Alçıpan Vidası 3.5x25', 'Bağlantı', 0.18, 25000, 'fosfatlı alçıpan vidası, kutu 1000 adet'],
  ['SLK-SFF-280', 'Şeffaf Silikon 280 ml', 'Yapıştırıcı', 64, 180, 'cam silikonu, akvaryum ve cam tipi şeffaf silikon, kartuş'],
  ['SLK-BYZ-280', 'Beyaz Silikon 280 ml', 'Yapıştırıcı', 64, 7, 'sıhhi tesisat silikonu, küf önleyici, kartuş'],
  ['BOY-IC-15', 'İç Cephe Boyası Beyaz 15 L', 'Boya', 1450, 40, 'silinebilir plastik boya, tavan ve duvar, kova'],
  ['FRC-100', 'Fırça 100 mm (4 inç)', 'Boya', 85, 90, 'badana fırçası, 4 numara'],
  ['KBL-NYM-3X15', 'NYM Kablo 3x1.5 mm² (100 m)', 'Elektrik', 2150, 25, 'bakır iletkenli NYM kablo, makara 100 metre']
];

const CUSTOMERS = [
  ['Hasan Demirci', 'Demirci Yapı Market', 'Kadıköy VD', '1234567801', '05320000001', 'İstanbul'],
  ['Kemal Aydın', 'Aydın İnşaat Taahhüt', 'Ümraniye VD', '1234567802', '05320000002', 'İstanbul'],
  ['Fatma Koç', 'Koç Boya ve Dekorasyon', 'Beşiktaş VD', '1234567803', '05320000003', 'İstanbul'],
  ['Murat Şahin', 'Şahin Elektrik', 'Pendik VD', '1234567804', '05320000004', 'İstanbul']
];

const SUPPLIERS = ['Başak Zımpara Sanayi', 'Ege Bağlantı Elemanları'];

// Önceden öğretilmiş birkaç terim. "mavi200" bilerek YOK: sohbette sorup öğrenme senaryosu için.
const GLOSSARY = [
  ['su400', 'product', 'Su Zımparası 400 Kum'],
  ['çelik8', 'product', 'Çelik Dübel 8 mm'],
  ['hasan abi', 'customer', 'Hasan Demirci']
];

const termKey = (t) => String(t).toLowerCase()
  .replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g')
  .replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
  .replace(/[^a-z0-9]/g, '');

async function main() {
  const pwHash = bcrypt.hashSync('Admin123!', 10);

  let company = (await pool.query('SELECT id FROM companies WHERE company_code = $1', [COMPANY.code])).rows[0];
  if (!company) {
    company = (await pool.query(
      `INSERT INTO companies (company_name, company_code, city, is_active) VALUES ($1, $2, 'İstanbul', true) RETURNING id`,
      [COMPANY.name, COMPANY.code]
    )).rows[0];
    console.log(`✓ Şirket oluşturuldu: ${COMPANY.name}`);
  }
  const companyId = company.id;

  let adminId = null;
  for (const u of USERS) {
    let row = (await pool.query('SELECT id FROM users WHERE email = $1', [u.email])).rows[0];
    if (!row) {
      row = (await pool.query(
        `INSERT INTO users (username, email, password_hash, role, company_id, approval_status, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'approved', true, NOW(), NOW()) RETURNING id`,
        [u.username, u.email, pwHash, u.role, companyId]
      )).rows[0];
      console.log(`✓ Kullanıcı: ${u.email} (${u.role})`);
    }
    if (u.role === 'admin') adminId = row.id;
  }

  for (const [sku, name, category, price, stock, description] of PRODUCTS) {
    await pool.query(
      `INSERT INTO products (name, description, sku, category, price, stock_quantity, low_stock_threshold, company_id)
       SELECT $1::varchar, $2::text, $3::varchar, $4::varchar, $5::numeric, $6::int, 10, $7::int
       WHERE NOT EXISTS (SELECT 1 FROM products WHERE company_id = $7::int AND sku = $3::varchar)`,
      [name, description, sku, category, price, stock, companyId]
    );
  }

  for (const [fullName, companyName, taxOffice, taxNo, phone, city] of CUSTOMERS) {
    await pool.query(
      `INSERT INTO customers (user_id, full_name, company_name, tax_office, tax_number, phone_number, company_location, company_id)
       SELECT $1::int, $2::varchar, $3::varchar, $4::varchar, $5::varchar, $6::varchar, $7::varchar, $8::int
       WHERE NOT EXISTS (SELECT 1 FROM customers WHERE company_id = $8::int AND tax_number = $5::varchar)`,
      [adminId, fullName, companyName, taxOffice, taxNo, phone, city, companyId]
    );
  }

  for (const name of SUPPLIERS) {
    await pool.query(
      `INSERT INTO suppliers (supplier_name, company_id)
       SELECT $1::varchar, $2::int WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE company_id = $2::int AND supplier_name = $1::varchar)`,
      [name, companyId]
    );
  }

  for (const [term, type, canonicalName] of GLOSSARY) {
    const table = type === 'product' ? 'products' : 'customers';
    const col = type === 'product' ? 'name' : 'full_name';
    const ent = (await pool.query(`SELECT id FROM ${table} WHERE company_id = $1 AND ${col} = $2`, [companyId, canonicalName])).rows[0];
    if (!ent) continue;
    await pool.query(
      `INSERT INTO company_glossary (company_id, term, term_key, entity_type, entity_id, canonical_text, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (company_id, term_key) DO NOTHING`,
      [companyId, term, termKey(term), type, ent.id, canonicalName, adminId]
    );
  }

  const counts = (await pool.query(
    `SELECT (SELECT COUNT(*) FROM products WHERE company_id = $1) AS products,
            (SELECT COUNT(*) FROM customers WHERE company_id = $1) AS customers,
            (SELECT COUNT(*) FROM company_glossary WHERE company_id = $1) AS glossary`,
    [companyId]
  )).rows[0];
  console.log(`✓ Hazır: şirket #${companyId} · ${counts.products} ürün · ${counts.customers} müşteri · ${counts.glossary} sözlük terimi`);
  await pool.end();
}

main().catch(async (err) => {
  console.error('Seed hatası:', err.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
