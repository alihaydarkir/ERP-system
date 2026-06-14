const pool = require('../config/database');
const { formatSuccess, formatError } = require('../utils/formatters');

/**
 * GET /api/current-accounts
 * Her müşteri için bakiye özeti
 */
const getAccountList = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const searchClause = search
      ? `AND (c.full_name ILIKE $2 OR c.company_name ILIKE $2)`
      : '';
    const params = search
      ? [company_id, `%${search}%`, parseInt(limit), offset]
      : [company_id, parseInt(limit), offset];

    const limitIdx  = search ? 3 : 2;
    const offsetIdx = search ? 4 : 3;

    const query = `
      SELECT
        c.id,
        c.full_name,
        c.company_name,
        c.phone_number,
        COALESCE(ord.total_sales, 0)      AS total_sales,
        COALESCE(ord.order_count, 0)      AS order_count,
        COALESCE(inv.total_invoiced, 0)   AS total_invoiced,
        COALESCE(inv.total_paid, 0) + COALESCE(chq.cheque_paid, 0) AS total_paid,
        COALESCE(inv.invoice_count, 0)    AS invoice_count,
        -- Borç (bakiye) = toplam satış (sipariş) − toplam ödeme (fatura ödemesi + ödenen çek)
        COALESCE(ord.total_sales, 0)
          - (COALESCE(inv.total_paid, 0) + COALESCE(chq.cheque_paid, 0)) AS outstanding_balance
      FROM customers c
      LEFT JOIN (
        SELECT customer_id,
               COUNT(*)                              AS order_count,
               SUM(total_amount)                    AS total_sales
        FROM orders
        WHERE company_id = $1
          AND status != 'cancelled'
        GROUP BY customer_id
      ) ord ON ord.customer_id = c.id
      LEFT JOIN (
        SELECT customer_id,
               COUNT(*)                             AS invoice_count,
               SUM(total_amount)                   AS total_invoiced,
               SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) AS total_paid
        FROM invoices
        WHERE company_id = $1
        GROUP BY customer_id
      ) inv ON inv.customer_id = c.id
      LEFT JOIN (
        -- Ödenen (tahsil edilen) çekler de müşterinin ödemesi sayılır
        SELECT customer_id,
               SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS cheque_paid
        FROM cheques
        WHERE company_id = $1
        GROUP BY customer_id
      ) chq ON chq.customer_id = c.id
      WHERE c.company_id = $1
      ${searchClause}
      ORDER BY outstanding_balance DESC, c.company_name ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const countQuery = `
      SELECT COUNT(*) FROM customers c WHERE c.company_id = $1
      ${searchClause}
    `;
    const countParams = search ? [company_id, `%${search}%`] : [company_id];

    const [dataRes, countRes] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countRes.rows[0].count);

    res.json(formatSuccess({
      accounts: dataRes.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Cari hesap listesi'));

  } catch (error) {
    console.error('getAccountList error:', error);
    res.status(500).json(formatError('Cari hesaplar yüklenemedi', null, 'SERVER_ERROR'));
  }
};

/**
 * GET /api/current-accounts/summary
 * Genel bakiye özeti (toplam alacak, toplam borç, açık hesap sayısı)
 */
const getAccountSummary = async (req, res) => {
  try {
    const { company_id } = req.user;

    // Borç (bakiye) = toplam satış (sipariş) − toplam ödeme (fatura ödemesi + ödenen çek)
    const result = await pool.query(`
      SELECT
        COUNT(DISTINCT c.id)                                                                 AS total_customers,
        COUNT(DISTINCT CASE WHEN (COALESCE(ord.total_sales,0) - COALESCE(bal.total_paid,0) - COALESCE(chq.cheque_paid,0)) > 0 THEN c.id END) AS customers_with_balance,
        COALESCE(SUM(COALESCE(ord.total_sales,0) - COALESCE(bal.total_paid,0) - COALESCE(chq.cheque_paid,0)), 0) AS total_outstanding,
        COALESCE(SUM(bal.total_invoiced), 0)                                                 AS total_invoiced,
        COALESCE(SUM(COALESCE(bal.total_paid,0) + COALESCE(chq.cheque_paid,0)), 0)           AS total_paid
      FROM customers c
      LEFT JOIN (
        SELECT customer_id, SUM(total_amount) AS total_sales
        FROM orders WHERE company_id = $1 AND status != 'cancelled'
        GROUP BY customer_id
      ) ord ON ord.customer_id = c.id
      LEFT JOIN (
        SELECT customer_id,
               SUM(total_amount)                                        AS total_invoiced,
               SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END) AS total_paid
        FROM invoices WHERE company_id = $1
        GROUP BY customer_id
      ) bal ON bal.customer_id = c.id
      LEFT JOIN (
        SELECT customer_id,
               SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) AS cheque_paid
        FROM cheques WHERE company_id = $1
        GROUP BY customer_id
      ) chq ON chq.customer_id = c.id
      WHERE c.company_id = $1
    `, [company_id]);

    res.json(formatSuccess(result.rows[0], 'Cari hesap özeti'));

  } catch (error) {
    console.error('getAccountSummary error:', error);
    res.status(500).json(formatError('Özet yüklenemedi', null, 'SERVER_ERROR'));
  }
};

/**
 * GET /api/current-accounts/:customerId
 * Tek müşteri cari hesap detayı
 */
const getAccountDetail = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { customerId } = req.params;

    // Müşteri bilgisi
    const customerRes = await pool.query(
      `SELECT id, full_name, company_name, phone_number, tax_number, company_location
       FROM customers WHERE id = $1 AND company_id = $2`,
      [customerId, company_id]
    );
    if (customerRes.rows.length === 0) {
      return res.status(404).json(formatError('Müşteri bulunamadı', null, 'NOT_FOUND'));
    }

    // Sipariş özeti
    const ordersRes = await pool.query(`
      SELECT COUNT(*) AS order_count,
             COALESCE(SUM(total_amount), 0) AS total_sales,
             COUNT(*) FILTER (WHERE status='pending')   AS pending_count,
             COUNT(*) FILTER (WHERE status='completed') AS completed_count
      FROM orders
      WHERE customer_id = $1 AND company_id = $2 AND status != 'cancelled'
    `, [customerId, company_id]);

    // Fatura özeti
    const invoicesRes = await pool.query(`
      SELECT COUNT(*) AS invoice_count,
             COALESCE(SUM(total_amount), 0) AS total_invoiced,
             COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END), 0) AS total_paid,
             COUNT(*) FILTER (WHERE status IN ('sent','overdue')) AS open_invoices
      FROM invoices
      WHERE customer_id = $1 AND company_id = $2
    `, [customerId, company_id]);

    // Çek özeti — ödenen (tahsil edilen) çekler müşterinin ödemesi sayılır
    const chequesRes = await pool.query(`
      SELECT COUNT(*) FILTER (WHERE status='paid') AS paid_cheque_count,
             COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END), 0) AS cheque_paid
      FROM cheques
      WHERE customer_id = $1 AND company_id = $2
    `, [customerId, company_id]);

    const o = ordersRes.rows[0];
    const i = invoicesRes.rows[0];
    const ch = chequesRes.rows[0];
    const totalPaid = parseFloat(i.total_paid) + parseFloat(ch.cheque_paid);
    // Borç (bakiye) = toplam satış (sipariş) − toplam ödeme
    const outstanding = parseFloat(o.total_sales) - totalPaid;

    res.json(formatSuccess({
      customer: customerRes.rows[0],
      summary: {
        total_sales:      parseFloat(o.total_sales),
        order_count:      parseInt(o.order_count),
        pending_orders:   parseInt(o.pending_count),
        completed_orders: parseInt(o.completed_count),
        total_invoiced:   parseFloat(i.total_invoiced),
        total_paid:       totalPaid,
        cheque_paid:      parseFloat(ch.cheque_paid),
        paid_cheque_count: parseInt(ch.paid_cheque_count),
        outstanding_balance: outstanding,
        invoice_count:    parseInt(i.invoice_count),
        open_invoices:    parseInt(i.open_invoices),
      },
    }, 'Müşteri cari hesap detayı'));

  } catch (error) {
    console.error('getAccountDetail error:', error);
    res.status(500).json(formatError('Hesap detayı yüklenemedi', null, 'SERVER_ERROR'));
  }
};

/**
 * GET /api/current-accounts/:customerId/transactions
 * Müşterinin tüm hareketleri (siparişler + faturalar, tarih sıralı)
 */
const getTransactions = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { customerId } = req.params;
    const { page = 1, limit = 30, type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const typeFilter = type === 'order' ? "WHERE src = 'order'"
                     : type === 'invoice' ? "WHERE src = 'invoice'"
                     : type === 'cheque' ? "WHERE src = 'cheque'"
                     : '';

    const result = await pool.query(`
      SELECT * FROM (
        SELECT
          'order'          AS src,
          o.id,
          o.order_number   AS ref_number,
          o.created_at     AS date,
          o.total_amount   AS amount,
          o.status,
          NULL             AS invoice_status,
          o.status         AS display_status
        FROM orders o
        WHERE o.customer_id = $1 AND o.company_id = $2 AND o.status != 'cancelled'

        UNION ALL

        SELECT
          'invoice'         AS src,
          inv.id,
          inv.invoice_number AS ref_number,
          inv.issue_date     AS date,
          inv.total_amount   AS amount,
          inv.status,
          inv.status         AS invoice_status,
          inv.status         AS display_status
        FROM invoices inv
        WHERE inv.customer_id = $1 AND inv.company_id = $2

        UNION ALL

        SELECT
          'cheque'           AS src,
          ch.id,
          ch.check_serial_no AS ref_number,
          ch.due_date        AS date,
          ch.amount          AS amount,
          ch.status,
          NULL               AS invoice_status,
          ch.status          AS display_status
        FROM cheques ch
        WHERE ch.customer_id = $1 AND ch.company_id = $2
      ) combined
      ${typeFilter}
      ORDER BY date DESC
      LIMIT $3 OFFSET $4
    `, [customerId, company_id, parseInt(limit), offset]);

    res.json(formatSuccess({
      transactions: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit) },
    }, 'Müşteri hareketleri'));

  } catch (error) {
    console.error('getTransactions error:', error);
    res.status(500).json(formatError('Hareketler yüklenemedi', null, 'SERVER_ERROR'));
  }
};

module.exports = {
  getAccountList,
  getAccountSummary,
  getAccountDetail,
  getTransactions,
};
