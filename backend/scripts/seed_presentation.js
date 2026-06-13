/**
 * seed_presentation.js — Sunum için gerçekçi demo verisi
 *
 * Kullanım:
 *   node scripts/seed_presentation.js
 *   node scripts/seed_presentation.js --company=1
 *
 * Oluşturur:
 *   - 4 gerçekçi müşteri (VIP, normal, riskli, yeni)
 *   - 6 ürün (çeşitli stok seviyeleri)
 *   - 6 sipariş (çeşitli durumlar)
 *   - 8 çek (ödendi, bekleyen, gecikmiş — aging raporu için ideal)
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ARGS = process.argv.slice(2);
const COMPANY_ID = parseInt((ARGS.find(a => a.startsWith('--company=')) || '--company=1').split('=')[1]) || 1;

const C = {
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan:  '\x1b[36m', gray: '\x1b[90m', bold: '\x1b[1m', reset: '\x1b[0m'
};

// Staff (admin/manager/user) hesaplarını idempotent oluşturur ve owner olarak
// kullanılacak admin id'sini döndürür. Sıfır bir veritabanında (sadece migration'lar
// çalışmış) giriş yapılabilir bir admin olmadığından seed'in kendisi oluşturur.
// Şifre: Admin123!  (tüm staff hesapları için)
async function seedStaffUsers() {
  const pwHash = bcrypt.hashSync('Admin123!', 10);
  const staff = [
    { username: 'admin',   email: 'admin@erp.local',   role: 'admin'   },
    { username: 'manager', email: 'manager@erp.local', role: 'manager' },
    { username: 'user',    email: 'user@erp.local',    role: 'user'    },
  ];

  let adminId = null;
  for (const u of staff) {
    const ex = await pool.query(`SELECT id FROM users WHERE email = $1`, [u.email]);
    let id;
    if (ex.rows[0]) {
      id = ex.rows[0].id;
      console.log(`  ${C.gray}Kullanıcı zaten var: ${u.username}${C.reset}`);
    } else {
      const r = await pool.query(
        `INSERT INTO users (username, email, password_hash, role, company_id, approval_status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,'approved',NOW(),NOW()) RETURNING id`,
        [u.username, u.email, pwHash, u.role, COMPANY_ID]
      );
      id = r.rows[0].id;
      console.log(`  ${C.green}✓${C.reset} Kullanıcı oluşturuldu: ${u.username} (${u.role})`);
    }
    if (u.role === 'admin') adminId = id;
  }
  return adminId;
}

async function seedCustomers(userId) {
  const customers = [
    { full_name: 'Ahmet Yılmaz', company_name: 'Yılmaz Tekstil A.Ş.', tax_office: 'Kadıköy',  tax_number: 'DEMO-1111', phone_number: '0212 555 0101', company_location: 'İstanbul' },
    { full_name: 'Mehmet Kara',  company_name: 'Karadeniz Gıda Ltd.',  tax_office: 'Beşiktaş', tax_number: 'DEMO-2222', phone_number: '0312 555 0202', company_location: 'Ankara'   },
    { full_name: 'Hasan Çelik',  company_name: 'Anadolu İnşaat A.Ş.', tax_office: 'Konya',     tax_number: 'DEMO-3333', phone_number: '0332 555 0303', company_location: 'Konya'    },
    { full_name: 'Fatma Demir',  company_name: 'Ege Elektronik Ltd.',  tax_office: 'Bornova',   tax_number: 'DEMO-4444', phone_number: '0232 555 0404', company_location: 'İzmir'    },
  ];

  const ids = [];
  for (const c of customers) {
    const exists = await pool.query(
      `SELECT id FROM customers WHERE tax_number = $1 AND company_id = $2`,
      [c.tax_number, COMPANY_ID]
    );
    if (exists.rows[0]) {
      console.log(`  ${C.gray}Müşteri zaten var: ${c.company_name}${C.reset}`);
      ids.push(exists.rows[0].id);
      continue;
    }
    const r = await pool.query(
      `INSERT INTO customers (full_name, company_name, tax_office, tax_number, phone_number, company_location, company_id, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [c.full_name, c.company_name, c.tax_office, c.tax_number, c.phone_number, c.company_location, COMPANY_ID, userId]
    );
    ids.push(r.rows[0].id);
    console.log(`  ${C.green}✓${C.reset} Müşteri oluşturuldu: ${c.company_name}`);
  }
  return ids;
}

async function seedProducts() {
  const products = [
    { name: 'Laptop Pro 15',    sku: 'DEMO-LP001', price: 25000, stock_quantity: 3,   low_stock_threshold: 10, category: 'Bilgisayar'   },
    { name: 'Kablosuz Mouse',   sku: 'DEMO-MS001', price: 350,   stock_quantity: 45,  low_stock_threshold: 20, category: 'Aksesuar'     },
    { name: 'Mekanik Klavye',   sku: 'DEMO-KB001', price: 1200,  stock_quantity: 8,   low_stock_threshold: 15, category: 'Aksesuar'     },
    { name: '27" Monitör',      sku: 'DEMO-MN001', price: 8500,  stock_quantity: 0,   low_stock_threshold: 5,  category: 'Ekran'        },
    { name: 'USB-C Hub 7-in-1', sku: 'DEMO-UH001', price: 750,   stock_quantity: 120, low_stock_threshold: 30, category: 'Aksesuar'     },
    { name: 'Full HD Webcam',   sku: 'DEMO-WC001', price: 1800,  stock_quantity: 15,  low_stock_threshold: 10, category: 'Çevre Birimi' },
  ];

  const ids = [];
  for (const p of products) {
    const exists = await pool.query(`SELECT id FROM products WHERE sku = $1 AND company_id = $2`, [p.sku, COMPANY_ID]);
    if (exists.rows[0]) {
      await pool.query(`UPDATE products SET stock_quantity = $1 WHERE id = $2`, [p.stock_quantity, exists.rows[0].id]);
      console.log(`  ${C.gray}Ürün güncellendi: ${p.name} (stok=${p.stock_quantity})${C.reset}`);
      ids.push(exists.rows[0].id);
      continue;
    }
    const r = await pool.query(
      `INSERT INTO products (name, sku, price, stock_quantity, low_stock_threshold, category, company_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING id`,
      [p.name, p.sku, p.price, p.stock_quantity, p.low_stock_threshold, p.category, COMPANY_ID]
    );
    ids.push(r.rows[0].id);
    console.log(`  ${C.green}✓${C.reset} Ürün oluşturuldu: ${p.name}`);
  }
  return ids;
}

async function seedOrders(userId, customerIds, productIds) {
  const [yilmazId, karadenizId, anadoluId, egeId] = customerIds;
  const [laptopId, mouseId, klavyeId,, usbHubId, webcamId] = productIds;

  const orders = [
    { customer_id: yilmazId,    items: [{ product_id: laptopId, qty: 2, price: 25000 }, { product_id: mouseId, qty: 5, price: 350 }], status: 'completed' },
    { customer_id: yilmazId,    items: [{ product_id: klavyeId, qty: 3, price: 1200 }],                                                status: 'completed' },
    { customer_id: karadenizId, items: [{ product_id: usbHubId, qty: 10, price: 750 }],                                               status: 'processing' },
    { customer_id: anadoluId,   items: [{ product_id: webcamId, qty: 2, price: 1800 }],                                               status: 'pending'    },
    { customer_id: egeId,       items: [{ product_id: mouseId, qty: 20, price: 350 }],                                                status: 'completed'  },
    { customer_id: karadenizId, items: [{ product_id: laptopId, qty: 1, price: 25000 }],                                              status: 'cancelled'  },
  ];

  let created = 0;
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    const total = o.items.reduce((s, it) => s + it.qty * it.price, 0);
    const orderNumber = `DEMO-ORD-${String(i + 1).padStart(3, '0')}`;
    const orderR = await pool.query(
      `INSERT INTO orders (order_number, user_id, customer_id, total_amount, status, company_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [orderNumber, userId, o.customer_id, total, o.status, COMPANY_ID]
    );
    const orderId = orderR.rows[0].id;
    for (const item of o.items) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1,$2,$3,$4)`,
        [orderId, item.product_id, item.qty, item.price]
      ).catch(() => {});
    }
    created++;
  }
  console.log(`  ${C.green}✓${C.reset} ${created} sipariş oluşturuldu`);
}

async function seedCheques(userId, customerIds) {
  const [yilmazId, karadenizId, anadoluId, egeId] = customerIds;
  const today = new Date();
  const offset = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; };

  const cheques = [
    { customer_id: yilmazId,    serial: 'DEMO-CHK-001', amount: 50000, due_date: offset(-5),   status: 'paid',    bank: 'Ziraat Bankası', note: 'Tahsil edildi' },
    { customer_id: yilmazId,    serial: 'DEMO-CHK-002', amount: 35000, due_date: offset(15),   status: 'pending', bank: 'İş Bankası',     note: 'Bekliyor'      },
    { customer_id: karadenizId, serial: 'DEMO-CHK-003', amount: 22000, due_date: offset(-3),   status: 'paid',    bank: 'Garanti BBVA',   note: 'Ödendi'        },
    { customer_id: karadenizId, serial: 'DEMO-CHK-004', amount: 18000, due_date: offset(30),   status: 'pending', bank: 'Akbank',         note: 'Vade bekliyor' },
    { customer_id: anadoluId,   serial: 'DEMO-CHK-005', amount: 75000, due_date: offset(-95),  status: 'pending', bank: 'Halkbank',       note: '90+ gün gecikmiş' },
    { customer_id: anadoluId,   serial: 'DEMO-CHK-006', amount: 45000, due_date: offset(-55),  status: 'pending', bank: 'Vakıfbank',      note: '31-60 gün gecikmiş' },
    { customer_id: anadoluId,   serial: 'DEMO-CHK-007', amount: 30000, due_date: offset(-20),  status: 'pending', bank: 'Yapı Kredi',     note: '0-30 gün gecikmiş' },
    { customer_id: egeId,       serial: 'DEMO-CHK-008', amount: 12000, due_date: offset(45),   status: 'pending', bank: 'TEB',            note: 'Yeni müşteri çeki' },
  ];

  let created = 0;
  for (const ch of cheques) {
    const exists = await pool.query(
      `SELECT id FROM cheques WHERE check_serial_no = $1 AND company_id = $2`,
      [ch.serial, COMPANY_ID]
    );
    if (exists.rows[0]) {
      console.log(`  ${C.gray}Çek zaten var: ${ch.serial}${C.reset}`);
      continue;
    }
    // received_date her zaman due_date'ten ÖNCE olmalı (CHECK: due_date > received_date).
    // Vadesi geçmiş demo çeklerinde due_date geçmişte olduğundan, alındığı tarihi
    // vadesinden 30 gün öncesi olarak hesapla.
    const recvDate = (() => {
      const d = new Date(ch.due_date);
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    })();
    await pool.query(
      `INSERT INTO cheques (check_serial_no, check_issuer, customer_id, bank_name, due_date, amount, received_date, currency, status, company_id, notes, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'TRY',$8,$9,$10,$11)`,
      [ch.serial, 'Demo Kesideci', ch.customer_id, ch.bank, ch.due_date, ch.amount, recvDate, ch.status, COMPANY_ID, ch.note, userId]
    );
    created++;
  }
  console.log(`  ${C.green}✓${C.reset} ${created} çek oluşturuldu`);
}

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔═══════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  SUNUM SEED VERİSİ — company_id=${COMPANY_ID}         ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════╝${C.reset}\n`);

  try {
    console.log(`${C.bold}Kullanıcılar...${C.reset}`);
    const userId = await seedStaffUsers();
    console.log(`${C.yellow}Owner (admin) kullanıcı ID: ${userId}${C.reset}\n`);

    console.log(`${C.bold}Müşteriler...${C.reset}`);
    const customerIds = await seedCustomers(userId);

    console.log(`\n${C.bold}Ürünler...${C.reset}`);
    const productIds = await seedProducts();

    console.log(`\n${C.bold}Siparişler...${C.reset}`);
    await seedOrders(userId, customerIds, productIds);

    console.log(`\n${C.bold}Çekler...${C.reset}`);
    await seedCheques(userId, customerIds);

    console.log(`\n${C.bold}${C.green}✓ Sunum verisi hazır!${C.reset}`);
    console.log(`\n${C.cyan}Chatbot demo komutları:${C.reset}`);
    console.log(`  ${C.yellow}→${C.reset} "Anadolu İnşaat müşterisinin detaylı durumunu göster"`);
    console.log(`  ${C.yellow}→${C.reset} "Vadesi geçmiş çeklerimi yaş gruplarına göre raporla"`);
    console.log(`  ${C.yellow}→${C.reset} "Ödeme riski yüksek müşterilerimi analiz et"`);
    console.log(`  ${C.yellow}→${C.reset} "Hangi ürünler için sipariş vermeliyim?"`);
    console.log(`  ${C.yellow}→${C.reset} "Bu ayı geçen ayla karşılaştır"\n`);
  } catch (err) {
    console.error(`${C.red}Hata: ${err.message}${C.reset}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
