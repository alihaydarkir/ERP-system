const { pool } = require('../src/config/database');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const { generateSKU } = require('../src/utils/helpers');

/**
 * Seed database with sample data
 */
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // 1. Create sample users
    console.log('Creating users...');
    const users = await createUsers();
    console.log(`✅ Created ${users.length} users\n`);

    // 2. Create sample products
    console.log('Creating products...');
    const products = await createProducts();
    console.log(`✅ Created ${products.length} products\n`);

    // 3. Create sample orders
    console.log('Creating orders...');
    const orders = await createOrders(users, products);
    console.log(`✅ Created ${orders.length} orders\n`);

    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

/**
 * Create sample users
 */
async function createUsers() {
  const users = [];

  const sampleUsers = [
    { username: 'admin', email: 'admin@erp.local', password: 'admin123', role: 'admin', full_name: 'Admin User' },
    { username: 'manager', email: 'manager@erp.local', password: 'manager123', role: 'manager', full_name: 'Manager User' },
    { username: 'user', email: 'user@erp.local', password: 'user123', role: 'user', full_name: 'Regular User' }
  ];

  for (const userData of sampleUsers) {
    try {
      // Check if user already exists
      const existingUser = await User.findByUsername(userData.username);

      if (existingUser) {
        console.log(`  ⏭️  SKIP: User '${userData.username}' already exists`);
        users.push(existingUser);
        continue;
      }

      // Create new user
      const user = await User.create(userData);
      console.log(`  ✅ CREATED: User '${userData.username}'`);
      users.push(user);

    } catch (error) {
      console.error(`  ❌ ERROR: Failed to create user '${userData.username}': ${error.message}`);
    }
  }

  return users;
}

/**
 * Create sample products
 */
async function createProducts() {
  const products = [];

  const sampleProducts = [
    // Electronics
    { name: 'Laptop Dell XPS 15', description: 'High-performance laptop for professionals', price: 1299.99, stock: 25, category: 'Electronics' },
    { name: 'iPhone 15 Pro', description: 'Latest flagship smartphone', price: 999.99, stock: 50, category: 'Electronics' },
    { name: 'Samsung 4K Monitor', description: '27-inch 4K UHD monitor', price: 349.99, stock: 15, category: 'Electronics' },
    { name: 'Wireless Mouse', description: 'Ergonomic wireless mouse', price: 29.99, stock: 100, category: 'Electronics' },
    { name: 'Mechanical Keyboard', description: 'RGB mechanical gaming keyboard', price: 89.99, stock: 75, category: 'Electronics' },

    // Office Supplies
    { name: 'Office Chair', description: 'Ergonomic mesh office chair', price: 199.99, stock: 30, category: 'Office Supplies' },
    { name: 'Standing Desk', description: 'Height-adjustable standing desk', price: 399.99, stock: 20, category: 'Office Supplies' },
    { name: 'Notebook Set', description: 'Pack of 5 professional notebooks', price: 19.99, stock: 200, category: 'Office Supplies' },
    { name: 'Pen Set', description: 'Premium ballpoint pen set', price: 24.99, stock: 150, category: 'Office Supplies' },
    { name: 'Desk Organizer', description: 'Wooden desk organizer', price: 34.99, stock: 80, category: 'Office Supplies' },

    // Furniture
    { name: 'Conference Table', description: '10-person conference table', price: 899.99, stock: 8, category: 'Furniture' },
    { name: 'Filing Cabinet', description: '4-drawer metal filing cabinet', price: 149.99, stock: 25, category: 'Furniture' },
    { name: 'Bookshelf', description: '6-tier wooden bookshelf', price: 129.99, stock: 15, category: 'Furniture' },
    { name: 'Desk Lamp', description: 'LED desk lamp with USB charging', price: 39.99, stock: 60, category: 'Furniture' },
    { name: 'Whiteboard', description: 'Large magnetic whiteboard', price: 89.99, stock: 20, category: 'Furniture' },

    // Software
    { name: 'MS Office 365', description: '1-year subscription', price: 99.99, stock: 999, category: 'Software' },
    { name: 'Adobe Creative Cloud', description: '1-year subscription', price: 599.99, stock: 999, category: 'Software' },
    { name: 'Antivirus Premium', description: '1-year protection for 5 devices', price: 49.99, stock: 999, category: 'Software' },

    // Accessories
    { name: 'USB-C Hub', description: '7-in-1 USB-C hub adapter', price: 45.99, stock: 90, category: 'Accessories' },
    { name: 'Webcam HD', description: '1080p HD webcam with microphone', price: 69.99, stock: 40, category: 'Accessories' },
    { name: 'Laptop Stand', description: 'Aluminum laptop stand', price: 39.99, stock: 70, category: 'Accessories' },
    { name: 'Cable Organizer', description: 'Cable management kit', price: 14.99, stock: 120, category: 'Accessories' },
    { name: 'Phone Stand', description: 'Adjustable phone stand', price: 19.99, stock: 85, category: 'Accessories' },

    // Low stock items (for testing alerts)
    { name: 'Printer Toner', description: 'Black toner cartridge', price: 79.99, stock: 5, category: 'Office Supplies' },
    { name: 'HDMI Cable 2m', description: 'High-speed HDMI cable', price: 12.99, stock: 3, category: 'Accessories' }
  ];

  for (const item of sampleProducts) {
    try {
      // Check if product already exists by name
      const existingProduct = await Product.findByName(item.name);

      if (existingProduct) {
        console.log(`  ⏭️  SKIP: Product '${item.name}' already exists`);
        products.push(existingProduct);
        continue;
      }

      // Create new product
      const product = await Product.create({
        ...item,
        sku: generateSKU(item.category.substring(0, 3).toUpperCase())
      });
      console.log(`  ✅ CREATED: Product '${item.name}'`);
      products.push(product);

    } catch (error) {
      console.error(`  ❌ ERROR: Failed to create product '${item.name}': ${error.message}`);
    }
  }

  return products;
}

/**
 * Create sample orders (optional)
 */
async function createOrders(users, products) {
  const Order = require('../src/models/Order');
  const orders = [];

  // Sample order 1: Admin creates order for 3 items
  if (users.length > 0 && products.length >= 3) {
    try {
      const orderItems = [
        { product_id: products[0].id, quantity: 2, price: products[0].price },
        { product_id: products[1].id, quantity: 1, price: products[1].price },
        { product_id: products[2].id, quantity: 3, price: products[2].price }
      ];

      const totalAmount = orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

      const order1 = await Order.create({
        user_id: users[0].id,
        items: orderItems,
        total_amount: totalAmount,
        status: 'completed'
      });
      orders.push(order1);
    } catch (error) {
      console.error('Error creating order 1:', error.message);
    }
  }

  // Sample order 2: Manager creates pending order
  if (users.length > 1 && products.length >= 5) {
    try {
      const orderItems = [
        { product_id: products[3].id, quantity: 5, price: products[3].price },
        { product_id: products[4].id, quantity: 2, price: products[4].price }
      ];

      const totalAmount = orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

      const order2 = await Order.create({
        user_id: users[1].id,
        items: orderItems,
        total_amount: totalAmount,
        status: 'pending'
      });
      orders.push(order2);
    } catch (error) {
      console.error('Error creating order 2:', error.message);
    }
  }

  return orders;
}

// Run seeding
seedDatabase();
