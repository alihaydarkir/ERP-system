const pool = require('../config/database');
const { formatSuccess, formatError, formatPaginated } = require('../utils/formatters');
const { calculateOffset } = require('../utils/helpers');

// user rolü: yalnızca kendi girdiği havaleleri görür/siler (çek izolasyonuyla tutarlı)
const ownerFilter = (req) => (req.user.role === 'user' ? (req.user.id || req.user.userId) : null);

/** GET /api/bank-transfers */
const getAllBankTransfers = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { page = 1, limit = 50, customer_id } = req.query;
    const ownerId = ownerFilter(req);

    const where = ['bt.company_id = $1'];
    const values = [companyId];
    if (ownerId) { values.push(ownerId); where.push(`bt.user_id = $${values.length}`); }
    if (customer_id) { values.push(parseInt(customer_id)); where.push(`bt.customer_id = $${values.length}`); }

    const limitInt = parseInt(limit);
    const offset = calculateOffset(parseInt(page), limitInt);

    const listQuery = `
      SELECT bt.*, c.company_name AS customer_company_name, c.full_name AS customer_contact_name
      FROM bank_transfers bt
      LEFT JOIN customers c ON c.id = bt.customer_id
      WHERE ${where.join(' AND ')}
      ORDER BY bt.transfer_date DESC, bt.id DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    const countQuery = `SELECT COUNT(*) FROM bank_transfers bt WHERE ${where.join(' AND ')}`;

    const [listRes, countRes] = await Promise.all([
      pool.query(listQuery, [...values, limitInt, offset]),
      pool.query(countQuery, values),
    ]);

    res.json(formatPaginated(listRes.rows, parseInt(countRes.rows[0].count), parseInt(page), limitInt));
  } catch (error) {
    console.error('Get bank transfers error:', error);
    res.status(500).json(formatError('Banka havaleleri yüklenemedi'));
  }
};

/** POST /api/bank-transfers */
const createBankTransfer = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id || req.user.userId;
    const { customer_id, bank_name, receipt_no, transfer_date, amount, notes } = req.body;

    // Müşterinin bu şirkete ait olduğunu doğrula
    const cust = await pool.query('SELECT id FROM customers WHERE id = $1 AND company_id = $2', [customer_id, companyId]);
    if (cust.rows.length === 0) {
      return res.status(400).json(formatError('Geçersiz müşteri'));
    }

    const result = await pool.query(`
      INSERT INTO bank_transfers (company_id, user_id, customer_id, bank_name, receipt_no, transfer_date, amount, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [companyId, userId, customer_id, bank_name, receipt_no || null, transfer_date, amount, notes || null]);

    res.status(201).json(formatSuccess(result.rows[0], 'Banka havalesi kaydedildi'));
  } catch (error) {
    console.error('Create bank transfer error:', error);
    res.status(500).json(formatError('Banka havalesi kaydedilemedi'));
  }
};

/** DELETE /api/bank-transfers/:id */
const deleteBankTransfer = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;
    const ownerId = ownerFilter(req);

    const where = ['id = $1', 'company_id = $2'];
    const values = [id, companyId];
    if (ownerId) { values.push(ownerId); where.push(`user_id = $${values.length}`); }

    const result = await pool.query(`DELETE FROM bank_transfers WHERE ${where.join(' AND ')} RETURNING id`, values);
    if (result.rows.length === 0) {
      return res.status(404).json(formatError('Havale bulunamadı'));
    }
    res.json(formatSuccess(null, 'Banka havalesi silindi'));
  } catch (error) {
    console.error('Delete bank transfer error:', error);
    res.status(500).json(formatError('Banka havalesi silinemedi'));
  }
};

module.exports = { getAllBankTransfers, createBankTransfer, deleteBankTransfer };
