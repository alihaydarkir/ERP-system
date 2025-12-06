const pool = require('../config/database');

class Order {
  /**
   * Generate unique order number
   */
  static generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Create a new order
   */
  static async create({ user_id, customer_id, items, total_amount, status = 'pending' }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Generate unique order number
      const orderNumber = this.generateOrderNumber();

      // Create order
      const orderQuery = `
        INSERT INTO orders (user_id, customer_id, order_number, total_amount, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const orderResult = await client.query(orderQuery, [user_id, customer_id, orderNumber, total_amount, status]);
      const order = orderResult.rows[0];

      // Create order items
      const itemsQuery = `
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES ($1, $2, $3, $4)
      `;

      for (const item of items) {
        await client.query(itemsQuery, [
          order.id,
          item.product_id,
          item.quantity,
          item.price
        ]);

        // Update product stock
        const stockQuery = `
          UPDATE products
          SET stock_quantity = stock_quantity - $1
          WHERE id = $2 AND stock_quantity >= $1
        `;
        const stockResult = await client.query(stockQuery, [item.quantity, item.product_id]);

        if (stockResult.rowCount === 0) {
          throw new Error(`Insufficient stock for product ID ${item.product_id}`);
        }
      }

      await client.query('COMMIT');

      // Fetch complete order with items
      return await this.findById(order.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find order by ID with items
   */
  static async findById(id) {
    const orderQuery = `
      SELECT
        o.*,
        u.full_name as user_name,
        u.email as user_email,
        c.id as customer_id,
        c.full_name as customer_name,
        c.company_name as customer_company,
        c.tax_number as customer_tax_number,
        c.phone_number as customer_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `;
    const orderResult = await pool.query(orderQuery, [id]);

    if (orderResult.rows.length === 0) {
      return null;
    }

    const order = orderResult.rows[0];

    // Get order items with product details
    const itemsQuery = `
      SELECT oi.*, p.name, p.sku
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `;
    const itemsResult = await pool.query(itemsQuery, [id]);

    order.items = itemsResult.rows;
    return order;
  }

  /**
   * Get all orders with filters (Optimized - no N+1 query problem)
   */
  static async findAll(filters = {}) {
    let query = `
      SELECT
        o.*,
        u.full_name as user_name,
        u.email as user_email,
        c.full_name as customer_name,
        c.company_name as customer_company,
        c.tax_number as customer_tax_number,
        c.phone_number as customer_phone,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'quantity', oi.quantity,
              'price', oi.price,
              'name', p.name,
              'sku', p.sku
            ) ORDER BY oi.id
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) as items
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (filters.user_id) {
      query += ` AND o.user_id = $${paramCount}`;
      values.push(filters.user_id);
      paramCount++;
    }

    if (filters.status) {
      query += ` AND o.status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    if (filters.start_date) {
      query += ` AND o.created_at >= $${paramCount}`;
      values.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND o.created_at <= $${paramCount}`;
      values.push(filters.end_date);
      paramCount++;
    }

    query += ' GROUP BY o.id, u.full_name, u.email, c.full_name, c.company_name, c.tax_number, c.phone_number ORDER BY o.created_at DESC';

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

    // Parse JSON items (PostgreSQL returns them as JSON strings)
    return result.rows.map(order => ({
      ...order,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    }));
  }

  /**
   * Update order status
   */
  static async updateStatus(id, status) {
    // Set completed_at if status is completed or delivered
    const isCompletedStatus = ['completed', 'delivered'].includes(status);

    const query = isCompletedStatus
      ? `
        UPDATE orders
        SET status = $1, completed_at = NOW(), updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `
      : `
        UPDATE orders
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  /**
   * Update order
   */
  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['status', 'total_amount'];

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
      UPDATE orders
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Cancel order (restore stock)
   */
  static async cancel(id) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get order items
      const itemsQuery = 'SELECT * FROM order_items WHERE order_id = $1';
      const itemsResult = await client.query(itemsQuery, [id]);

      // Restore stock for each item
      for (const item of itemsResult.rows) {
        const stockQuery = `
          UPDATE products
          SET stock_quantity = stock_quantity + $1
          WHERE id = $2
        `;
        await client.query(stockQuery, [item.quantity, item.product_id]);
      }

      // Update order status
      const orderQuery = `
        UPDATE orders
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const orderResult = await client.query(orderQuery, [id]);

      await client.query('COMMIT');
      return orderResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete order
   */
  static async delete(id) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Delete order items
      await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);

      // Delete order
      const orderQuery = 'DELETE FROM orders WHERE id = $1 RETURNING id';
      const result = await client.query(orderQuery, [id]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get order statistics
   */
  static async getStats(filters = {}) {
    let query = `
      SELECT
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_order_value,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
      FROM orders
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (filters.start_date) {
      query += ` AND created_at >= $${paramCount}`;
      values.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND created_at <= $${paramCount}`;
      values.push(filters.end_date);
    }

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Count total orders
   */
  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) FROM orders WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    if (filters.user_id) {
      query += ` AND user_id = $${paramCount}`;
      values.push(filters.user_id);
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count);
  }
}

module.exports = Order;
