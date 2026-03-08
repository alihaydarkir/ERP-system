const db = require('../config/database');

/**
 * Get all suppliers with pagination and filters
 */
const getAllSuppliers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, is_active } = req.query;
    const { company_id } = req.user; // MULTI-TENANCY
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM suppliers WHERE company_id = $1';
    const params = [company_id]; // MULTI-TENANCY
    let paramCount = 2;

    // Search filter
    if (search) {
      query += ` AND (supplier_name ILIKE $${paramCount} OR contact_person ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Active filter
    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    // Count total
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add sorting and pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ success: false, message: 'Tedarikçiler getirilirken hata oluştu' });
  }
};

/**
 * Get single supplier by ID
 */
const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM suppliers WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tedarikçi bulunamadı' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ success: false, message: 'Tedarikçi getirilirken hata oluştu' });
  }
};

/**
 * Create new supplier
 */
const createSupplier = async (req, res) => {
  try {
    const {
      supplier_name,
      contact_person,
      email,
      phone,
      address,
      tax_office,
      tax_number,
      iban,
      payment_terms,
      currency,
      notes,
      rating
    } = req.body;

    const userId = req.user.id;
    const { company_id } = req.user; // MULTI-TENANCY

    // Check if tax number already exists IN THIS COMPANY
    if (tax_number) {
      const existing = await db.query('SELECT id FROM suppliers WHERE tax_number = $1 AND company_id = $2', [tax_number, company_id]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Bu vergi numarası zaten kayıtlı' });
      }
    }

    const result = await db.query(
      `INSERT INTO suppliers 
       (supplier_name, contact_person, email, phone, address, tax_office, tax_number, 
        iban, payment_terms, currency, notes, rating, created_by, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [supplier_name, contact_person, email, phone, address, tax_office, tax_number, 
       iban, payment_terms || 'Net 30', currency || 'TRY', notes, rating, userId, company_id]
    );

    console.log(`Supplier created: ${supplier_name} (${result.rows[0].id}) by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Tedarikçi başarıyla oluşturuldu',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ success: false, message: 'Tedarikçi oluşturulurken hata oluştu' });
  }
};

/**
 * Update supplier
 */
const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      supplier_name,
      contact_person,
      email,
      phone,
      address,
      tax_office,
      tax_number,
      iban,
      payment_terms,
      currency,
      notes,
      rating,
      is_active
    } = req.body;

    // Check if supplier exists
    const existing = await db.query('SELECT * FROM suppliers WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tedarikçi bulunamadı' });
    }

    // Check if tax number is being changed and if it's already in use
    if (tax_number && tax_number !== existing.rows[0].tax_number) {
      const taxCheck = await db.query('SELECT id FROM suppliers WHERE tax_number = $1 AND id != $2', [tax_number, id]);
      if (taxCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Bu vergi numarası zaten kayıtlı' });
      }
    }

    const result = await db.query(
      `UPDATE suppliers 
       SET supplier_name = COALESCE($1, supplier_name),
           contact_person = COALESCE($2, contact_person),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           address = COALESCE($5, address),
           tax_office = COALESCE($6, tax_office),
           tax_number = COALESCE($7, tax_number),
           iban = COALESCE($8, iban),
           payment_terms = COALESCE($9, payment_terms),
           currency = COALESCE($10, currency),
           notes = COALESCE($11, notes),
           rating = COALESCE($12, rating),
           is_active = COALESCE($13, is_active)
       WHERE id = $14
       RETURNING *`,
      [supplier_name, contact_person, email, phone, address, tax_office, tax_number,
       iban, payment_terms, currency, notes, rating, is_active, id]
    );

    console.log(`Supplier updated: ${result.rows[0].supplier_name} (${id}) by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Tedarikçi başarıyla güncellendi',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ success: false, message: 'Tedarikçi güncellenirken hata oluştu' });
  }
};

/**
 * Delete supplier
 */
const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if supplier exists
    const existing = await db.query('SELECT * FROM suppliers WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tedarikçi bulunamadı' });
    }

    await db.query('DELETE FROM suppliers WHERE id = $1', [id]);

    console.log(`Supplier deleted: ${existing.rows[0].supplier_name} (${id}) by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Tedarikçi başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ success: false, message: 'Tedarikçi silinirken hata oluştu' });
  }
};

/**
 * Search suppliers
 */
const searchSuppliers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Arama terimi gerekli' });
    }

    const result = await db.query(
      `SELECT * FROM suppliers 
       WHERE (supplier_name ILIKE $1 OR contact_person ILIKE $1 OR email ILIKE $1)
       AND is_active = true
       ORDER BY supplier_name
       LIMIT 50`,
      [`%${q}%`]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Search suppliers error:', error);
    res.status(500).json({ success: false, message: 'Arama sırasında hata oluştu' });
  }
};

/**
 * Get supplier statistics
 */
const getSupplierStats = async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_suppliers,
        COUNT(*) FILTER (WHERE is_active = true) as active_suppliers,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_suppliers,
        ROUND(AVG(rating), 2) as average_rating
      FROM suppliers
    `);

    res.json({
      success: true,
      data: stats.rows[0]
    });
  } catch (error) {
    console.error('Get supplier stats error:', error);
    res.status(500).json({ success: false, message: 'İstatistikler alınırken hata oluştu' });
  }
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  searchSuppliers,
  getSupplierStats
};
