const pool = require('../config/database');

class Product {
  /**
   * Create a new product
   */
  static async create({ name, description, price, stock, category, sku, low_stock_threshold = 10 }) {
    const query = `
      INSERT INTO products (name, description, price, stock_quantity, category, sku, low_stock_threshold)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [name, description, price, stock, category, sku, low_stock_threshold];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find product by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM products WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find product by SKU
   */
  static async findBySku(sku) {
    const query = 'SELECT * FROM products WHERE sku = $1';
    const result = await pool.query(query, [sku]);
    return result.rows[0];
  }

  /**
   * Find product by name
   */
  static async findByName(name) {
    const query = 'SELECT * FROM products WHERE name = $1';
    const result = await pool.query(query, [name]);
    return result.rows[0];
  }

  /**
   * Get all products with filters
   */
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM products WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.category) {
      query += ` AND category = $${paramCount}`;
      values.push(filters.category);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    if (filters.minPrice) {
      query += ` AND price >= $${paramCount}`;
      values.push(filters.minPrice);
      paramCount++;
    }

    if (filters.maxPrice) {
      query += ` AND price <= $${paramCount}`;
      values.push(filters.maxPrice);
      paramCount++;
    }

    if (filters.lowStock) {
      query += ` AND stock_quantity < $${paramCount}`;
      values.push(filters.lowStock);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
      paramCount++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Update product
   */
  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['name', 'description', 'price', 'stock_quantity', 'category', 'sku', 'low_stock_threshold'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramCount}`);
        values.push(data[field]);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `
      UPDATE products
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update stock quantity
   */
  static async updateStock(id, quantity, operation = 'set') {
    let query;

    if (operation === 'increment') {
      query = `
        UPDATE products
        SET stock_quantity = stock_quantity + $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
    } else if (operation === 'decrement') {
      query = `
        UPDATE products
        SET stock_quantity = stock_quantity - $1, updated_at = NOW()
        WHERE id = $2 AND stock_quantity >= $1
        RETURNING *
      `;
    } else {
      query = `
        UPDATE products
        SET stock_quantity = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
    }

    const result = await pool.query(query, [quantity, id]);
    return result.rows[0];
  }

  /**
   * Delete product
   */
  static async delete(id) {
    const query = 'DELETE FROM products WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get low stock products
   */
  static async getLowStock(threshold = 10) {
    const query = 'SELECT * FROM products WHERE stock_quantity < $1 ORDER BY stock_quantity ASC';
    const result = await pool.query(query, [threshold]);
    return result.rows;
  }

  /**
   * Get products by category
   */
  static async getByCategory(category) {
    const query = 'SELECT * FROM products WHERE category = $1 ORDER BY name ASC';
    const result = await pool.query(query, [category]);
    return result.rows;
  }

  /**
   * Count total products
   */
  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) FROM products WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.category) {
      query += ` AND category = $${paramCount}`;
      values.push(filters.category);
      paramCount++;
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get all categories
   */
  static async getCategories() {
    const query = 'SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category';
    const result = await pool.query(query);
    return result.rows.map(row => row.category);
  }
}

module.exports = Product;
