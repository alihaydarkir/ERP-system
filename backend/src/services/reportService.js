const pool = require('../config/database');
const Product = require('../models/Product');
const Order = require('../models/Order');

class ReportService {
  /**
   * Get dashboard statistics (legacy - simple)
   */
  async getDashboardStats(company_id) {
    try {
      const [productsCount, ordersCount, lowStockCount, totalRevenue] = await Promise.all([
        Product.count({ company_id }),
        Order.count({ company_id }),
        Product.getLowStock(10, company_id),
        this.getTotalRevenue({ company_id })
      ]);

      return {
        success: true,
        stats: {
          totalProducts: productsCount,
          totalOrders: ordersCount,
          lowStockItems: lowStockCount.length,
          totalRevenue: totalRevenue.total || 0,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      console.error('Dashboard stats error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ⚡ DASHBOARD SUMMARY — Tek CTE sorgusuyla tüm dashboard verisi
   * KPI sayaçları, son siparişler, top ürünler, haftalık/aylık grafik verileri
   */
  async getDashboardSummary(company_id) {
    try {
      const cid = company_id;

      // ── 1. KPI + sipariş durumları ──────────────────────────────────────
      const kpiQuery = `
        SELECT
          (SELECT COUNT(*) FROM products   WHERE company_id = $1)                        AS total_products,
          (SELECT COUNT(*) FROM customers  WHERE company_id = $1)                        AS total_customers,
          (SELECT COUNT(*) FROM orders     WHERE company_id = $1)                        AS total_orders,
          (SELECT COUNT(*) FROM orders     WHERE company_id = $1 AND status = 'pending') AS pending_orders,
          (SELECT COUNT(*) FROM orders     WHERE company_id = $1 AND status = 'completed') AS completed_orders,
          (SELECT COUNT(*) FROM orders     WHERE company_id = $1 AND status = 'cancelled') AS cancelled_orders,
          (SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE company_id = $1 AND status = 'completed') AS total_revenue,
          (SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE company_id = $1 AND status = 'completed'
            AND created_at >= date_trunc('month', NOW()))                                AS monthly_revenue,
          (SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE company_id = $1 AND status = 'completed'
            AND created_at >= date_trunc('month', NOW() - INTERVAL '1 month')
            AND created_at <  date_trunc('month', NOW()))                                AS prev_month_revenue,
          (SELECT COUNT(*) FROM products   WHERE company_id = $1
            AND stock_quantity <= low_stock_threshold AND low_stock_threshold > 0)       AS low_stock_count,
          (SELECT COUNT(*) FROM invoices   WHERE company_id = $1 AND status IN ('sent','overdue')) AS outstanding_invoices
      `;

      // ── 2. Düşük stok ürünleri (max 5) ──────────────────────────────────
      const lowStockQuery = `
        SELECT id, name, sku, stock_quantity, low_stock_threshold, category
        FROM products
        WHERE company_id = $1
          AND stock_quantity <= low_stock_threshold
          AND low_stock_threshold > 0
        ORDER BY stock_quantity ASC
        LIMIT 5
      `;

      // ── 3. Son 5 sipariş ────────────────────────────────────────────────
      const recentOrdersQuery = `
        SELECT
          o.id, o.order_number, o.status, o.total_amount, o.created_at,
          c.full_name AS customer_name, c.company_name AS customer_company
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.company_id = $1
        ORDER BY o.created_at DESC
        LIMIT 5
      `;

      // ── 4. En çok satan 5 ürün (son 30 gün) ────────────────────────────
      const topProductsQuery = `
        SELECT
          p.id, p.name, p.category, p.price,
          COALESCE(SUM(oi.quantity), 0)            AS total_sold,
          COALESCE(SUM(oi.quantity * oi.price), 0) AS total_revenue
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o       ON oi.order_id = o.id
          AND o.status != 'cancelled'
          AND o.created_at >= NOW() - INTERVAL '30 days'
          AND o.company_id = $1
        WHERE p.company_id = $1
        GROUP BY p.id, p.name, p.category, p.price
        ORDER BY total_sold DESC
        LIMIT 5
      `;

      // ── 5. Son 7 gün günlük grafik verisi ───────────────────────────────
      const weeklyChartQuery = `
        SELECT
          gs.day::date                                                          AS date,
          TO_CHAR(gs.day, 'Dy')                                                AS label,
          COALESCE(COUNT(o.id),0)                                              AS orders,
          COALESCE(SUM(o.total_amount) FILTER (WHERE o.status='completed'), 0) AS revenue
        FROM generate_series(
          NOW()::date - INTERVAL '6 days',
          NOW()::date,
          '1 day'
        ) AS gs(day)
        LEFT JOIN orders o
          ON DATE(o.created_at) = gs.day::date
          AND o.company_id = $1
        GROUP BY gs.day
        ORDER BY gs.day ASC
      `;

      // ── 6. Son 6 ay aylık trend ─────────────────────────────────────────
      const monthlyTrendQuery = `
        SELECT
          TO_CHAR(gs.month, 'Mon YY')                                          AS label,
          gs.month::date                                                        AS month_date,
          COALESCE(COUNT(o.id),0)                                              AS orders,
          COALESCE(SUM(o.total_amount) FILTER (WHERE o.status='completed'), 0) AS revenue
        FROM generate_series(
          date_trunc('month', NOW()) - INTERVAL '5 months',
          date_trunc('month', NOW()),
          '1 month'
        ) AS gs(month)
        LEFT JOIN orders o
          ON date_trunc('month', o.created_at) = gs.month
          AND o.company_id = $1
        GROUP BY gs.month
        ORDER BY gs.month ASC
      `;

      // Tüm sorguları paralel çalıştır
      const [kpiRes, lowStockRes, recentOrdersRes, topProductsRes, weeklyRes, monthlyRes] =
        await Promise.all([
          pool.query(kpiQuery,         [cid]),
          pool.query(lowStockQuery,    [cid]),
          pool.query(recentOrdersQuery,[cid]),
          pool.query(topProductsQuery, [cid]),
          pool.query(weeklyChartQuery, [cid]),
          pool.query(monthlyTrendQuery,[cid]),
        ]);

      const kpi = kpiRes.rows[0];

      // Gelir değişim yüzdesi
      const prevRev  = parseFloat(kpi.prev_month_revenue) || 0;
      const curRev   = parseFloat(kpi.monthly_revenue)    || 0;
      const revChange = prevRev > 0 ? ((curRev - prevRev) / prevRev * 100).toFixed(1) : 0;

      return {
        success: true,
        summary: {
          kpi: {
            totalProducts:       parseInt(kpi.total_products),
            totalCustomers:      parseInt(kpi.total_customers),
            totalOrders:         parseInt(kpi.total_orders),
            pendingOrders:       parseInt(kpi.pending_orders),
            completedOrders:     parseInt(kpi.completed_orders),
            cancelledOrders:     parseInt(kpi.cancelled_orders),
            totalRevenue:        parseFloat(kpi.total_revenue),
            monthlyRevenue:      parseFloat(kpi.monthly_revenue),
            prevMonthRevenue:    parseFloat(kpi.prev_month_revenue),
            revenueChangePercent: parseFloat(revChange),
            lowStockCount:       parseInt(kpi.low_stock_count),
            outstandingInvoices: parseInt(kpi.outstanding_invoices),
          },
          lowStockProducts: lowStockRes.rows,
          recentOrders:     recentOrdersRes.rows,
          topProducts:      topProductsRes.rows,
          weeklyChart:      weeklyRes.rows.map(r => ({
            date:    r.date,
            label:   r.label,
            orders:  parseInt(r.orders),
            revenue: parseFloat(r.revenue),
          })),
          monthlyTrend: monthlyRes.rows.map(r => ({
            label:   r.label,
            orders:  parseInt(r.orders),
            revenue: parseFloat(r.revenue),
          })),
          generatedAt: new Date().toISOString(),
        }
      };
    } catch (error) {
      console.error('Dashboard summary error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get total revenue
   */
  async getTotalRevenue(filters = {}) {
    try {
      let query = `
        SELECT
          COALESCE(SUM(total_amount), 0) as total,
          COUNT(*) as order_count
        FROM orders
        WHERE status != 'cancelled'
      `;
      const values = [];
      let paramCount = 1;

      // MULTI-TENANCY
      if (filters.company_id) {
        query += ` AND company_id = $${paramCount}`;
        values.push(filters.company_id);
        paramCount++;
      }

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
      return {
        success: true,
        ...result.rows[0]
      };
    } catch (error) {
      console.error('Total revenue error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get sales report by date range
   */
  async getSalesReport(startDate, endDate, company_id = null) {
    try {
      let query = `
        SELECT
          DATE(created_at) as date,
          COUNT(*) as orders,
          SUM(total_amount) as revenue,
          AVG(total_amount) as avg_order_value
        FROM orders
        WHERE created_at >= $1 AND created_at <= $2
          AND status != 'cancelled'
      `;
      const values = [startDate, endDate];
      
      // MULTI-TENANCY
      if (company_id) {
        query += ` AND company_id = $3`;
        values.push(company_id);
      }
      
      query += `
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      const result = await pool.query(query, values);

      return {
        success: true,
        report: result.rows,
        summary: {
          totalOrders: result.rows.reduce((sum, row) => sum + parseInt(row.orders), 0),
          totalRevenue: result.rows.reduce((sum, row) => sum + parseFloat(row.revenue), 0),
          avgOrderValue: result.rows.reduce((sum, row) => sum + parseFloat(row.avg_order_value), 0) / result.rows.length || 0
        }
      };
    } catch (error) {
      console.error('Sales report error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get top selling products
   */
  async getTopSellingProducts(limit = 10, filters = {}) {
    try {
      let query = `
        SELECT
          p.id,
          p.name,
          p.sku,
          p.category,
          COUNT(oi.id) as order_count,
          SUM(oi.quantity) as total_quantity,
          SUM(oi.quantity * oi.price) as total_revenue
        FROM products p
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled'
      `;
      const values = [];
      let paramCount = 1;

      // MULTI-TENANCY
      if (filters.company_id) {
        query += ` AND o.company_id = $${paramCount}`;
        values.push(filters.company_id);
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

      query += `
        GROUP BY p.id, p.name, p.sku, p.category
        ORDER BY total_revenue DESC
        LIMIT $${paramCount}
      `;
      values.push(limit);

      const result = await pool.query(query, values);

      return {
        success: true,
        products: result.rows
      };
    } catch (error) {
      console.error('Top selling products error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get inventory report
   */
  async getInventoryReport(company_id = null) {
    try {
      let query = `
        SELECT
          category,
          COUNT(*) as product_count,
          SUM(stock) as total_stock,
          SUM(stock * price) as inventory_value,
          AVG(price) as avg_price
        FROM products
        WHERE 1=1
      `;
      const values = [];
      
      if (company_id) {
        query += ` AND company_id = $1`;
        values.push(company_id);
      }
      
      query += `
        GROUP BY category
        ORDER BY inventory_value DESC
      `;

      const result = await pool.query(query, values);

      let totalQuery = `
        SELECT
          COUNT(*) as total_products,
          SUM(stock) as total_stock,
          SUM(stock * price) as total_value
        FROM products
        WHERE 1=1
      `;
      const totalValues = [];
      
      if (company_id) {
        totalQuery += ` AND company_id = $1`;
        totalValues.push(company_id);
      }

      const totalResult = await pool.query(totalQuery, totalValues);

      return {
        success: true,
        byCategory: result.rows,
        summary: totalResult.rows[0]
      };
    } catch (error) {
      console.error('Inventory report error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get low stock report
   */
  async getLowStockReport(threshold = 10, company_id = null) {
    try {
      const products = await Product.getLowStock(threshold, company_id);

      const categories = {};
      products.forEach(p => {
        if (!categories[p.category]) {
          categories[p.category] = [];
        }
        categories[p.category].push(p);
      });

      return {
        success: true,
        products,
        byCategory: categories,
        count: products.length
      };
    } catch (error) {
      console.error('Low stock report error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get revenue by category
   */
  async getRevenueByCategory(filters = {}) {
    try {
      let query = `
        SELECT
          p.category,
          COUNT(DISTINCT o.id) as order_count,
          SUM(oi.quantity) as items_sold,
          SUM(oi.quantity * oi.price) as revenue
        FROM products p
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled'
      `;
      const values = [];
      let paramCount = 1;

      // MULTI-TENANCY
      if (filters.company_id) {
        query += ` AND o.company_id = $${paramCount}`;
        values.push(filters.company_id);
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
      }

      query += `
        GROUP BY p.category
        ORDER BY revenue DESC
      `;

      const result = await pool.query(query, values);

      return {
        success: true,
        categories: result.rows
      };
    } catch (error) {
      console.error('Revenue by category error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(filters = {}) {
    try {
      const stats = await Order.getStats(filters);

      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('Order statistics error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get daily report
   */
  async getDailyReport(date = new Date(), company_id = null) {
    try {
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const filters = { start_date: startOfDay, end_date: endOfDay };
      if (company_id) filters.company_id = company_id;

      const [revenue, orders, topProducts] = await Promise.all([
        this.getTotalRevenue(filters),
        Order.findAll({ ...filters }),
        this.getTopSellingProducts(5, filters)
      ]);

      return {
        success: true,
        date: date.toISOString().split('T')[0],
        revenue: revenue.total || 0,
        orderCount: orders.length,
        topProducts: topProducts.products || [],
        orders
      };
    } catch (error) {
      console.error('Daily report error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get monthly report
   */
  async getMonthlyReport(year, month, company_id = null) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      const filters = { start_date: startDate, end_date: endDate };
      if (company_id) filters.company_id = company_id;

      const [salesReport, revenue, categoryRevenue, topProducts] = await Promise.all([
        this.getSalesReport(startDate, endDate, company_id),
        this.getTotalRevenue(filters),
        this.getRevenueByCategory(filters),
        this.getTopSellingProducts(10, filters)
      ]);

      return {
        success: true,
        period: `${year}-${month.toString().padStart(2, '0')}`,
        summary: {
          totalRevenue: revenue.total || 0,
          totalOrders: revenue.order_count || 0,
          avgOrderValue: revenue.total / revenue.order_count || 0
        },
        dailySales: salesReport.report || [],
        categoryRevenue: categoryRevenue.categories || [],
        topProducts: topProducts.products || []
      };
    } catch (error) {
      console.error('Monthly report error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export data as CSV
   */
  generateCSV(data, columns) {
    try {
      const header = columns.join(',');
      const rows = data.map(row =>
        columns.map(col => {
          const value = row[col];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      );

      return {
        success: true,
        csv: [header, ...rows].join('\n')
      };
    } catch (error) {
      console.error('CSV generation error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ReportService();
