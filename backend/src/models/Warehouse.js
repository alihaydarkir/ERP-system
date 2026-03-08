const pool = require('../config/database');

class Warehouse {
  static async findAll(filters = {}) {
    const { limit = 50, offset = 0, is_active, search, company_id } = filters;
    
    let query = `
      SELECT w.*,
        (SELECT COUNT(*) FROM warehouse_stock ws WHERE ws.warehouse_id = w.id) as product_count
      FROM warehouses w
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // MULTI-TENANCY
    if (company_id) {
      query += ` AND w.company_id = $${paramCount}`;
      params.push(company_id);
      paramCount++;
    }

    if (is_active !== undefined) {
      query += ` AND w.is_active = $${paramCount}`;
      params.push(is_active === 'true' || is_active === true);
      paramCount++;
    }

    if (search) {
      query += ` AND (w.warehouse_name ILIKE $${paramCount} OR w.warehouse_code ILIKE $${paramCount} OR w.location ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY w.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    return rows;
  }

  static async findById(id) {
    const { rows } = await pool.query(
      `SELECT w.*,
        (SELECT COUNT(*) FROM warehouse_stock ws WHERE ws.warehouse_id = w.id) as product_count,
        (SELECT SUM(ws.quantity) FROM warehouse_stock ws WHERE ws.warehouse_id = w.id) as total_items
      FROM warehouses w
      WHERE w.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async create(warehouseData) {
    const {
      warehouse_name,
      warehouse_code,
      location,
      address,
      city,
      country = 'Türkiye',
      manager_name,
      phone,
      email,
      capacity,
      notes,
      is_active = true,
      company_id
    } = warehouseData;

    const { rows } = await pool.query(
      `INSERT INTO warehouses (
        warehouse_name, warehouse_code, location, address, city, country,
        manager_name, phone, email, capacity, notes, is_active, company_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [warehouse_name, warehouse_code, location, address, city, country,
       manager_name, phone, email, capacity, notes, is_active, company_id]
    );
    return rows[0];
  }

  static async update(id, warehouseData) {
    const {
      warehouse_name,
      warehouse_code,
      location,
      address,
      city,
      country,
      manager_name,
      phone,
      email,
      capacity,
      notes,
      is_active
    } = warehouseData;

    const { rows } = await pool.query(
      `UPDATE warehouses SET
        warehouse_name = COALESCE($1, warehouse_name),
        warehouse_code = COALESCE($2, warehouse_code),
        location = COALESCE($3, location),
        address = COALESCE($4, address),
        city = COALESCE($5, city),
        country = COALESCE($6, country),
        manager_name = COALESCE($7, manager_name),
        phone = COALESCE($8, phone),
        email = COALESCE($9, email),
        capacity = COALESCE($10, capacity),
        notes = COALESCE($11, notes),
        is_active = COALESCE($12, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *`,
      [warehouse_name, warehouse_code, location, address, city, country,
       manager_name, phone, email, capacity, notes, is_active, id]
    );
    return rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM warehouses WHERE id = $1', [id]);
    return { success: true };
  }

  static async getStock(warehouseId) {
    const { rows } = await pool.query(
      `SELECT ws.*, p.name as product_name, p.sku, p.category
      FROM warehouse_stock ws
      JOIN products p ON ws.product_id = p.id
      WHERE ws.warehouse_id = $1
      ORDER BY p.name`,
      [warehouseId]
    );
    return rows;
  }

  static async updateStock(warehouseId, productId, quantity) {
    const { rows } = await pool.query(
      `INSERT INTO warehouse_stock (warehouse_id, product_id, quantity, last_stock_update)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (warehouse_id, product_id)
      DO UPDATE SET
        quantity = warehouse_stock.quantity + $3,
        last_stock_update = CURRENT_TIMESTAMP
      RETURNING *`,
      [warehouseId, productId, quantity]
    );
    return rows[0];
  }

  static async setStock(warehouseId, productId, quantity) {
    const { rows } = await pool.query(
      `INSERT INTO warehouse_stock (warehouse_id, product_id, quantity, last_stock_update)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (warehouse_id, product_id)
      DO UPDATE SET
        quantity = $3,
        last_stock_update = CURRENT_TIMESTAMP
      RETURNING *`,
      [warehouseId, productId, quantity]
    );
    return rows[0];
  }
}

module.exports = Warehouse;
