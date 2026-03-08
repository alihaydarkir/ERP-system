const pool = require('../src/config/database');

async function seedData() {
  try {
    console.log('🌱 Starting seed process...');

    // Önce bağımlılıkları sil
    await pool.query('DELETE FROM order_items');
    console.log('✅ Sipariş kalemleri silindi');
    
    await pool.query('DELETE FROM warehouse_stock');
    console.log('✅ Depo stokları silindi');
    
    // Tüm ürünleri sil
    await pool.query('DELETE FROM products');
    console.log('✅ Ürünler silindi');

    // Tedarikçileri ve depoları getir
    const { rows: suppliers } = await pool.query('SELECT id, supplier_name FROM suppliers LIMIT 5');
    const { rows: warehouses } = await pool.query('SELECT id, warehouse_code FROM warehouses LIMIT 5');

    if (suppliers.length === 0 || warehouses.length === 0) {
      console.log('❌ Önce tedarikçi ve depo eklemeniz gerekiyor!');
      process.exit(1);
    }

    console.log(`📦 ${suppliers.length} tedarikçi bulundu`);
    console.log(`🏢 ${warehouses.length} depo bulundu`);

    // Örnek ürünler
    const products = [
      {
        name: 'iPhone 15 Pro',
        description: '256GB Titanyum Gri',
        price: 52999.99,
        stock: 45,
        category: 'Elektronik',
        sku: 'ELEC-IP15P-256',
        low_stock_threshold: 10
      },
      {
        name: 'Samsung Galaxy S24',
        description: '512GB Phantom Black',
        price: 44999.99,
        stock: 32,
        category: 'Elektronik',
        sku: 'ELEC-SGS24-512',
        low_stock_threshold: 10
      },
      {
        name: 'MacBook Pro 14"',
        description: 'M3 Pro, 18GB RAM, 512GB SSD',
        price: 85999.99,
        stock: 15,
        category: 'Bilgisayar',
        sku: 'COMP-MBP14-M3',
        low_stock_threshold: 5
      },
      {
        name: 'Dell XPS 15',
        description: 'Intel i7, 32GB RAM, 1TB SSD',
        price: 67999.99,
        stock: 22,
        category: 'Bilgisayar',
        sku: 'COMP-DXPS15-I7',
        low_stock_threshold: 8
      },
      {
        name: 'Sony WH-1000XM5',
        description: 'Kablosuz Kulaklık, Gürültü Önleme',
        price: 12999.99,
        stock: 67,
        category: 'Aksesuar',
        sku: 'ACC-SONY-WH1000',
        low_stock_threshold: 15
      },
      {
        name: 'Logitech MX Master 3S',
        description: 'Kablosuz Mouse',
        price: 3499.99,
        stock: 120,
        category: 'Aksesuar',
        sku: 'ACC-LOGI-MXM3S',
        low_stock_threshold: 20
      },
      {
        name: 'LG 27" 4K Monitor',
        description: 'IPS Panel, HDR10',
        price: 18999.99,
        stock: 28,
        category: 'Monitör',
        sku: 'MON-LG27-4K',
        low_stock_threshold: 10
      },
      {
        name: 'Samsung 55" QLED TV',
        description: '4K Smart TV',
        price: 34999.99,
        stock: 18,
        category: 'TV',
        sku: 'TV-SAM55-QLED',
        low_stock_threshold: 8
      },
      {
        name: 'Dyson V15 Detect',
        description: 'Kablosuz Süpürge',
        price: 24999.99,
        stock: 12,
        category: 'Beyaz Eşya',
        sku: 'HOME-DYS-V15',
        low_stock_threshold: 5
      },
      {
        name: 'Xiaomi Robot Süpürge',
        description: 'Akıllı Navigasyon Sistemi',
        price: 8999.99,
        stock: 35,
        category: 'Beyaz Eşya',
        sku: 'HOME-XIA-ROBOT',
        low_stock_threshold: 10
      }
    ];

    // Ürünleri ekle
    for (const product of products) {
      // Rastgele tedarikçi ve depo seç
      const randomSupplier = suppliers[Math.floor(Math.random() * suppliers.length)];
      const randomWarehouse = warehouses[Math.floor(Math.random() * warehouses.length)];

      await pool.query(
        `INSERT INTO products (name, description, price, stock_quantity, category, sku, low_stock_threshold, supplier_id, warehouse_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          product.name,
          product.description,
          product.price,
          product.stock,
          product.category,
          product.sku,
          product.low_stock_threshold,
          randomSupplier.id,
          randomWarehouse.id
        ]
      );
      console.log(`✅ ${product.name} eklendi (${randomSupplier.supplier_name}, ${randomWarehouse.warehouse_code})`);
    }

    console.log('🎉 Seed işlemi tamamlandı!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed hatası:', error);
    process.exit(1);
  }
}

seedData();
