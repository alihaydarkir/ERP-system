const pool = require('../config/database');

class Product {
  /**
   * Create a new product
   */
  static async create({ name, description, price, stock, category, sku, low_stock_threshold = 10, supplier_id = null, company_id }) {
    const query = `
      INSERT INTO products (name, description, price, stock_quantity, category, sku, low_stock_threshold, supplier_id, company_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [name, description, price, stock, category, sku, low_stock_threshold, supplier_id, company_id];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find product by ID
   */
  static async findById(id, company_id = null) {
    let query = 'SELECT * FROM products WHERE id = $1';
    const values = [id];
    
    if (company_id) {
      query += ' AND company_id = $2';
      values.push(company_id);
    }
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find product by SKU
   */
  static async findBySku(sku, company_id = null) {
    let query = 'SELECT * FROM products WHERE sku = $1';
    const values = [sku];
    
    if (company_id) {
      query += ' AND company_id = $2';
      values.push(company_id);
    }
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find product by name
   */
  static async findByName(name, company_id = null) {
    let query = 'SELECT * FROM products WHERE name = $1';
    const values = [name];
    
    if (company_id) {
      query += ' AND company_id = $2';
      values.push(company_id);
    }
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all products with filters
   */
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM products WHERE 1=1';
    const values = [];
    let paramCount = 1;

    // MULTI-TENANCY: Filter by company_id
    if (filters.company_id) {
      query += ` AND company_id = $${paramCount}`;
      values.push(filters.company_id);
      paramCount++;
    }

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

    if (!filters.includeInactive) {
      query += ' AND is_active = true';
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

    const allowedFields = ['name', 'description', 'price', 'stock_quantity', 'category', 'sku', 'low_stock_threshold', 'supplier_id', 'is_active'];

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
   * Soft archive product (keep history references intact)
   */
  static async archive(id) {
    const query = `
      UPDATE products
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get low stock products
   */
  static async getLowStock(threshold = 10, company_id = null) {
    let query = 'SELECT * FROM products WHERE stock_quantity < $1';
    const values = [threshold];
    
    if (company_id) {
      query += ' AND company_id = $2';
      values.push(company_id);
    }
    
    query += ' ORDER BY stock_quantity ASC';
    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Get products by category
   */
  static async getByCategory(category, company_id = null) {
    let query = 'SELECT * FROM products WHERE category = $1';
    const values = [category];
    
    if (company_id) {
      query += ' AND company_id = $2';
      values.push(company_id);
    }
    
    query += ' ORDER BY name ASC';
    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Count total products
   */
  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) FROM products WHERE 1=1';
    const values = [];
    let paramCount = 1;

    // MULTI-TENANCY: Filter by company_id
    if (filters.company_id) {
      query += ` AND company_id = $${paramCount}`;
      values.push(filters.company_id);
      paramCount++;
    }

    if (filters.category) {
      query += ` AND category = $${paramCount}`;
      values.push(filters.category);
      paramCount++;
    }

    if (!filters.includeInactive) {
      query += ' AND is_active = true';
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get all categories
   */
  static async getCategories(company_id = null) {
    let query = 'SELECT DISTINCT category FROM products WHERE category IS NOT NULL';
    const values = [];
    
    if (company_id) {
      query += ' AND company_id = $1';
      values.push(company_id);
    }
    
    query += ' ORDER BY category';
    const result = await pool.query(query, values);
    return result.rows.map(row => row.category);
  }
}

module.exports = Product;
