const pool = require('../config/database');
const PermissionService = require('../services/permissionService');
const { formatSuccess, formatError } = require('../utils/formatters');

const fmtTl = (n) => `${Number(n || 0).toLocaleString('tr-TR')} TL`;

/**
 * GET /api/alerts
 * Zil için kalıcı uyarılar: mevcut verilerden hesaplanır (kritik stok, vadesi geçmiş çek,
 * bekleyen sipariş). Sayfa yenilense de kaybolmaz; şirket bazlı ve izne duyarlıdır.
 */
const getAlerts = async (req, res) => {
  try {
    const { company_id: companyId, userId, role } = req.user;
    if (role === 'customer') {
      return res.json(formatSuccess({ alerts: [] }, 'Uyarılar'));
    }

    const canSeeCheques = await PermissionService.hasPermission(userId, 'cheques.view');

    const [stock, pending, cheques, dueSoon, deficit] = await Promise.all([
      pool.query(`
        SELECT COUNT(*)::int AS count,
               COUNT(*) FILTER (WHERE stock_quantity <= 0)::int AS empty_count,
               (ARRAY_AGG(name ORDER BY stock_quantity ASC))[1:3] AS names
        FROM products
        WHERE company_id = $1 AND stock_quantity <= low_stock_threshold
      `, [companyId]),
      pool.query(`
        SELECT COUNT(*)::int AS count, COALESCE(SUM(total_amount), 0) AS total
        FROM orders WHERE company_id = $1 AND status = 'pending'
      `, [companyId]),
      canSeeCheques
        ? pool.query(`
            SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
            FROM cheques
            WHERE company_id = $1 AND status = 'pending' AND due_date < CURRENT_DATE
          `, [companyId])
        : Promise.resolve({ rows: [{ count: 0, total: 0 }] }),
      canSeeCheques
        ? pool.query(`
            SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
            FROM cheques
            WHERE company_id = $1 AND status = 'pending'
              AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '7 days'
          `, [companyId])
        : Promise.resolve({ rows: [{ count: 0, total: 0 }] }),
      pool.query(`
        SELECT COUNT(*)::int AS count FROM products WHERE company_id = $1 AND stock_quantity < 0
      `, [companyId])
    ]);

    const alerts = [];

    if (cheques.rows[0].count > 0) {
      alerts.push({
        id: 'overdue-cheques',
        severity: 'critical',
        icon: '💳',
        title: 'Vadesi geçmiş çek',
        message: `${cheques.rows[0].count} çek vadesi geçmiş, toplam ${fmtTl(cheques.rows[0].total)}`,
        link: '/cheques'
      });
    }
    if (deficit.rows[0].count > 0) {
      alerts.push({
        id: 'supply-deficit',
        severity: 'critical',
        icon: '🚚',
        title: 'Tedarik gerekiyor',
        message: `${deficit.rows[0].count} üründe stok eksiye düşmüş`,
        link: '/supply-alerts'
      });
    }
    if (stock.rows[0].count > 0) {
      const names = (stock.rows[0].names || []).join(', ');
      const empty = stock.rows[0].empty_count;
      alerts.push({
        id: 'low-stock',
        severity: empty > 0 ? 'critical' : 'warning',
        icon: '📦',
        title: 'Kritik stok',
        message: `${stock.rows[0].count} ürün kritik seviyede${empty > 0 ? ` (${empty} tanesi tükendi)` : ''}: ${names}`,
        link: '/products'
      });
    }
    if (pending.rows[0].count > 0) {
      alerts.push({
        id: 'pending-orders',
        severity: 'info',
        icon: '🛒',
        title: 'Bekleyen sipariş',
        message: `${pending.rows[0].count} sipariş işlem bekliyor, toplam ${fmtTl(pending.rows[0].total)}`,
        link: '/orders'
      });
    }
    if (dueSoon.rows[0].count > 0) {
      alerts.push({
        id: 'due-soon-cheques',
        severity: 'warning',
        icon: '🗓️',
        title: 'Vadesi yaklaşan çek',
        message: `7 gün içinde ${dueSoon.rows[0].count} çekin vadesi doluyor, toplam ${fmtTl(dueSoon.rows[0].total)}`,
        link: '/cheques'
      });
    }

    return res.json(formatSuccess({ alerts }, 'Uyarılar'));
  } catch (error) {
    console.error('Get alerts error:', error.message);
    return res.status(500).json(formatError('Uyarılar yüklenemedi'));
  }
};

module.exports = { getAlerts };
