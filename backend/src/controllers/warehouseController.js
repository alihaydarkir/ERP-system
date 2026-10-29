const Warehouse = require('../models/Warehouse');
const pool = require('../config/database');

// Çok kiracılılık: depo (ve stok işlemlerinde ürün) bu şirkete ait değilse 404 döner
const ownWarehouse = async (req, res) => {
  const found = await pool.query(
    'SELECT 1 FROM warehouses WHERE id = $1 AND company_id = $2',
    [req.params.id, req.user.company_id]
  );
  if (found.rows.length === 0) {
    res.status(404).json({ success: false, message: 'Depo bulunamadı' });
    return false;
  }
  return true;
};

const ownProduct = async (req, res, productId) => {
  const found = await pool.query(
    'SELECT 1 FROM products WHERE id = $1 AND company_id = $2',
    [productId, req.user.company_id]
  );
  if (found.rows.length === 0) {
    res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
    return false;
  }
  return true;
};

// Simple activity logger
const logActivity = async (userId, action, entity, entityId, details) => {
  return { userId, action, entity, entityId, details };
};

// Get all warehouses
exports.getAllWarehouses = async (req, res) => {
  try {
    const { company_id } = req.user; // MULTI-TENANCY
    const filters = { ...req.query, company_id }; // MULTI-TENANCY
    const warehouses = await Warehouse.findAll(filters);
    res.json({ success: true, data: warehouses });
  } catch (error) {
    console.error('Get warehouses error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get warehouse by ID
exports.getWarehouseById = async (req, res) => {
  try {
    if (!(await ownWarehouse(req, res))) return;
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Depo bulunamadı' });
    }
    res.json({ success: true, data: warehouse });
  } catch (error) {
    console.error('Get warehouse error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new warehouse
exports.createWarehouse = async (req, res) => {
  try {
    const warehouseData = { ...req.body, company_id: req.user.company_id }; // MULTI-TENANCY
    const warehouse = await Warehouse.create(warehouseData);
    
    await logActivity(
      req.user.id,
      'warehouse_created',
      'warehouses',
      warehouse.id,
      { warehouse_name: warehouse.warehouse_name }
    );

    res.status(201).json({ success: true, data: warehouse });
  } catch (error) {
    console.error('Create warehouse error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Bu depo kodu zaten kullanılıyor' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update warehouse
exports.updateWarehouse = async (req, res) => {
  try {
    if (!(await ownWarehouse(req, res))) return;
    const warehouse = await Warehouse.update(req.params.id, req.body);
    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Depo bulunamadı' });
    }

    await logActivity(
      req.user.id,
      'warehouse_updated',
      'warehouses',
      warehouse.id,
      { warehouse_name: warehouse.warehouse_name }
    );

    res.json({ success: true, data: warehouse });
  } catch (error) {
    console.error('Update warehouse error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete warehouse
exports.deleteWarehouse = async (req, res) => {
  try {
    if (!(await ownWarehouse(req, res))) return;
    await Warehouse.delete(req.params.id);

    await logActivity(
      req.user.id,
      'warehouse_deleted',
      'warehouses',
      req.params.id,
      {}
    );

    res.json({ success: true, message: 'Depo silindi' });
  } catch (error) {
    console.error('Delete warehouse error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get warehouse stock
exports.getWarehouseStock = async (req, res) => {
  try {
    if (!(await ownWarehouse(req, res))) return;
    const stock = await Warehouse.getStock(req.params.id);
    res.json({ success: true, data: stock });
  } catch (error) {
    console.error('Get warehouse stock error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update warehouse stock
exports.updateWarehouseStock = async (req, res) => {
  try {
    if (!(await ownWarehouse(req, res))) return;
    const { product_id, quantity } = req.body;
    if (!(await ownProduct(req, res, product_id))) return;
    const stock = await Warehouse.updateStock(req.params.id, product_id, quantity);
    
    await logActivity(
      req.user.id,
      'warehouse_stock_updated',
      'warehouse_stock',
      stock.id,
      { warehouse_id: req.params.id, product_id, quantity }
    );

    res.json({ success: true, data: stock });
  } catch (error) {
    console.error('Update warehouse stock error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Set warehouse stock (absolute value)
exports.setWarehouseStock = async (req, res) => {
  try {
    if (!(await ownWarehouse(req, res))) return;
    const { product_id, quantity } = req.body;
    if (!(await ownProduct(req, res, product_id))) return;
    const stock = await Warehouse.setStock(req.params.id, product_id, quantity);
    
    await logActivity(
      req.user.id,
      'warehouse_stock_set',
      'warehouse_stock',
      stock.id,
      { warehouse_id: req.params.id, product_id, quantity }
    );

    res.json({ success: true, data: stock });
  } catch (error) {
    console.error('Set warehouse stock error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
