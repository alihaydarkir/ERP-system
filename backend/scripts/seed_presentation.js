/**
 * Sunum için demo veri oluşturur.
 * Mevcut veriyi silmeden ÜZERİNE ekler.
 * Kullanım: node scripts/seed_presentation.js
 */
require('dotenv').config();
const pool = require('../src/config/database');

const COMPANY_ID = 1;
const USER_ID    = 1;

const C = {
  green: '\x1b[32m', red: '\x1b[31m', cyan: '\x1b[36m',
  bold: '\x1b[1m', reset: '\x1b[0m', gray: '\x1b[90m',
};

function ago(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

async function run() {
  console.log(`\n${C.bold}${C.cyan}🌱 Sunum verisi oluşturuluyor...${C.reset}\n`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. MÜŞTERİLER ──────────────────────────────────────────
    console.log('👥 Müşteriler kontrol ediliyor...');

    const newCustomers = [
      { full_name: 'Kemal Aydın',  company_name: 'Aydın Tekstil Ltd.',   tax_office: 'İzmir VD',   tax_number: '1234567890', phone: '0555 123 4567', location: 'İzmir' },
      { full_name: 'Selin Çelik',  company_name: 'Çelik İnşaat A.Ş.',   tax_office: 'Ankara VD',  tax_number: '2345678901', phone: '0532 987 6543', location: 'Ankara' },
      { full_name: 'Bülent Kara',  company_name: 'Kara Market Zinciri', tax_office: 'Bursa VD',   tax_number: '3456789012', phone: '0542 456 7890', location: 'Bursa' },
      { full_name: 'Aylin Şen',    company_name: 'Şen Gıda Dağıtım',    tax_office: 'İstanbul VD', tax_number: '4567890123', phone: '0533 321 0987', location: 'İstanbul' },
    ];

    const customerIds = [];
    const existCust = await client.query(
      'SELECT id FROM customers WHERE company_id = $1 ORDER BY id LIMIT 10', [COMPANY_ID]
    );
    existCust.rows.forEach(r => customerIds.push(r.id));

    for (const c of newCustomers) {
      const exists = await client.query(
        'SELECT id FROM customers WHERE company_id=$1 AND full_name=$2', [COMPANY_ID, c.full_name]
      );
      if (exists.rows.length === 0) {
        const r = await client.query(
          `INSERT INTO customers (company_id, user_id, full_name, company_name, tax_office, tax_number, phone_number, company_location, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) RETURNING id`,
          [COMPANY_ID, USER_ID, c.full_name, c.company_name, c.tax_office, c.tax_number, c.phone, c.location]
        );
        customerIds.push(r.rows[0].id);
        console.log(`  ${C.green}+${C.reset} ${c.full_name} — ${c.company_name}`);
      }
    }
    console.log(`  ${C.gray}Kullanılacak müşteri ID'leri: [${customerIds.slice(0,5).join(', ')}...]${C.reset}\n`);

    // ── 2. ÜRÜNLER ──────────────────────────────────────────────
    const products = await client.query(
      'SELECT id, name, price FROM products WHERE company_id = $1 AND is_active = true ORDER BY id', [COMPANY_ID]
    );
    const prods = products.rows;
    if (prods.length === 0) {
      console.log(`${C.red}❌ Ürün bulunamadı. Önce seed-data.js çalıştırın.${C.reset}`);
      await client.query('ROLLBACK');
      return;
    }

    // ── 3. SİPARİŞLER (son 3 ay, hareketli) ─────────────────────
    console.log('🛒 Siparişler kontrol ediliyor...');
    const existOrders = await client.query(
      'SELECT COUNT(*) FROM orders WHERE company_id = $1', [COMPANY_ID]
    );
    const existOrderCount = parseInt(existOrders.rows[0].count);

    if (existOrderCount >= 25) {
      console.log(`  ${C.gray}Zaten ${existOrderCount} sipariş var, ekleme yapılmıyor.${C.reset}\n`);
    } else {
      const orderData = [
        { custIdx: 0, daysAgo: 88, status: 'completed', items: [[0, 3], [1, 1]] },
        { custIdx: 1, daysAgo: 82, status: 'completed', items: [[2, 2], [3, 5]] },
        { custIdx: 2, daysAgo: 75, status: 'completed', items: [[1, 4]] },
        { custIdx: 3, daysAgo: 68, status: 'cancelled',  items: [[4, 2]] },
        { custIdx: 0, daysAgo: 61, status: 'completed', items: [[0, 1], [5, 3]] },
        { custIdx: 1, daysAgo: 54, status: 'completed', items: [[2, 6], [6, 2]] },
        { custIdx: 2, daysAgo: 47, status: 'completed', items: [[3, 4], [0, 2]] },
        { custIdx: 3, daysAgo: 41, status: 'completed', items: [[0, 1]] },
        { custIdx: 0, daysAgo: 35, status: 'completed', items: [[1, 2], [4, 3]] },
        { custIdx: 1, daysAgo: 28, status: 'completed', items: [[0, 5]] },
        { custIdx: 2, daysAgo: 21, status: 'processing', items: [[2, 3], [1, 1]] },
        { custIdx: 3, daysAgo: 16, status: 'completed', items: [[3, 2]] },
        { custIdx: 0, daysAgo: 12, status: 'pending',    items: [[3, 4], [0, 1]] },
        { custIdx: 1, daysAgo: 9,  status: 'pending',    items: [[1, 3]] },
        { custIdx: 2, daysAgo: 6,  status: 'pending',    items: [[0, 2], [2, 2]] },
        { custIdx: 3, daysAgo: 4,  status: 'processing', items: [[4, 5]] },
        { custIdx: 0, daysAgo: 2,  status: 'pending',    items: [[1, 1], [3, 2]] },
        { custIdx: 1, daysAgo: 1,  status: 'pending',    items: [[2, 4]] },
      ];

      let orderNum = 200;
      for (const od of orderData) {
        const custId = customerIds[od.custIdx % customerIds.length];
        const createdAt = ago(od.daysAgo);
        const orderItems = od.items.map(([pi, qty]) => ({
          product: prods[pi % prods.length],
          qty
        }));
        const totalAmount = orderItems.reduce((s, i) => s + parseFloat(i.product.price) * i.qty, 0);
        const orderNumber = `ORD-DEMO-${String(orderNum++).padStart(3, '0')}`;
        const completedAt = od.status === 'completed' ? createdAt : null;

        const cols = completedAt
          ? '(company_id, user_id, customer_id, order_number, status, total_amount, created_at, updated_at, completed_at)'
          : '(company_id, user_id, customer_id, order_number, status, total_amount, created_at, updated_at)';
        const vals = completedAt
          ? `($1,$2,$3,$4,$5,$6,$7,$7,$7)`
          : `($1,$2,$3,$4,$5,$6,$7,$7)`;

        const oRes = await client.query(
          `INSERT INTO orders ${cols} VALUES ${vals}
           ON CONFLICT (order_number) DO NOTHING RETURNING id`,
          [COMPANY_ID, USER_ID, custId, orderNumber, od.status, totalAmount.toFixed(2), createdAt]
        );

        if (oRes.rows.length > 0) {
          const orderId = oRes.rows[0].id;
          for (const item of orderItems) {
            await client.query(
              `INSERT INTO order_items (order_id, product_id, quantity, price, company_id)
               VALUES ($1,$2,$3,$4,$5)`,
              [orderId, item.product.id, item.qty, item.product.price, COMPANY_ID]
            );
          }
          console.log(`  ${C.green}+${C.reset} ${orderNumber} — ${od.status} — ₺${totalAmount.toFixed(0)}`);
        }
      }
      console.log();
    }

    // ── 4. ÇEKLER ──────────────────────────────────────────────
    console.log('📋 Çekler kontrol ediliyor...');
    const existCheques = await client.query(
      'SELECT COUNT(*) FROM cheques WHERE company_id = $1', [COMPANY_ID]
    );
    const chequeCount = parseInt(existCheques.rows[0].count);

    if (chequeCount >= 8) {
      console.log(`  ${C.gray}Zaten ${chequeCount} çek var.${C.reset}\n`);
    } else {
      const chequeData = [
        { custIdx: 0, amount: 45000, bank: 'Ziraat Bankası', issuer: 'Aydın Tekstil Ltd.', daysFromNow: 10 },
        { custIdx: 1, amount: 28500, bank: 'İş Bankası',     issuer: 'Çelik İnşaat A.Ş.',  daysFromNow: 25 },
        { custIdx: 2, amount: 67800, bank: 'Garanti BBVA',   issuer: 'Kara Market',         daysFromNow: -5 },
        { custIdx: 3, amount: 15300, bank: 'Yapı Kredi',     issuer: 'Şen Gıda',            daysFromNow: 45 },
        { custIdx: 0, amount: 33700, bank: 'Akbank',         issuer: 'Aydın Tekstil Ltd.', daysFromNow: -12 },
      ];

      let cheqNum = 400;
      for (const cd of chequeData) {
        const custId = customerIds[cd.custIdx % customerIds.length];
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + cd.daysFromNow);
        const serial = `CHK-DEMO-${String(cheqNum++).padStart(3, '0')}`;
        await client.query(
          `INSERT INTO cheques (company_id, user_id, customer_id, check_serial_no, check_issuer, bank_name,
            received_date, due_date, amount, currency, status, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,$8,'TRY','pending',NOW(),NOW())
           ON CONFLICT DO NOTHING`,
          [COMPANY_ID, USER_ID, custId, serial, cd.issuer, cd.bank,
           dueDate.toISOString().split('T')[0], cd.amount]
        );
        const overdue = cd.daysFromNow < 0 ? ' (VADESİ GEÇMİŞ)' : '';
        console.log(`  ${C.green}+${C.reset} ${serial} — ${cd.bank} — ₺${cd.amount}${C.red}${overdue}${C.reset}`);
      }
      console.log();
    }

    await client.query('COMMIT');
    console.log(`${C.bold}${C.green}✅ Sunum verisi başarıyla oluşturuldu!${C.reset}\n`);

    // Özet
    const [ordSum, custSum, cheqSum] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM orders WHERE company_id=$1', [COMPANY_ID]),
      pool.query('SELECT COUNT(*) FROM customers WHERE company_id=$1', [COMPANY_ID]),
      pool.query('SELECT COUNT(*) FROM cheques WHERE company_id=$1', [COMPANY_ID]),
    ]);
    console.log(`  ${C.cyan}Siparişler :${C.reset} ${ordSum.rows[0].count}`);
    console.log(`  ${C.cyan}Müşteriler :${C.reset} ${custSum.rows[0].count}`);
    console.log(`  ${C.cyan}Çekler     :${C.reset} ${cheqSum.rows[0].count}\n`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`${C.red}❌ Hata:${C.reset}`, err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

run();
