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
  },

  async get_orders_list({ status, limit = 15, company_id }) {
    const values = [company_id];
    let statusClause = '';
    if (status) {
      values.push(status);
      statusClause = `AND o.status = $${values.length}`;
    }
    values.push(Math.min(limit, 50));
    const result = await pool.query(`
      SELECT
        o.id, o.order_number, o.status, o.total_amount, o.created_at,
        c.full_name AS customer_name, c.company_name AS customer_company
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.company_id = $1 ${statusClause}
      ORDER BY o.created_at DESC
      LIMIT $${values.length}
    `, values);
    return { orders: result.rows, count: result.rows.length };
  },

  async search_orders({ search, status, limit = 10, company_id }) {
    const values = [company_id];
    const clauses = [];
    if (status) { values.push(status); clauses.push(`o.status = $${values.length}`); }
    if (search) {
      values.push(`%${search}%`);
      clauses.push(`(o.order_number ILIKE $${values.length} OR c.full_name ILIKE $${values.length} OR c.company_name ILIKE $${values.length})`);
    }
    const where = clauses.length ? 'AND ' + clauses.join(' AND ') : '';
    values.push(Math.min(limit, 50));
    const result = await pool.query(`
      SELECT o.id, o.order_number, o.status, o.total_amount, o.created_at,
             c.full_name AS customer_name, c.company_name AS customer_company
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.company_id = $1 ${where}
      ORDER BY o.created_at DESC
      LIMIT $${values.length}
    `, values);
    return { orders: result.rows, count: result.rows.length };
  },

  async get_suppliers_list({ search, limit = 20, company_id }) {
    const values = [company_id];
    let searchClause = '';
    if (search) {
      values.push(`%${search}%`);
      searchClause = `AND (s.supplier_name ILIKE $${values.length} OR s.contact_person ILIKE $${values.length})`;
    }
    values.push(Math.min(limit, 50));
    const result = await pool.query(`
      SELECT id, supplier_name, contact_person, phone, email, rating, is_active
      FROM suppliers s
      WHERE company_id = $1 ${searchClause}
      ORDER BY supplier_name ASC
      LIMIT $${values.length}
    `, values);
    return { suppliers: result.rows, count: result.rows.length };
  },

  async get_invoices_summary({ status, limit = 15, company_id }) {
    const values = [company_id];
    let statusClause = '';
    if (status) { values.push(status); statusClause = `AND i.status = $${values.length}`; }
    values.push(Math.min(limit, 50));

    const statsResult = await pool.query(`
      SELECT
        COUNT(*) AS total_invoices,
        COALESCE(SUM(total_amount),0) AS total_amount,
        COUNT(CASE WHEN status='paid' THEN 1 END) AS paid_count,
        COUNT(CASE WHEN status='overdue' THEN 1 END) AS overdue_count,
        COUNT(CASE WHEN status='pending' THEN 1 END) AS pending_count,
        COALESCE(SUM(CASE WHEN status='overdue' THEN total_amount ELSE 0 END),0) AS overdue_amount
      FROM invoices WHERE company_id = $1
    `, [company_id]);

    const listResult = await pool.query(`
      SELECT i.id, i.invoice_number, i.status, i.total_amount, i.due_date,
             c.full_name AS customer_name, c.company_name AS customer_company
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.company_id = $1 ${statusClause}
      ORDER BY i.due_date ASC
      LIMIT $${values.length}
    `, values);

    return { summary: statsResult.rows[0], invoices: listResult.rows };
  },

  async get_warehouse_stock({ company_id }) {
    const result = await pool.query(`
      SELECT
        w.id, w.warehouse_name, w.warehouse_code, w.city,
        COUNT(DISTINCT ws.product_id) AS product_count,
        COALESCE(SUM(ws.quantity), 0) AS total_stock_units
      FROM warehouses w
      LEFT JOIN warehouse_stock ws ON ws.warehouse_id = w.id
      WHERE w.company_id = $1 AND w.is_active = true
      GROUP BY w.id, w.warehouse_name, w.warehouse_code, w.city
      ORDER BY w.warehouse_name
    `, [company_id]);
    return { warehouses: result.rows, count: result.rows.length };
  },

  async get_top_customers({ limit = 10, company_id }) {
    const result = await pool.query(`
      SELECT
        c.id, c.full_name, c.company_name,
        COUNT(o.id) AS order_count,
        COALESCE(SUM(o.total_amount), 0) AS total_spent
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'completed' AND o.company_id = $1
      WHERE c.company_id = $1
      GROUP BY c.id, c.full_name, c.company_name
      ORDER BY total_spent DESC
      LIMIT $2
    `, [company_id, Math.min(limit, 20)]);
    return { customers: result.rows, count: result.rows.length };
  },

  async get_top_products({ limit = 10, company_id }) {
    const result = await pool.query(`
      SELECT
        p.id, p.name, p.category, p.price, p.stock_quantity,
        COALESCE(SUM(oi.quantity), 0) AS total_sold,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total_revenue
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.status = 'completed' AND o.company_id = $1
      WHERE p.company_id = $1
      GROUP BY p.id, p.name, p.category, p.price, p.stock_quantity
      ORDER BY total_sold DESC
      LIMIT $2
    `, [company_id, Math.min(limit, 20)]);
    return { products: result.rows, count: result.rows.length };
  }
};

module.exports = queryTools;
