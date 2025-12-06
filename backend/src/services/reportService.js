const { pool } = require('../config/database');
const Product = require('../models/Product');
const Order = require('../models/Order');

class ReportService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      const [productsCount, ordersCount, lowStockCount, totalRevenue] = await Promise.all([
        Product.count(),
        Order.count(),
        Product.getLowStock(10),
        this.getTotalRevenue()
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
  async getSalesReport(startDate, endDate) {
    try {
      const query = `
        SELECT
          DATE(created_at) as date,
          COUNT(*) as orders,
          SUM(total_amount) as revenue,
          AVG(total_amount) as avg_order_value
        FROM orders
        WHERE created_at >= $1 AND created_at <= $2
          AND status != 'cancelled'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      const result = await pool.query(query, [startDate, endDate]);

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
  async getInventoryReport() {
    try {
      const query = `
        SELECT
          category,
          COUNT(*) as product_count,
          SUM(stock) as total_stock,
          SUM(stock * price) as inventory_value,
          AVG(price) as avg_price
        FROM products
        GROUP BY category
        ORDER BY inventory_value DESC
      `;

      const result = await pool.query(query);

      const totalQuery = `
        SELECT
          COUNT(*) as total_products,
          SUM(stock) as total_stock,
          SUM(stock * price) as total_value
        FROM products
      `;

      const totalResult = await pool.query(totalQuery);

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
  async getLowStockReport(threshold = 10) {
    try {
      const products = await Product.getLowStock(threshold);

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
  async getDailyReport(date = new Date()) {
    try {
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const [revenue, orders, topProducts] = await Promise.all([
        this.getTotalRevenue({ start_date: startOfDay, end_date: endOfDay }),
        Order.findAll({ start_date: startOfDay, end_date: endOfDay }),
        this.getTopSellingProducts(5, { start_date: startOfDay, end_date: endOfDay })
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
  async getMonthlyReport(year, month) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      const [salesReport, revenue, categoryRevenue, topProducts] = await Promise.all([
        this.getSalesReport(startDate, endDate),
        this.getTotalRevenue({ start_date: startDate, end_date: endDate }),
        this.getRevenueByCategory({ start_date: startDate, end_date: endDate }),
        this.getTopSellingProducts(10, { start_date: startDate, end_date: endDate })
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
