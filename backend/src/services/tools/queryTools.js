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
        (SELECT COUNT(*) FROM cheques WHERE status = 'pending' AND due_date < CURRENT_DATE AND company_id = $1) AS overdue_cheques_count,
        (SELECT COALESCE(SUM(amount), 0) FROM cheques WHERE status = 'pending' AND due_date < CURRENT_DATE AND company_id = $1) AS overdue_cheques_amount,
        (SELECT COUNT(*) FROM orders WHERE status = 'pending' AND company_id = $1) AS pending_orders
    `, [company_id]);
    return result.rows[0];
  },

  async search_cheques({ status, limit = 10, company_id, role, user_id }) {
    const values = [company_id];
    const clauses = [];

    if (role === 'customer') {
      const custR = await pool.query(
        `SELECT id FROM customers WHERE user_id = $1 AND company_id = $2 LIMIT 1`,
        [user_id, company_id]
      );
      if (!custR.rows[0]) return [];
      values.push(custR.rows[0].id);
      clauses.push(`ch.customer_id = $${values.length}`);
    }

    if (status) {
      values.push(status);
      clauses.push(`ch.status = $${values.length}`);
    }

    const where = clauses.length ? 'AND ' + clauses.join(' AND ') : '';
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
      WHERE ch.company_id = $1 ${where}
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
      WHERE ch.company_id = $1 AND ch.status = 'pending' AND ch.due_date < CURRENT_DATE
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
        (SELECT COALESCE(SUM(amount), 0) FROM cheques WHERE status = 'pending' AND due_date < CURRENT_DATE AND company_id = $1) AS overdue_cheques_amount,
        (SELECT COUNT(*)               FROM cheques WHERE status = 'pending' AND due_date < CURRENT_DATE AND company_id = $1) AS overdue_cheques_count,
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
        COALESCE(SUM(CASE WHEN status = 'pending' THEN total_amount END), 0)   AS pending_amount,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount END), 0) AS completed_amount,
        COALESCE(AVG(total_amount), 0)                             AS avg_order_amount
      FROM orders
      WHERE company_id = $1
        AND created_at >= NOW() - ${interval}
    `, [company_id]);
    return { ...result.rows[0], period };
  },

  async get_orders_list({ status, limit = 15, company_id, role, user_id }) {
    const values = [company_id];
    const clauses = [];

    if (role === 'customer') {
      const custR = await pool.query(
        `SELECT id FROM customers WHERE user_id = $1 AND company_id = $2 LIMIT 1`,
        [user_id, company_id]
      );
      if (!custR.rows[0]) return { orders: [], count: 0 };
      values.push(custR.rows[0].id);
      clauses.push(`o.customer_id = $${values.length}`);
    }

    if (status) {
      values.push(status);
      clauses.push(`o.status = $${values.length}`);
    }

    const where = clauses.length ? 'AND ' + clauses.join(' AND ') : '';
    values.push(Math.min(limit, 50));
    const result = await pool.query(`
      SELECT
        o.id, o.order_number, o.status, o.total_amount, o.created_at,
        c.full_name AS customer_name, c.company_name AS customer_company
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.company_id = $1 ${where}
      ORDER BY o.created_at DESC
      LIMIT $${values.length}
    `, values);
    return { orders: result.rows, count: result.rows.length };
  },

  async search_orders({ search, status, limit = 10, company_id, role, user_id }) {
    const values = [company_id];
    const clauses = [];

    if (role === 'customer') {
      const custR = await pool.query(
        `SELECT id FROM customers WHERE user_id = $1 AND company_id = $2 LIMIT 1`,
        [user_id, company_id]
      );
      if (!custR.rows[0]) return { orders: [], count: 0 };
      values.push(custR.rows[0].id);
      clauses.push(`o.customer_id = $${values.length}`);
    }

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
        COALESCE(SUM(oi.quantity * oi.price), 0) AS total_revenue
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.status = 'completed' AND o.company_id = $1
      WHERE p.company_id = $1
      GROUP BY p.id, p.name, p.category, p.price, p.stock_quantity
      ORDER BY total_sold DESC
      LIMIT $2
    `, [company_id, Math.min(limit, 20)]);
    return { products: result.rows, count: result.rows.length };
  },

  // ── ANALİTİK ARAÇLAR ─────────────────────────────────────────────────────

  async get_customer_detail({ customer_name, company_id, role, user_id }) {
    let customerResult;

    if (role === 'customer') {
      // Customer role can only view their own profile
      customerResult = await pool.query(`
        SELECT id, full_name, company_name, phone_number, company_location
        FROM customers
        WHERE company_id = $1 AND user_id = $2
        LIMIT 1
      `, [company_id, user_id]);
    } else {
      const search = `%${customer_name || ''}%`;
      customerResult = await pool.query(`
        SELECT id, full_name, company_name, phone_number, company_location
        FROM customers
        WHERE company_id = $1 AND (full_name ILIKE $2 OR company_name ILIKE $2)
        LIMIT 1
      `, [company_id, search]);
    }

    if (customerResult.rows.length === 0) {
      return { found: false, customer_name };
    }

    const customer = customerResult.rows[0];
    const cid = customer.id;

    const [ordersResult, chequesResult] = await Promise.all([
      pool.query(`
        SELECT id, order_number, status, total_amount, created_at
        FROM orders
        WHERE company_id = $1 AND customer_id = $2
        ORDER BY created_at DESC LIMIT 10
      `, [company_id, cid]),
      pool.query(`
        SELECT id, check_serial_no, amount, due_date, status, bank_name,
               (CURRENT_DATE - due_date) AS days_overdue
        FROM cheques
        WHERE company_id = $1 AND customer_id = $2
        ORDER BY due_date DESC LIMIT 10
      `, [company_id, cid])
    ]);

    const orders = ordersResult.rows;
    const cheques = chequesResult.rows;
    const totalSpent = orders.filter(o => o.status === 'completed').reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const pendingCheques = cheques.filter(c => c.status === 'pending');
    const overdueCheques = cheques.filter(c => c.status === 'pending' && new Date(c.due_date) < new Date());
    const totalDebt = pendingCheques.reduce((s, c) => s + Number(c.amount || 0), 0);

    return {
      found: true,
      customer,
      orders,
      order_count: orders.length,
      total_spent: totalSpent,
      cheques,
      pending_cheques_count: pendingCheques.length,
      overdue_cheques_count: overdueCheques.length,
      total_debt: totalDebt
    };
  },

  async get_debt_aging_report({ company_id }) {
    const result = await pool.query(`
      SELECT
        ch.id, ch.check_serial_no, ch.amount, ch.due_date, ch.bank_name,
        c.full_name AS customer_name, c.company_name AS customer_company,
        (CURRENT_DATE - ch.due_date::date) AS days_overdue
      FROM cheques ch
      LEFT JOIN customers c ON ch.customer_id = c.id
      WHERE ch.company_id = $1 AND ch.status = 'pending' AND ch.due_date < CURRENT_DATE
      ORDER BY ch.due_date ASC
    `, [company_id]);

    const rows = result.rows;
    const bucket = (days) => {
      if (days <= 30) return '0-30 gün';
      if (days <= 60) return '31-60 gün';
      if (days <= 90) return '61-90 gün';
      return '90+ gün';
    };

    const aging = { '0-30 gün': [], '31-60 gün': [], '61-90 gün': [], '90+ gün': [] };
    rows.forEach(r => aging[bucket(Number(r.days_overdue))].push(r));

    const summary = Object.entries(aging).map(([label, items]) => ({
      label,
      count: items.length,
      total_amount: items.reduce((s, r) => s + Number(r.amount || 0), 0)
    }));

    return { summary, details: rows, total_overdue_count: rows.length, total_overdue_amount: rows.reduce((s, r) => s + Number(r.amount || 0), 0) };
  },

  async get_monthly_comparison({ company_id }) {
    const result = await pool.query(`
      SELECT
        SUM(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN total_amount ELSE 0 END)           AS this_month_revenue,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END)                           AS this_month_orders,
        SUM(CASE WHEN created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
                  AND created_at < DATE_TRUNC('month', NOW()) THEN total_amount ELSE 0 END)            AS last_month_revenue,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
                   AND created_at < DATE_TRUNC('month', NOW()) THEN 1 END)                             AS last_month_orders,
        (SELECT COUNT(*) FROM customers WHERE company_id = $1
          AND created_at >= DATE_TRUNC('month', NOW()))                                                AS new_customers_this_month,
        (SELECT COALESCE(SUM(amount),0) FROM cheques WHERE company_id = $1 AND status = 'paid'
          AND due_date >= DATE_TRUNC('month', NOW()))                                                  AS this_month_collections
      FROM orders
      WHERE company_id = $1 AND status = 'completed'
    `, [company_id]);

    const row = result.rows[0];
    const thisRev = Number(row.this_month_revenue || 0);
    const lastRev = Number(row.last_month_revenue || 0);
    const revChange = lastRev > 0 ? ((thisRev - lastRev) / lastRev * 100).toFixed(1) : null;
    const thisOrders = Number(row.this_month_orders || 0);
    const lastOrders = Number(row.last_month_orders || 0);
    const ordersChange = lastOrders > 0 ? ((thisOrders - lastOrders) / lastOrders * 100).toFixed(1) : null;

    return {
      this_month: { revenue: thisRev, orders: thisOrders, new_customers: Number(row.new_customers_this_month || 0), collections: Number(row.this_month_collections || 0) },
      last_month: { revenue: lastRev, orders: lastOrders },
      changes: { revenue_pct: revChange, orders_pct: ordersChange }
    };
  },

  async recommend_reorder({ company_id }) {
    const result = await pool.query(`
      SELECT
        p.id, p.name, p.sku, p.stock_quantity, p.low_stock_threshold, p.price, p.category,
        COALESCE(SUM(oi.quantity), 0) AS sold_last_30_days
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.status = 'completed'
        AND o.created_at >= NOW() - INTERVAL '30 days' AND o.company_id = $1
      WHERE p.company_id = $1
        AND p.stock_quantity <= GREATEST(p.low_stock_threshold, 10)
        AND p.is_active = true
      GROUP BY p.id, p.name, p.sku, p.stock_quantity, p.low_stock_threshold, p.price, p.category
      ORDER BY p.stock_quantity ASC
      LIMIT 20
    `, [company_id]);

    const recommendations = result.rows.map(r => {
      const dailySales = Number(r.sold_last_30_days || 0) / 30;
      const daysLeft = dailySales > 0 ? Math.floor(r.stock_quantity / dailySales) : null;
      const suggestedQty = Math.max(Number(r.low_stock_threshold || 10) * 3, Number(r.sold_last_30_days || 0) * 2, 20);
      return {
        ...r,
        daily_sales_rate: dailySales.toFixed(2),
        days_of_stock_left: daysLeft,
        suggested_order_qty: Math.ceil(suggestedQty),
        urgency: r.stock_quantity === 0 ? 'Kritik' : daysLeft !== null && daysLeft <= 7 ? 'Yüksek' : 'Orta'
      };
    });

    return { recommendations, count: recommendations.length };
  },

  async get_payment_risk_assessment({ company_id }) {
    const result = await pool.query(`
      SELECT
        c.id, c.full_name, c.company_name,
        COUNT(ch.id) AS total_cheques,
        COUNT(CASE WHEN ch.status = 'pending' AND ch.due_date < CURRENT_DATE THEN 1 END) AS overdue_count,
        COALESCE(SUM(CASE WHEN ch.status = 'pending' THEN ch.amount ELSE 0 END), 0) AS pending_amount,
        COALESCE(SUM(CASE WHEN ch.status = 'pending' AND ch.due_date < CURRENT_DATE THEN ch.amount ELSE 0 END), 0) AS overdue_amount,
        MAX(CASE WHEN ch.status = 'pending' AND ch.due_date < CURRENT_DATE THEN (CURRENT_DATE - ch.due_date::date) END) AS max_days_overdue
      FROM customers c
      JOIN cheques ch ON ch.customer_id = c.id AND ch.company_id = $1
      WHERE c.company_id = $1
      GROUP BY c.id, c.full_name, c.company_name
      HAVING COUNT(CASE WHEN ch.status = 'pending' AND ch.due_date < CURRENT_DATE THEN 1 END) > 0
         OR COALESCE(SUM(CASE WHEN ch.status = 'pending' THEN ch.amount ELSE 0 END), 0) > 0
      ORDER BY overdue_amount DESC
      LIMIT 20
    `, [company_id]);

    const customers = result.rows.map(r => {
      const overdueCount = Number(r.overdue_count || 0);
      const maxDays = Number(r.max_days_overdue || 0);
      const risk = overdueCount >= 3 || maxDays >= 90 ? 'Yüksek' : overdueCount >= 1 || maxDays >= 30 ? 'Orta' : 'Düşük';
      return { ...r, risk_level: risk };
    });

    return { customers, high_risk: customers.filter(c => c.risk_level === 'Yüksek').length, medium_risk: customers.filter(c => c.risk_level === 'Orta').length, count: customers.length };
  }
};

module.exports = queryTools;
