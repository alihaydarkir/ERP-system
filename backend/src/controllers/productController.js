const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const ActivityLogService = require('../services/activityLogService');
const cacheService = require('../services/cacheService');
const { formatProduct, formatProducts, formatSuccess, formatError, formatPaginated } = require('../utils/formatters');
const { getClientIP, calculateOffset } = require('../utils/helpers');

/**
 * Get all products
 */
const getAllProducts = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, lowStock, page = 1, limit = 20 } = req.query;
    const { company_id } = req.user; // MULTI-TENANCY

    // Build filters
    const filters = {
      company_id, // MULTI-TENANCY: Only show products from user's company
      category,
      search,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      lowStock: lowStock ? parseInt(lowStock) : undefined,
      limit: parseInt(limit),
      offset: calculateOffset(parseInt(page), parseInt(limit))
    };

    // Get products
    const products = await Product.findAll(filters);
    const total = await Product.count({ category, company_id });

    const result = formatPaginated(
      formatProducts(products),
      total,
      parseInt(page),
      parseInt(limit)
    );

    res.json(result);

  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json(formatError('Failed to fetch products'));
  }
};

/**
 * Get product by ID
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user; // MULTI-TENANCY

    // Try to get from cache
    const cached = await cacheService.getCachedProduct(id);
    if (cached.success && cached.data && cached.data.company_id === company_id) {
      return res.json(formatSuccess(cached.data));
    }

    const product = await Product.findById(id, company_id); // MULTI-TENANCY

    if (!product) {
      return res.status(404).json(formatError('Product not found'));
    }

    const formatted = formatProduct(product);

    // Cache product
    await cacheService.cacheProduct(id, formatted);

    res.json(formatSuccess(formatted));

  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json(formatError('Failed to fetch product'));
  }
};

/**
 * Create new product
 */
const createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category, sku, low_stock_threshold, supplier_id } = req.body;
    const { company_id } = req.user; // MULTI-TENANCY

    // Check if SKU already exists IN THIS COMPANY
    const existing = await Product.findBySku(sku, company_id);
    if (existing) {
      return res.status(400).json(formatError('SKU already exists'));
    }

    const product = await Product.create({
      name,
      description,
      price,
      stock,
      category,
      sku,
      low_stock_threshold: low_stock_threshold || 10,
      supplier_id: supplier_id || null,
      company_id // MULTI-TENANCY
    });

    // Log activity
    await AuditLog.create({
      user_id: req.user.userId,
      action: 'CREATE',
      entity_type: 'product',
      entity_id: product.id,
      changes: { name, price, stock, category, sku, supplier_id },
      ip_address: getClientIP(req),
      company_id // MULTI-TENANCY
    });

    // Log to activity logs
    await ActivityLogService.log(
      req.user.userId,
      'create_product',
      'products',
      { product_id: product.id, name, price, stock, category, sku, supplier_id },
      req
    );

    // Invalidate cache
    await cacheService.invalidateProductCache();

    console.log(`Product created: ${name} (${product.id}) by user ${req.user.userId}`);

    res.status(201).json(formatSuccess(formatProduct(product), 'Product created'));

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json(formatError('Failed to create product'));
  }
};

/**
 * Update product
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user; // MULTI-TENANCY
    const updates = { ...req.body };

    // First check if product belongs to this company
    const existingProduct = await Product.findById(id, company_id);
    if (!existingProduct) {
      return res.status(404).json(formatError('Product not found'));
    }

    // Map 'stock' to 'stock_quantity' for model compatibility
    if (updates.stock !== undefined) {
      updates.stock_quantity = updates.stock;
      delete updates.stock;
    }

    const product = await Product.update(id, updates);

    if (!product) {
      return res.status(404).json(formatError('Product not found'));
    }

    // Log activity
    await AuditLog.create({
      user_id: req.user.userId,
      action: 'UPDATE',
      entity_type: 'product',
      entity_id: id,
      changes: updates,
      ip_address: getClientIP(req),
      company_id // MULTI-TENANCY
    });

    // Log to activity logs
    await ActivityLogService.log(
      req.user.userId,
      'update_product',
      'products',
      { product_id: id, name: product.name, updates },
      req
    );

    // Invalidate cache
    await cacheService.invalidateProductCache(id);

    console.log(`Product updated: ${product.name} (${id}) by user ${req.user.userId}`);

    res.json(formatSuccess(formatProduct(product), 'Product updated'));

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json(formatError('Failed to update product'));
  }
};

/**
 * Delete product
 */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user; // MULTI-TENANCY

    const product = await Product.findById(id, company_id); // MULTI-TENANCY
    if (!product) {
      return res.status(404).json(formatError('Product not found'));
    }

    try {
      await Product.delete(id);
    } catch (dbError) {
      // FK constraint: product is referenced (e.g. order_items)
      if (dbError?.code === '23503') {
        const archived = await Product.archive(id);

        await AuditLog.create({
          user_id: req.user.userId,
          action: 'ARCHIVE',
          entity_type: 'product',
          entity_id: id,
          changes: { archived_product: product.name, reason: 'referenced_in_transactions' },
          ip_address: getClientIP(req),
          company_id
        });

        await ActivityLogService.log(
          req.user.userId,
          'archive_product',
          'products',
          { product_id: id, name: product.name, reason: 'referenced_in_transactions' },
          req
        );

        await cacheService.invalidateProductCache(id);

        return res.json(formatSuccess(
          archived ? formatProduct(archived) : null,
          'Ürün geçmiş siparişlerde kullanıldığı için silinmedi, pasife alındı (arşivlendi).'
        ));
      }

      throw dbError;
    }

    // Log activity
    await AuditLog.create({
      user_id: req.user.userId,
      action: 'DELETE',
      entity_type: 'product',
      entity_id: id,
      changes: { deleted_product: product.name },
      ip_address: getClientIP(req),
      company_id // MULTI-TENANCY
    });

    // Log to activity logs
    await ActivityLogService.log(
      req.user.userId,
      'delete_product',
      'products',
      { product_id: id, name: product.name },
      req
    );

    // Invalidate cache
    await cacheService.invalidateProductCache(id);

    console.log(`Product deleted: ${product.name} (${id}) by user ${req.user.userId}`);

    res.json(formatSuccess(null, 'Product deleted'));

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json(formatError('Failed to delete product'));
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};

