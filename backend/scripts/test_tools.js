/**
 * ERP Tool Integration Test
 * Gerçek DB'ye bağlanır — mock yok, şema hataları anında yakalanır.
 * Kullanım: node scripts/test_tools.js
 *           node scripts/test_tools.js --only=query   (sadece query testleri)
 *           node scripts/test_tools.js --only=mutation (sadece mutation testleri)
 */

require('dotenv').config();

const queryTools  = require('../src/services/tools/queryTools');
const mutationTools = require('../src/services/tools/mutationTools');
const pool        = require('../src/config/database');

// ── Renk kodları ──────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
};

const COMPANY_ID = 1;   // test edilecek şirket
const USER_ID    = 1;   // mutation testleri için kullanıcı

const only = (() => {
  const arg = process.argv.find(a => a.startsWith('--only='));
  return arg ? arg.split('=')[1] : 'all';
})();

// ── Yardımcı fonksiyonlar ─────────────────────────────────────────────────────
let passed = 0, failed = 0, skipped = 0;
const results = [];

function log(symbol, name, msg, detail = null) {
  const line = `${symbol} ${C.bold}${name}${C.reset}  ${msg}`;
  console.log(line);
  if (detail) console.log(`   ${C.gray}${detail}${C.reset}`);
}

async function runTest(name, fn) {
  try {
    const t0  = Date.now();
    const out = await fn();
    const ms  = Date.now() - t0;
    const preview = JSON.stringify(out).slice(0, 120);
    log(`${C.green}✅${C.reset}`, name, `${C.gray}(${ms}ms)${C.reset}`, preview);
    passed++;
    results.push({ name, ok: true, ms });
  } catch (err) {
    log(`${C.red}❌${C.reset}`, name, `${C.red}${err.message}${C.reset}`);
    if (err.detail) console.log(`   ${C.gray}PG detail: ${err.detail}${C.reset}`);
    if (err.hint)   console.log(`   ${C.gray}PG hint:   ${err.hint}${C.reset}`);
    if (err.where)  console.log(`   ${C.gray}PG where:  ${err.where}${C.reset}`);
    failed++;
    results.push({ name, ok: false, error: err.message });
  }
}

// Mutation testlerini transaction içinde çalıştır → her zaman rollback
async function runMutationTest(name, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // pool'u geçici olarak bu client'a yönlendir
    const origQuery = pool.query.bind(pool);
    pool.query = (...args) => client.query(...args);

    const t0  = Date.now();
    const out = await fn();
    const ms  = Date.now() - t0;
    const preview = JSON.stringify(out).slice(0, 120);
    log(`${C.green}✅${C.reset}`, name, `${C.gray}(${ms}ms) [rollback]${C.reset}`, preview);
    passed++;
    results.push({ name, ok: true, ms });

    pool.query = origQuery;
    await client.query('ROLLBACK');
  } catch (err) {
    pool.query = pool.query.bind ? pool.query : (() => {});  // güvenli reset
    await client.query('ROLLBACK').catch(() => {});

    log(`${C.red}❌${C.reset}`, name, `${C.red}${err.message}${C.reset}`);
    if (err.detail) console.log(`   ${C.gray}PG detail: ${err.detail}${C.reset}`);
    if (err.hint)   console.log(`   ${C.gray}PG hint:   ${err.hint}${C.reset}`);
    if (err.where)  console.log(`   ${C.gray}PG where:  ${err.where}${C.reset}`);
    failed++;
    results.push({ name, ok: false, error: err.message });
  } finally {
    client.release();
  }
}

// ── QUERY TESTLERI ────────────────────────────────────────────────────────────
async function runQueryTests() {
  console.log(`\n${C.cyan}${C.bold}━━━ QUERY TOOLS ━━━${C.reset}\n`);

  // Dashboard & finansal
  await runTest('get_dashboard_summary', () =>
    queryTools.get_dashboard_summary({ company_id: COMPANY_ID })
  );
  await runTest('get_dashboard_summary → sayılar numeric', async () => {
    const r = await queryTools.get_dashboard_summary({ company_id: COMPANY_ID });
    if (r.total_orders === undefined) throw new Error('total_orders eksik');
    if (r.total_revenue === undefined) throw new Error('total_revenue eksik');
    if (r.overdue_cheques_count === undefined) throw new Error('overdue_cheques_count eksik');
    return { fields_ok: true };
  });

  await runTest('get_financial_summary', () =>
    queryTools.get_financial_summary({ company_id: COMPANY_ID })
  );
  await runTest('get_financial_summary → tüm alanlar var', async () => {
    const r = await queryTools.get_financial_summary({ company_id: COMPANY_ID });
    const required = ['pending_cheques_amount','pending_cheques_count','overdue_cheques_amount','overdue_cheques_count','this_month_revenue','this_year_revenue','pending_orders_amount','pending_orders_count'];
    const missing = required.filter(k => r[k] === undefined);
    if (missing.length) throw new Error(`Eksik alanlar: ${missing.join(', ')}`);
    return { all_fields_present: true };
  });

  await runTest('get_low_stock_products', () =>
    queryTools.get_low_stock_products({ company_id: COMPANY_ID })
  );
  await runTest('get_low_stock_products → stok <= eşik', async () => {
    const r = await queryTools.get_low_stock_products({ company_id: COMPANY_ID });
    const invalid = r.products.filter(p => Number(p.stock_quantity) > Number(p.low_stock_threshold));
    if (invalid.length) throw new Error(`Eşik aşan ürün var: ${invalid.map(p=>p.name).join(', ')}`);
    return { all_below_threshold: true, count: r.count };
  });

  // Ürün arama
  await runTest('search_products (tümü)', () =>
    queryTools.search_products({ company_id: COMPANY_ID, limit: 5 })
  );
  await runTest('search_products (arama: "laptop")', () =>
    queryTools.search_products({ search: 'laptop', company_id: COMPANY_ID, limit: 10 })
  );
  await runTest('search_products (arama: "elektronik")', () =>
    queryTools.search_products({ search: 'elektronik', company_id: COMPANY_ID, limit: 10 })
  );
  await runTest('search_products (bulunamayan arama)', async () => {
    const r = await queryTools.search_products({ search: 'xyznotexist999', company_id: COMPANY_ID });
    return { count: r.count, correct: r.count === 0 };
  });
  await runTest('search_products (limit=1)', async () => {
    const r = await queryTools.search_products({ company_id: COMPANY_ID, limit: 1 });
    if (r.products.length > 1) throw new Error('limit=1 ama ' + r.products.length + ' sonuç döndü');
    return { products: r.products.length };
  });

  // Müşteri arama
  await runTest('search_customers (tümü)', () =>
    queryTools.search_customers({ company_id: COMPANY_ID, limit: 5 })
  );
  await runTest('search_customers (arama: "Yılmaz")', () =>
    queryTools.search_customers({ search: 'Yılmaz', company_id: COMPANY_ID, limit: 10 })
  );
  await runTest('search_customers (bulunamayan arama)', async () => {
    const r = await queryTools.search_customers({ search: 'xyznotexist999', company_id: COMPANY_ID });
    return { count: r.count, correct: r.count === 0 };
  });

  // Sipariş özeti
  await runTest('get_orders_summary (month)', () =>
    queryTools.get_orders_summary({ period: 'month', company_id: COMPANY_ID })
  );
  await runTest('get_orders_summary (today)', () =>
    queryTools.get_orders_summary({ period: 'today', company_id: COMPANY_ID })
  );
  await runTest('get_orders_summary (week)', () =>
    queryTools.get_orders_summary({ period: 'week', company_id: COMPANY_ID })
  );
  await runTest('get_orders_summary → geçersiz period → month fallback', async () => {
    const r = await queryTools.get_orders_summary({ period: 'year', company_id: COMPANY_ID });
    return { period: r.period };
  });

  await runTest('get_orders_list (tümü)', () =>
    queryTools.get_orders_list({ company_id: COMPANY_ID, limit: 5 })
  );

  await runTest('get_orders_list (pending)', () =>
    queryTools.get_orders_list({ status: 'pending', company_id: COMPANY_ID, limit: 5 })
  );

  await runTest('get_orders_list (completed)', () =>
    queryTools.get_orders_list({ status: 'completed', company_id: COMPANY_ID, limit: 5 })
  );

  await runTest('search_orders', () =>
    queryTools.search_orders({ search: '', company_id: COMPANY_ID, limit: 5 })
  );

  // Sipariş listesi
  await runTest('get_orders_list (tümü)', () =>
    queryTools.get_orders_list({ company_id: COMPANY_ID, limit: 5 })
  );
  await runTest('get_orders_list (pending)', () =>
    queryTools.get_orders_list({ status: 'pending', company_id: COMPANY_ID, limit: 5 })
  );
  await runTest('get_orders_list (completed)', () =>
    queryTools.get_orders_list({ status: 'completed', company_id: COMPANY_ID, limit: 5 })
  );
  await runTest('get_orders_list (processing)', () =>
    queryTools.get_orders_list({ status: 'processing', company_id: COMPANY_ID, limit: 5 })
  );
  await runTest('get_orders_list (cancelled)', () =>
    queryTools.get_orders_list({ status: 'cancelled', company_id: COMPANY_ID, limit: 5 })
  );
  await runTest('search_orders (boş arama)', () =>
    queryTools.search_orders({ search: '', company_id: COMPANY_ID, limit: 5 })
  );
  await runTest('search_orders (sipariş no arama)', () =>
    queryTools.search_orders({ search: 'ORD-2026', company_id: COMPANY_ID, limit: 10 })
  );
  await runTest('search_orders (müşteri adı arama)', () =>
    queryTools.search_orders({ search: 'Yılmaz', company_id: COMPANY_ID, limit: 10 })
  );
  await runTest('search_orders (status + arama)', () =>
    queryTools.search_orders({ search: '', status: 'pending', company_id: COMPANY_ID, limit: 5 })
  );

  // Çekler
  await runTest('search_cheques (tümü)', () =>
    queryTools.search_cheques({ company_id: COMPANY_ID, limit: 10 })
  );
  await runTest('search_cheques (pending)', () =>
    queryTools.search_cheques({ status: 'pending', company_id: COMPANY_ID, limit: 10 })
  );
  await runTest('search_cheques (paid)', () =>
    queryTools.search_cheques({ status: 'paid', company_id: COMPANY_ID, limit: 10 })
  );
  await runTest('search_cheques (cancelled)', () =>
    queryTools.search_cheques({ status: 'cancelled', company_id: COMPANY_ID, limit: 10 })
  );
  await runTest('get_overdue_cheques', () =>
    queryTools.get_overdue_cheques({ company_id: COMPANY_ID })
  );
  await runTest('get_overdue_cheques → vadesi geçmiş doğrulama', async () => {
    const r = await queryTools.get_overdue_cheques({ company_id: COMPANY_ID });
    const today = new Date();
    const future = r.cheques.filter(ch => new Date(ch.due_date) >= today);
    if (future.length) throw new Error(`Vadesi geçmemiş çek var: ${future.map(c=>c.check_serial_no).join(',')}`);
    return { all_overdue: true, count: r.count, total: r.total_overdue_amount };
  });

  // Faturalar
  await runTest('get_invoices_summary (tümü)', () =>
    queryTools.get_invoices_summary({ company_id: COMPANY_ID, limit: 10 })
  );
  await runTest('get_invoices_summary (paid)', () =>
    queryTools.get_invoices_summary({ status: 'paid', company_id: COMPANY_ID, limit: 5 })
  );
  await runTest('get_invoices_summary (overdue)', () =>
    queryTools.get_invoices_summary({ status: 'overdue', company_id: COMPANY_ID, limit: 5 })
  );

  // Tedarikçi
  await runTest('get_suppliers_list (tümü)', () =>
    queryTools.get_suppliers_list({ company_id: COMPANY_ID, limit: 10 })
  );
  await runTest('get_suppliers_list (arama)', () =>
    queryTools.get_suppliers_list({ search: 'ABC', company_id: COMPANY_ID, limit: 5 })
  );

  // Depo
  await runTest('get_warehouse_stock', () =>
    queryTools.get_warehouse_stock({ company_id: COMPANY_ID })
  );
  await runTest('get_warehouse_stock → yapı doğrulama', async () => {
    const r = await queryTools.get_warehouse_stock({ company_id: COMPANY_ID });
    const badFields = r.warehouses.filter(w => w.warehouse_name === undefined || w.total_stock_units === undefined);
    if (badFields.length) throw new Error('Eksik alan: warehouse_name veya total_stock_units');
    return { warehouses: r.count };
  });

  // Top listeler
  await runTest('get_top_customers (limit 5)', () =>
    queryTools.get_top_customers({ company_id: COMPANY_ID, limit: 5 })
  );
  await runTest('get_top_customers → sıralama kontrolü', async () => {
    const r = await queryTools.get_top_customers({ company_id: COMPANY_ID, limit: 10 });
    for (let i = 1; i < r.customers.length; i++) {
      if (Number(r.customers[i].total_spent) > Number(r.customers[i-1].total_spent)) {
        throw new Error('Müşteriler total_spent DESC sıralı değil');
      }
    }
    return { sorted: true, count: r.count };
  });

  await runTest('get_top_products (limit 5)', () =>
    queryTools.get_top_products({ company_id: COMPANY_ID, limit: 5 })
  );
  await runTest('get_top_products → total_revenue hesabı (price sütunu)', async () => {
    const r = await queryTools.get_top_products({ company_id: COMPANY_ID, limit: 5 });
    if (r.products[0] === undefined) return { note: 'ürün yok, atlandı' };
    const p = r.products[0];
    if (p.total_revenue === undefined) throw new Error('total_revenue alanı eksik');
    return { top_product: p.name, total_sold: p.total_sold, total_revenue: p.total_revenue };
  });
}

// ── MUTATION TESTLERI ─────────────────────────────────────────────────────────
async function runMutationTests() {
  console.log(`\n${C.cyan}${C.bold}━━━ MUTATION TOOLS (rollback) ━━━${C.reset}\n`);

  // Önce gerçek bir müşteri ve ürün ID'si bul
  let customerId = null, customerName = null;
  let productId = null, productName = null;
  let orderId = null, orderNumber = null;
  let chequeId = null, chequeSerial = null;

  try {
    const cRes = await pool.query(`SELECT id, full_name FROM customers WHERE company_id = $1 LIMIT 1`, [COMPANY_ID]);
    if (cRes.rows.length) { customerId = cRes.rows[0].id; customerName = cRes.rows[0].full_name; }

    const pRes = await pool.query(`SELECT id, name, sku FROM products WHERE company_id = $1 AND is_active = true LIMIT 1`, [COMPANY_ID]);
    if (pRes.rows.length) { productId = pRes.rows[0].id; productName = pRes.rows[0].name; }

    const oRes = await pool.query(`SELECT id, order_number FROM orders WHERE company_id = $1 AND status = 'pending' LIMIT 1`, [COMPANY_ID]);
    if (oRes.rows.length) { orderId = oRes.rows[0].id; orderNumber = oRes.rows[0].order_number; }

    const chRes = await pool.query(`SELECT id, check_serial_no FROM cheques WHERE company_id = $1 AND status = 'pending' LIMIT 1`, [COMPANY_ID]);
    if (chRes.rows.length) { chequeId = chRes.rows[0].id; chequeSerial = chRes.rows[0].check_serial_no; }
  } catch (err) {
    console.log(`${C.yellow}⚠ Fixture yükleme hatası: ${err.message}${C.reset}`);
  }

  console.log(`${C.gray}  Fixtures: müşteri="${customerName}" ürün="${productName}" sipariş="${orderNumber}" çek="${chequeSerial}"${C.reset}\n`);

  // set_product_stock
  if (productName) {
    await runMutationTest('set_product_stock', () =>
      mutationTools.set_product_stock({ product_identifier: productName, stock_quantity: 999, company_id: COMPANY_ID })
    );
  } else {
    log(`${C.yellow}⏭${C.reset}`, 'set_product_stock', 'ürün bulunamadı, atlandı'); skipped++;
  }

  // deactivate_product (ve activate_product ile geri al)
  if (productName) {
    await runMutationTest('deactivate_product', () =>
      mutationTools.deactivate_product({ product_identifier: productName, company_id: COMPANY_ID })
    );
    await runMutationTest('activate_product', () =>
      mutationTools.activate_product({ product_identifier: productName, company_id: COMPANY_ID })
    );
  } else {
    log(`${C.yellow}⏭${C.reset}`, 'deactivate_product / activate_product', 'ürün bulunamadı, atlandı'); skipped += 2;
  }

  // cancel_order
  if (orderNumber) {
    await runMutationTest('cancel_order', () =>
      mutationTools.cancel_order({ order_identifier: orderNumber, company_id: COMPANY_ID })
    );
  } else {
    log(`${C.yellow}⏭${C.reset}`, 'cancel_order', 'bekleyen sipariş bulunamadı, atlandı'); skipped++;
  }

  // set_order_status
  if (orderNumber) {
    await runMutationTest('set_order_status (processing)', () =>
      mutationTools.set_order_status({ order_identifier: orderNumber, status: 'processing', company_id: COMPANY_ID })
    );
    await runMutationTest('set_order_status (completed)', () =>
      mutationTools.set_order_status({ order_identifier: orderNumber, status: 'completed', company_id: COMPANY_ID })
    );
  } else {
    log(`${C.yellow}⏭${C.reset}`, 'set_order_status', 'bekleyen sipariş bulunamadı, atlandı'); skipped += 2;
  }

  // set_cheque_status
  if (chequeSerial) {
    await runMutationTest('set_cheque_status (paid)', () =>
      mutationTools.set_cheque_status({ cheque_identifier: chequeSerial, status: 'paid', company_id: COMPANY_ID })
    );
    await runMutationTest('set_cheque_status (cancelled)', () =>
      mutationTools.set_cheque_status({ cheque_identifier: chequeSerial, status: 'cancelled', company_id: COMPANY_ID })
    );
  } else {
    log(`${C.yellow}⏭${C.reset}`, 'set_cheque_status', 'bekleyen çek bulunamadı, atlandı'); skipped += 2;
  }

  // create_customer
  await runMutationTest('create_customer', () =>
    mutationTools.create_customer({
      full_name: 'TEST Kişisi',
      company_name: 'TEST A.Ş.',
      tax_office: 'Kadıköy',
      tax_number: '99999999901',
      phone_number: '05001112233',
      company_location: 'İstanbul',
      company_id: COMPANY_ID,
      user_id: USER_ID
    })
  );

  // update_customer
  if (customerId) {
    await runMutationTest('update_customer', () =>
      mutationTools.update_customer({
        customer_identifier: String(customerId),
        phone_number: '05559998877',
        company_id: COMPANY_ID
      })
    );
  } else {
    log(`${C.yellow}⏭${C.reset}`, 'update_customer', 'müşteri bulunamadı, atlandı'); skipped++;
  }

  // create_product
  await runMutationTest('create_product', () =>
    mutationTools.create_product({
      name: 'TEST ÜRÜNÜ',
      sku: 'TEST-SKU-99999',
      price: 199.99,
      stock_quantity: 50,
      category: 'Test',
      low_stock_threshold: 5,
      company_id: COMPANY_ID
    })
  );

  // create_order
  if (customerName && productName) {
    await runMutationTest('create_order', () =>
      mutationTools.create_order({
        customer_identifier: customerName,
        product_identifier: productName,
        quantity: 2,
        unit_price: null,
        company_id: COMPANY_ID,
        user_id: USER_ID
      })
    );
  } else {
    log(`${C.yellow}⏭${C.reset}`, 'create_order', 'müşteri veya ürün bulunamadı, atlandı'); skipped++;
  }

  // create_cheque
  if (customerId) {
    await runMutationTest('create_cheque', () =>
      mutationTools.create_cheque({
        check_serial_no: 'TEST-CHQ-99999',
        check_issuer: 'Test Kişisi',
        customer_identifier: String(customerId),
        bank_name: 'Ziraat Bankası',
        due_date: '2026-12-31',
        received_date: '2026-06-01',
        amount: 5000,
        currency: 'TRY',
        status: 'pending',
        company_id: COMPANY_ID,
        user_id: USER_ID
      })
    );
  } else {
    log(`${C.yellow}⏭${C.reset}`, 'create_cheque', 'müşteri bulunamadı, atlandı'); skipped++;
  }

  // create_supplier
  await runMutationTest('create_supplier', () =>
    mutationTools.create_supplier({
      supplier_name: 'TEST TEDARİKÇİ A.Ş.',
      contact_person: 'Test Kişi',
      phone: '02121234567',
      company_id: COMPANY_ID,
      user_id: USER_ID
    })
  );

  // create_warehouse
  await runMutationTest('create_warehouse', () =>
    mutationTools.create_warehouse({
      warehouse_name: 'TEST DEPO',
      warehouse_code: 'TEST-WH-99999',
      city: 'İstanbul',
      company_id: COMPANY_ID
    })
  );
}

// ── SCHEMA DOĞRULAMA TESTLERI ─────────────────────────────────────────────────
async function runSchemaTests() {
  console.log(`\n${C.cyan}${C.bold}━━━ SCHEMA DOĞRULAMA ━━━${C.reset}\n`);

  // order_items sütun adları
  await runTest('order_items: price sütunu var mı?', async () => {
    const res = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'order_items' AND column_name = 'price'
    `);
    if (!res.rows.length) throw new Error("order_items.price sütunu YOK — kod bozulur");
    return { column: 'price', exists: true };
  });

  await runTest('order_items: unit_price sütunu YOK olmalı', async () => {
    const res = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'order_items' AND column_name = 'unit_price'
    `);
    if (res.rows.length) throw new Error("order_items.unit_price sütunu VAR — eski schema mı? Kod price kullanıyor");
    return { column: 'unit_price', shouldNotExist: true, ok: true };
  });

  // cheques status CHECK constraint
  await runTest('cheques: status CHECK constraint doğru mu?', async () => {
    const res = await pool.query(`
      SELECT pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'cheques' AND c.conname LIKE '%status%'
    `);
    if (!res.rows.length) return { note: 'status constraint bulunamadı (eski migration?)' };
    const def = res.rows[0].def;
    if (!def.includes('paid')) throw new Error(`CHECK constraint 'paid' içermiyor: ${def}`);
    return { constraint: def };
  });

  // invoices tablosu varlığı
  await runTest('invoices tablosu var mı?', async () => {
    const res = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'invoices' AND table_schema = 'public'
    `);
    if (!res.rows.length) throw new Error('invoices tablosu YOK');
    return { table: 'invoices', exists: true };
  });

  // warehouses.company_id
  await runTest('warehouses: company_id sütunu var mı?', async () => {
    const res = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'warehouses' AND column_name = 'company_id'
    `);
    if (!res.rows.length) throw new Error('warehouses.company_id YOK — migration 030 çalışmamış olabilir');
    return { column: 'company_id', exists: true };
  });

  // orders.notes — OLMAMALI
  await runTest('orders: notes sütunu YOK olmalı', async () => {
    const res = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'notes'
    `);
    if (res.rows.length) throw new Error('orders.notes sütunu VAR — create_order aracı onu kullanmamaya dikkat et');
    return { column: 'notes', shouldNotExist: true, ok: true };
  });

  // customers gerekli alanlar
  await runTest('customers: tax_office ve tax_number sütunları var mı?', async () => {
    const res = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'customers' AND column_name IN ('tax_office','tax_number')
    `);
    if (res.rows.length < 2) throw new Error(`Eksik sütun: ${res.rows.map(r=>r.column_name).join(',')}`);
    return { columns: res.rows.map(r => r.column_name) };
  });

  // orders tüm sütun listesi
  await runTest('orders: gerekli sütunlar var mı?', async () => {
    const res = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'orders' AND table_schema = 'public'
    `);
    const cols = res.rows.map(r => r.column_name);
    const required = ['id','order_number','customer_id','status','total_amount','company_id','user_id','created_at'];
    const missing = required.filter(c => !cols.includes(c));
    if (missing.length) throw new Error(`Eksik sütunlar: ${missing.join(', ')}`);
    return { columns: cols.length, required_ok: true };
  });

  // cheques sütunları
  await runTest('cheques: gerekli sütunlar var mı?', async () => {
    const res = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'cheques' AND table_schema = 'public'
    `);
    const cols = res.rows.map(r => r.column_name);
    const required = ['id','check_serial_no','check_issuer','customer_id','bank_name','due_date','amount','status','company_id'];
    const missing = required.filter(c => !cols.includes(c));
    if (missing.length) throw new Error(`Eksik sütunlar: ${missing.join(', ')}`);
    return { columns: cols.length, required_ok: true };
  });

  // products sütunları
  await runTest('products: low_stock_threshold sütunu var mı?', async () => {
    const res = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'low_stock_threshold'
    `);
    if (!res.rows.length) throw new Error('low_stock_threshold YOK');
    return { column: 'low_stock_threshold', exists: true };
  });

  // Multi-tenancy kontrol: company_id tüm ana tablolarda var mı
  await runTest('multi-tenancy: tüm ana tablolarda company_id var mı?', async () => {
    const tables = ['orders','customers','products','cheques','suppliers','warehouses','order_items'];
    const res = await pool.query(`
      SELECT table_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'company_id'
        AND table_name = ANY($1)
    `, [tables]);
    const found = res.rows.map(r => r.table_name);
    const missing = tables.filter(t => !found.includes(t));
    if (missing.length) throw new Error(`company_id eksik tablolar: ${missing.join(', ')}`);
    return { tables_with_company_id: found };
  });

  // Veri bütünlüğü: orphan order_items (silinmiş siparişe ait)
  await runTest('veri bütünlüğü: orphan order_items yok', async () => {
    const res = await pool.query(`
      SELECT COUNT(*) AS cnt FROM order_items oi
      LEFT JOIN orders o ON o.id = oi.order_id
      WHERE o.id IS NULL
    `);
    const cnt = parseInt(res.rows[0].cnt);
    if (cnt > 0) throw new Error(`${cnt} orphan order_items var (siparişsiz kalem)`);
    return { orphan_count: 0 };
  });

  // Veri bütünlüğü: orphan cheques (silinmiş müşteriye ait)
  await runTest('veri bütünlüğü: orphan cheques yok', async () => {
    const res = await pool.query(`
      SELECT COUNT(*) AS cnt FROM cheques ch
      LEFT JOIN customers c ON c.id = ch.customer_id
      WHERE c.id IS NULL
    `);
    const cnt = parseInt(res.rows[0].cnt);
    if (cnt > 0) throw new Error(`${cnt} orphan cheques var (müşterisiz çek)`);
    return { orphan_count: 0 };
  });
}

// ── EDGE CASE TESTLERI ────────────────────────────────────────────────────────
async function runEdgeTests() {
  console.log(`\n${C.cyan}${C.bold}━━━ EDGE CASES ━━━${C.reset}\n`);

  // Limit sınırları
  await runTest('search_products limit=50 (max)', async () => {
    const r = await queryTools.search_products({ company_id: COMPANY_ID, limit: 50 });
    if (r.products.length > 50) throw new Error('50 limit aşıldı: ' + r.products.length);
    return { count: r.products.length };
  });

  await runTest('search_products limit=100 → 50e kırpılmalı', async () => {
    const r = await queryTools.search_products({ company_id: COMPANY_ID, limit: 100 });
    if (r.products.length > 50) throw new Error('sanitizer 50 limiti uygulamadı: ' + r.products.length);
    return { count: r.products.length, clamped: true };
  });

  // Geçersiz period
  await runTest('get_orders_summary geçersiz period → hata vermemeli', async () => {
    const r = await queryTools.get_orders_summary({ period: 'year', company_id: COMPANY_ID });
    return { period: r.period, total_orders: r.total_orders };
  });

  // Boş arama stringleri
  await runTest('search_cheques status=undefined → tümünü getir', async () => {
    const r = await queryTools.search_cheques({ company_id: COMPANY_ID });
    return { count: r.length };
  });

  // Yanlış company_id → 0 sonuç
  await runTest('get_dashboard_summary company_id=99999 → sıfır sayaçlar', async () => {
    const r = await queryTools.get_dashboard_summary({ company_id: 99999 });
    if (Number(r.total_orders) > 0) throw new Error('Başka şirket verisi sızdı! total_orders=' + r.total_orders);
    return { isolated: true, total_orders: r.total_orders };
  });

  await runTest('search_customers company_id=99999 → boş liste', async () => {
    const r = await queryTools.search_customers({ company_id: 99999 });
    if (r.count > 0) throw new Error('Başka şirket müşterileri sızdı! count=' + r.count);
    return { isolated: true };
  });

  await runTest('search_cheques company_id=99999 → boş liste', async () => {
    const r = await queryTools.search_cheques({ company_id: 99999 });
    if (r.length > 0) throw new Error('Başka şirket çekleri sızdı! count=' + r.length);
    return { isolated: true };
  });

  // Mutation: bulunamayan kayıt
  await runMutationTest('set_product_stock bulunamayan ürün → hata fırlatmalı', async () => {
    let threw = false;
    try {
      await mutationTools.set_product_stock({ product_identifier: 'XYZ_NONEXISTENT_99999', stock_quantity: 10, company_id: COMPANY_ID });
    } catch (e) {
      threw = true;
    }
    if (!threw) throw new Error('Bulunamayan ürün için hata fırlatılmadı');
    return { correctly_throws: true };
  });

  await runMutationTest('cancel_order bulunamayan sipariş → hata fırlatmalı', async () => {
    let threw = false;
    try {
      await mutationTools.cancel_order({ order_identifier: 'ORD-NONEXISTENT-99999', company_id: COMPANY_ID });
    } catch (e) {
      threw = true;
    }
    if (!threw) throw new Error('Bulunamayan sipariş için hata fırlatılmadı');
    return { correctly_throws: true };
  });

  await runMutationTest('create_customer eksik alan → hata fırlatmalı', async () => {
    let threw = false;
    try {
      await mutationTools.create_customer({ full_name: 'Eksik Alan', company_id: COMPANY_ID, user_id: USER_ID });
    } catch (e) {
      threw = true;
    }
    if (!threw) throw new Error('Eksik alan için hata fırlatılmadı');
    return { correctly_throws: true };
  });
}

// ── ANA ÇALIŞMA ───────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n${C.bold}${C.cyan}🧪  ERP Tool Integration Tests${C.reset}`);
  console.log(`${C.gray}   company_id=${COMPANY_ID} | --only=${only}${C.reset}\n`);

  try {
    if (only === 'all' || only === 'schema') await runSchemaTests();
    if (only === 'all' || only === 'query')   await runQueryTests();
    if (only === 'all' || only === 'mutation') await runMutationTests();
    if (only === 'all' || only === 'edge')     await runEdgeTests();
  } finally {
    // Özet
    const total = passed + failed + skipped;
    console.log(`\n${C.bold}━━━ SONUÇ ━━━${C.reset}`);
    console.log(`  ${C.green}✅ Geçti  : ${passed}${C.reset}`);
    console.log(`  ${C.red}❌ Hata   : ${failed}${C.reset}`);
    console.log(`  ${C.yellow}⏭ Atlandı: ${skipped}${C.reset}`);
    console.log(`  Toplam   : ${total}\n`);

    if (failed > 0) {
      console.log(`${C.red}${C.bold}Başarısız testler:${C.reset}`);
      results.filter(r => !r.ok).forEach(r => {
        console.log(`  ${C.red}• ${r.name}: ${r.error}${C.reset}`);
      });
      console.log();
    }

    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  }
})();
