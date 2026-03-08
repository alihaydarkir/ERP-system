const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const ActivityLogService = require('../services/activityLogService');
const { formatSuccess, formatError, formatPaginated } = require('../utils/formatters');
const { calculateOffset } = require('../utils/helpers');

/**
 * Get all invoices
 */
const getAllInvoices = async (req, res) => {
  try {
    const { status, customer_id, search, page = 1, limit = 20 } = req.query;
    const { company_id } = req.user;

    const filters = {
      company_id,
      status,
      customer_id: customer_id ? parseInt(customer_id) : undefined,
      search,
      limit: parseInt(limit),
      offset: calculateOffset(parseInt(page), parseInt(limit))
    };

    const [invoices, total] = await Promise.all([
      Invoice.findAll(filters),
      Invoice.count({ company_id, status, customer_id, search })
    ]);

    // Auto-mark overdue invoices
    await Invoice.markOverdue(company_id);

    res.json(formatPaginated(invoices, total, parseInt(page), parseInt(limit)));
  } catch (error) {
    console.error('Get all invoices error:', error);
    res.status(500).json(formatError('Faturalar yüklenirken hata oluştu'));
  }
};

/**
 * Get invoice by ID
 */
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;

    const invoice = await Invoice.findById(parseInt(id), company_id);
    if (!invoice) {
      return res.status(404).json(formatError('Fatura bulunamadı'));
    }

    res.json(formatSuccess(invoice));
  } catch (error) {
    console.error('Get invoice by ID error:', error);
    res.status(500).json(formatError('Fatura yüklenirken hata oluştu'));
  }
};

/**
 * Get invoice stats
 */
const getInvoiceStats = async (req, res) => {
  try {
    const { company_id } = req.user;
    const stats = await Invoice.getStats(company_id);
    res.json(formatSuccess(stats));
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json(formatError('İstatistikler yüklenirken hata oluştu'));
  }
};

/**
 * Create invoice (optionally from an order)
 */
const createInvoice = async (req, res) => {
  try {
    const {
      customer_id, order_id, items,
      subtotal, tax_rate, tax_amount, discount_amount, total_amount,
      issue_date, due_date, notes, status
    } = req.body;
    const { company_id, id: user_id } = req.user;

    // If creating from an order, validate the order belongs to company
    if (order_id) {
      const order = await Order.findById(order_id, company_id);
      if (!order) {
        return res.status(404).json(formatError('Sipariş bulunamadı'));
      }
    }

    const invoice = await Invoice.create({
      user_id,
      customer_id,
      order_id,
      items,
      subtotal,
      tax_rate,
      tax_amount,
      discount_amount,
      total_amount,
      issue_date,
      due_date,
      notes,
      status,
      company_id
    });

    await ActivityLogService.log(user_id, 'create_invoice', 'invoices', { invoice_number: invoice.invoice_number, total_amount });

    res.status(201).json(formatSuccess(invoice, 'Fatura başarıyla oluşturuldu'));
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json(formatError('Fatura oluşturulurken hata oluştu'));
  }
};

/**
 * Update invoice status or details
 */
const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id, id: user_id } = req.user;
    const data = req.body;

    // If marking as paid, set paid_date
    if (data.status === 'paid' && !data.paid_date) {
      data.paid_date = new Date().toISOString().split('T')[0];
    }

    const invoice = await Invoice.update(parseInt(id), company_id, data);
    if (!invoice) {
      return res.status(404).json(formatError('Fatura bulunamadı'));
    }

    await ActivityLogService.log(user_id, 'update_invoice', 'invoices', { invoice_id: invoice.id, changes: data });

    res.json(formatSuccess(invoice, 'Fatura güncellendi'));
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json(formatError('Fatura güncellenirken hata oluştu'));
  }
};

/**
 * Delete invoice
 */
const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id, id: user_id } = req.user;

    const deleted = await Invoice.delete(parseInt(id), company_id);
    if (!deleted) {
      return res.status(404).json(formatError('Fatura bulunamadı'));
    }

    await ActivityLogService.log(user_id, 'delete_invoice', 'invoices', { invoice_id: parseInt(id) });

    res.json(formatSuccess(null, 'Fatura silindi'));
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json(formatError('Fatura silinirken hata oluştu'));
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  getInvoiceStats,
  createInvoice,
  updateInvoice,
  deleteInvoice
};
