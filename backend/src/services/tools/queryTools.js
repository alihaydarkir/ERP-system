const pool = require('../../config/database');

const queryTools = {
  async get_dashboard_summary({ company_id }) {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM orders WHERE company_id = $1) AS total_orders,
        (SELECT COUNT(*) FROM customers WHERE company_id = $1) AS total_customers,
        (SELECT COUNT(*) FROM products WHERE company_id = $1) AS total_products,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE company_id = $1 AND status = 'completed') AS total_revenue,
        (SELECT COUNT(*) FROM products WHERE stock_quantity <= low_stock_threshold AND company_id = $1) AS low_stock_count,
        (SELECT COUNT(*) FROM cheques WHERE status = 'overdue' AND company_id = $1) AS overdue_cheques_count,
        (SELECT COALESCE(SUM(amount), 0) FROM cheques WHERE status = 'overdue' AND company_id = $1) AS overdue_cheques_amount,
        (SELECT COUNT(*) FROM orders WHERE status = 'pending' AND company_id = $1) AS pending_orders
    `, [company_id]);
    return result.rows[0];
  },

  async search_cheques({ status, limit = 10, company_id }) {
    const values = [company_id];
    let statusClause = '';

    if (status) {
      values.push(status);
      statusClause = `AND ch.status = $${values.length}`;
    }

    values.push(Math.min(limit, 50));
    const result = await pool.query(`
      SELECT
        ch.id,
        ch.check_serial_no,
        ch.amount,
        ch.currency,
        ch.due_date,
        ch.status,
        ch.bank_name,
        ch.received_date,
        c.full_name   AS customer_name,
        c.company_name AS customer_company,
        (ch.due_date - CURRENT_DATE) AS days_until_due
      FROM cheques ch
      LEFT JOIN customers c ON ch.customer_id = c.id
      WHERE ch.company_id = $1 ${statusClause}
      ORDER BY ch.due_date ASC
      LIMIT $${values.length}
    `, values);
    return result.rows;
  },

  async get_overdue_cheques({ company_id }) {
    const result = await pool.query(`
      SELECT
        ch.id,
        ch.check_serial_no,
        ch.amount,
        ch.currency,
        ch.due_date,
        ch.bank_name,
        c.full_name   AS customer_name,
        c.company_name AS customer_company,
        (CURRENT_DATE - ch.due_date) AS days_overdue
      FROM cheques ch
      LEFT JOIN customers c ON ch.customer_id = c.id
      WHERE ch.company_id = $1 AND ch.status = 'overdue'
      ORDER BY ch.due_date ASC
      LIMIT 20
    `, [company_id]);

    const total = result.rows.reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);
    return { cheques: result.rows, total_overdue_amount: total, count: result.rows.length };
  },

  async get_financial_summary({ company_id }) {
    const result = await pool.query(`
      SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM cheques WHERE status = 'pending' AND company_id = $1) AS pending_cheques_amount,
        (SELECT COUNT(*)               FROM cheques WHERE status = 'pending' AND company_id = $1) AS pending_cheques_count,
        (SELECT COALESCE(SUM(amount), 0) FROM cheques WHERE status = 'overdue' AND company_id = $1) AS overdue_cheques_amount,
        (SELECT COUNT(*)               FROM cheques WHERE status = 'overdue' AND company_id = $1) AS overdue_cheques_count,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'completed' AND company_id = $1 AND created_at >= DATE_TRUNC('month', NOW())) AS this_month_revenue,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'completed' AND company_id = $1 AND created_at >= DATE_TRUNC('year', NOW())) AS this_year_revenue,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'pending' AND company_id = $1) AS pending_orders_amount,
        (SELECT COUNT(*)                       FROM orders WHERE status = 'pending' AND company_id = $1) AS pending_orders_count
    `, [company_id]);
    return result.rows[0];
  },

  async get_low_stock_products({ company_id }) {
    const result = await pool.query(`
      SELECT id, name, stock_quantity, low_stock_threshold, category, price
      FROM products
      WHERE stock_quantity <= low_stock_threshold AND company_id = $1
      ORDER BY stock_quantity ASC
      LIMIT 20
    `, [company_id]);
    return { products: result.rows, count: result.rows.length };
  },

  async search_products({ search, limit = 20, company_id }) {
    const values = [company_id];
    let searchClause = '';

    if (search) {
      values.push(`%${search}%`);
      searchClause = `AND (p.name ILIKE $${values.length} OR p.category ILIKE $${values.length})`;
    }

    values.push(Math.min(limit, 50));
    const result = await pool.query(`
      SELECT id, name, category, price, stock_quantity, low_stock_threshold, sku
      FROM products p
      WHERE company_id = $1 ${searchClause}
      ORDER BY name ASC
      LIMIT $${values.length}
    `, values);
    return { products: result.rows, count: result.rows.length };
  },

  async search_customers({ search, limit = 10, company_id }) {
    const values = [company_id];
    let searchClause = '';

    if (search) {
      values.push(`%${search}%`);
      searchClause = `AND (c.full_name ILIKE $${values.length} OR c.company_name ILIKE $${values.length})`;
    }

    values.push(Math.min(limit, 50));
    const result = await pool.query(`
      SELECT id, full_name, company_name, phone_number, company_location
      FROM customers c
      WHERE company_id = $1 ${searchClause}
      ORDER BY full_name ASC
      LIMIT $${values.length}
    `, values);
    return { customers: result.rows, count: result.rows.length };
  },

  async get_orders_summary({ period = 'month', company_id }) {
    const intervalMap = { today: "INTERVAL '1 day'", week: "INTERVAL '7 days'", month: "INTERVAL '30 days'" };
    const interval = intervalMap[period] || intervalMap.month;

    const result = await pool.query(`
      SELECT
        COUNT(*)                                                   AS total_orders,
        COALESCE(SUM(total_amount), 0)                             AS total_amount,
        COUNT(CASE WHEN status = 'pending'   THEN 1 END)           AS pending_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)           AS completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END)           AS cancelled_orders,
        COALESCE(AVG(total_amount), 0)                             AS avg_order_amount
      FROM orders
      WHERE company_id = $1
        AND created_at >= NOW() - ${interval}
    `, [company_id]);
    return { ...result.rows[0], period };
  }
};

module.exports = queryTools;
