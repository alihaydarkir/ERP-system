const { Cheque, ChequeTransaction } = require('../models/Cheque');
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');
const ActivityLogService = require('../services/activityLogService');
const { formatSuccess, formatError, formatPaginated } = require('../utils/formatters');
const { getClientIP, calculateOffset } = require('../utils/helpers');

const normalizeChequeStatus = (status) => {
  const s = String(status || '').trim().toLowerCase();
  const statusMap = {
    beklemede: 'pending',
    pending: 'pending',
    odendi: 'paid',
    paid: 'paid',
    cleared: 'paid',
    iptal: 'cancelled',
    cancelled: 'cancelled',
    teminat: 'teminat',
    musteriye_verildi: 'musteriye_verildi'
  };
  return statusMap[s] || s;
};

const VALID_CHEQUE_STATUSES = ['pending', 'paid', 'cancelled', 'teminat', 'musteriye_verildi'];

/**
 * Get all cheques with filtering and pagination
 */
const getAllCheques = async (req, res) => {
  try {
    const {
      status,
      customer_id,
      bank_name,
      start_date,
      end_date,
      page = 1,
      limit = 50,
      sort_by = 'due_date',
      sort_order = 'ASC'
    } = req.query;

    const companyId = req.user.company_id;

    // Build filters
    const filters = {
      company_id: companyId,
      status,
      customer_id: customer_id ? parseInt(customer_id) : undefined,
      bank_name,
      start_date,
      end_date,
      limit: parseInt(limit),
      offset: calculateOffset(parseInt(page), parseInt(limit)),
      sort_by,
      sort_order
    };

    const cheques = await Cheque.findAll(filters);
    const total = await Cheque.count({ company_id: companyId, status, customer_id, bank_name, start_date, end_date });

    const result = formatPaginated(
      cheques,
      total,
      parseInt(page),
      parseInt(limit)
    );

    res.json(result);

  } catch (error) {
    console.error('Get all cheques error:', error);
    res.status(500).json(formatError('Failed to fetch cheques'));
  }
};

/**
 * Get cheque by ID
 */
const getChequeById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const cheque = await Cheque.findById(id, companyId);

    if (!cheque) {
      return res.status(404).json(formatError('Cheque not found'));
    }
    // Get transaction history
    const transactions = await ChequeTransaction.findByChequeId(id);

    res.json(formatSuccess({
      ...cheque,
      transactions
    }));

  } catch (error) {
    console.error('Get cheque by ID error:', error);
    res.status(500).json(formatError('Failed to fetch cheque'));
  }
};

/**
 * Create a new cheque
 */
const createCheque = async (req, res) => {
  try {
    const {
      check_serial_no,
      check_issuer,
      customer_id,
      bank_name,
      received_date,
      due_date,
      amount,
      currency,
      status,
      collateral_bank, // Teminat bankası
      given_to_customer_id, // Verilen müşteri
      notes
    } = req.body;

    const userId = req.user.id;
    const companyId = req.user.company_id;

    // Validation
    if (!check_serial_no || !check_issuer || !customer_id || !bank_name || !received_date || !due_date || !amount) {
      return res.status(400).json(formatError('Missing required fields'));
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json(formatError('Amount must be greater than 0'));
    }

    // Validate currency
    const validCurrencies = ['TRY', 'USD', 'EUR', 'GBP'];
    if (currency && !validCurrencies.includes(currency)) {
      return res.status(400).json(formatError(`Currency must be one of: ${validCurrencies.join(', ')}`));
    }

    // Validate status
    const chequeStatus = normalizeChequeStatus(status || 'pending');
    if (!VALID_CHEQUE_STATUSES.includes(chequeStatus)) {
      return res.status(400).json(formatError(`Status must be one of: ${VALID_CHEQUE_STATUSES.join(', ')}`));
    }

    // Teminat için banka adı gerekli
    if (chequeStatus === 'teminat' && !collateral_bank) {
      return res.status(400).json(formatError('Collateral bank name is required for teminat status'));
    }

    // Müşteriye verildi için müşteri ID gerekli
    if (chequeStatus === 'musteriye_verildi' && !given_to_customer_id) {
      return res.status(400).json(formatError('Customer ID is required for musteriye_verildi status'));
    }

    // Validate dates
    const receivedDateObj = new Date(received_date);
    const dueDateObj = new Date(due_date);

    if (dueDateObj <= receivedDateObj) {
      return res.status(400).json(formatError('Due date must be after received date'));
    }

    // Check if customer exists and belongs to user's company
    const customer = await Customer.findById(customer_id);
    if (!customer) {
      return res.status(404).json(formatError('Customer not found'));
    }

    // Check company ownership (multi-tenancy) - any user in same company can create cheques
    const userCompanyId = req.user.company_id;
    if (userCompanyId && customer.company_id &&
        customer.company_id !== userCompanyId &&
        req.user.role !== 'admin') {
      return res.status(403).json(formatError('Access denied to this customer'));
    }

    // Check for duplicate (same serial number + bank)
    const existingCheque = await Cheque.findBySerialAndBank(check_serial_no, bank_name, companyId);
    if (existingCheque) {
      return res.status(400).json(formatError('A cheque with this serial number and bank already exists'));
    }

    // Create cheque
    const cheque = await Cheque.create({
      user_id: userId,
      company_id: companyId,
      check_serial_no,
      check_issuer,
      customer_id,
      bank_name, // Çekin üzerindeki asıl banka
      collateral_bank, // Teminat olarak verildiği banka (varsa)
      received_date,
      due_date,
      amount,
      currency: currency || 'TRY',
      status: chequeStatus,
      given_to_customer_id: given_to_customer_id || null,
      notes
    });

    // Create initial transaction record
    await ChequeTransaction.create({
      cheque_id: cheque.id,
      company_id: companyId,
      old_status: null,
      new_status: chequeStatus,
      changed_by: userId,
      notes: status === 'teminat' ? `Teminat: ${collateral_bank}` : (status === 'musteriye_verildi' ? `Müşteri ID: ${given_to_customer_id}` : 'Cheque created'),
      ip_address: getClientIP(req)
    });

    // Log the action
    await AuditLog.create({
      user_id: userId,
      company_id: companyId,
      action: 'CREATE_CHEQUE',
      entity_type: 'cheque',
      entity_id: cheque.id,
      ip_address: getClientIP(req),
      changes: { check_serial_no, bank_name, amount, customer_id, status: chequeStatus }
    });

    // Log to activity logs
    await ActivityLogService.log(
      userId,
      'create_cheque',
      'cheques',
      { cheque_id: cheque.id, check_serial_no, bank_name, amount, currency: currency || 'TRY', customer_id, status: chequeStatus },
      req
    );

    res.status(201).json(formatSuccess(cheque));

  } catch (error) {
    console.error('Create cheque error:', error);
    res.status(500).json(formatError('Failed to create cheque'));
  }
};

/**
 * Update cheque
 */
const updateCheque = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const companyId = req.user.company_id;

    // Check if cheque exists and belongs to user
    const existingCheque = await Cheque.findById(id, companyId);
    if (!existingCheque) {
      return res.status(404).json(formatError('Cheque not found'));
    }

    const oldStatus = existingCheque.status;

    if (req.body.status !== undefined) {
      req.body.status = normalizeChequeStatus(req.body.status);
      if (!VALID_CHEQUE_STATUSES.includes(req.body.status)) {
        return res.status(400).json(formatError(`Status must be one of: ${VALID_CHEQUE_STATUSES.join(', ')}`));
      }
    }

    // Validate dates if provided
    const received_date = req.body.received_date || existingCheque.received_date;
    const due_date = req.body.due_date || existingCheque.due_date;

    const receivedDateObj = new Date(received_date);
    const dueDateObj = new Date(due_date);

    if (dueDateObj <= receivedDateObj) {
      return res.status(400).json(formatError('Due date must be after received date'));
    }

    // Validate amount if provided
    if (req.body.amount !== undefined && req.body.amount <= 0) {
      return res.status(400).json(formatError('Amount must be greater than 0'));
    }

    // Validate currency if provided
    if (req.body.currency) {
      const validCurrencies = ['TRY', 'USD', 'EUR', 'GBP'];
      if (!validCurrencies.includes(req.body.currency)) {
        return res.status(400).json(formatError(`Currency must be one of: ${validCurrencies.join(', ')}`));
      }
    }

    // If customer_id is being changed, validate it
    if (req.body.customer_id) {
      const customer = await Customer.findById(req.body.customer_id);
      if (!customer) {
        return res.status(404).json(formatError('Customer not found'));
      }

      if (companyId && customer.company_id && customer.company_id !== companyId && req.user.role !== 'admin') {
        return res.status(403).json(formatError('Access denied to this customer'));
      }
    }

    // Update cheque
    const updatedCheque = await Cheque.update(id, req.body, companyId);

    if (req.body.status && req.body.status !== oldStatus) {
      await ChequeTransaction.create({
        cheque_id: id,
        company_id: req.user.company_id,
        old_status: oldStatus,
        new_status: req.body.status,
        changed_by: userId,
        notes: req.body.notes || `Status changed from ${oldStatus} to ${req.body.status}`,
        ip_address: getClientIP(req)
      });
    }

    // Log the action
    await AuditLog.create({
      user_id: userId,
      company_id: req.user.company_id,
      action: 'UPDATE_CHEQUE',
      entity_type: 'cheque',
      entity_id: id,
      ip_address: getClientIP(req),
      changes: req.body
    });

    // Log to activity logs
    await ActivityLogService.log(
      userId,
      'update_cheque',
      'cheques',
      { cheque_id: id, updates: req.body },
      req
    );

    res.json(formatSuccess(updatedCheque));

  } catch (error) {
    console.error('Update cheque error:', error);
    res.status(500).json(formatError('Failed to update cheque'));
  }
};

/**
 * Change cheque status
 */
const changeChequeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;
    const companyId = req.user.company_id;

    // Validate status
    const normalizedStatus = normalizeChequeStatus(status);
    if (!normalizedStatus || !VALID_CHEQUE_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json(formatError(`Status must be one of: ${VALID_CHEQUE_STATUSES.join(', ')}`));
    }

    // Check if cheque exists and belongs to user
    const existingCheque = await Cheque.findById(id, companyId);
    if (!existingCheque) {
      return res.status(404).json(formatError('Cheque not found'));
    }

    const oldStatus = existingCheque.status;

    // Update status
    const updatedCheque = await Cheque.updateStatus(id, normalizedStatus, companyId);

    // Create transaction record
    await ChequeTransaction.create({
      cheque_id: id,
      company_id: req.user.company_id,
      old_status: oldStatus,
      new_status: normalizedStatus,
      changed_by: userId,
      notes: notes || `Status changed from ${oldStatus} to ${normalizedStatus}`,
      ip_address: getClientIP(req)
    });

    // Log the action
    await AuditLog.create({
      user_id: userId,
      company_id: req.user.company_id,
      action: 'CHANGE_CHEQUE_STATUS',
      entity_type: 'cheque',
      entity_id: id,
      ip_address: getClientIP(req),
      changes: { old_status: oldStatus, new_status: normalizedStatus, notes }
    });

    // Log to activity logs
    await ActivityLogService.log(
      userId,
      'change_cheque_status',
      'cheques',
      { cheque_id: id, old_status: oldStatus, new_status: normalizedStatus, notes },
      req
    );

    res.json(formatSuccess(updatedCheque));

  } catch (error) {
    console.error('Change cheque status error:', error);
    res.status(500).json(formatError('Failed to change cheque status'));
  }
};

/**
 * Delete cheque
 */
const deleteCheque = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const companyId = req.user.company_id;

    // Check if cheque exists and belongs to user
    const existingCheque = await Cheque.findById(id, companyId);
    if (!existingCheque) {
      return res.status(404).json(formatError('Cheque not found'));
    }

    // Only allow deletion of pending or cancelled cheques
    if (['paid', 'odendi', 'cleared'].includes(existingCheque.status) && req.user.role !== 'admin') {
      return res.status(403).json(formatError('Cannot delete paid cheques'));
    }

    // Delete cheque
    await Cheque.delete(id, companyId);

    // Log the action
    await AuditLog.create({
      user_id: userId,
      company_id: req.user.company_id,
      action: 'DELETE_CHEQUE',
      entity_type: 'cheque',
      entity_id: id,
      ip_address: getClientIP(req),
      changes: { check_serial_no: existingCheque.check_serial_no, bank_name: existingCheque.bank_name }
    });

    // Log to activity logs
    await ActivityLogService.log(
      userId,
      'delete_cheque',
      'cheques',
      { cheque_id: id, check_serial_no: existingCheque.check_serial_no, bank_name: existingCheque.bank_name },
      req
    );

    res.json(formatSuccess({ message: 'Cheque deleted successfully' }));

  } catch (error) {
    console.error('Delete cheque error:', error);
    res.status(500).json(formatError('Failed to delete cheque'));
  }
};

/**
 * Get cheques due soon (within 7 days)
 */
const getDueSoonCheques = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const days = req.query.days ? parseInt(req.query.days) : 7;

    const dueSoonCheques = await Cheque.getDueSoon(companyId, days);
    const overdueCheques = await Cheque.getOverdue(companyId);

    const totalDueSoonAmount = dueSoonCheques.reduce((sum, cheque) => sum + parseFloat(cheque.amount), 0);
    const totalOverdueAmount = overdueCheques.reduce((sum, cheque) => sum + parseFloat(cheque.amount), 0);

    res.json(formatSuccess({
      dueSoon: dueSoonCheques,
      overdue: overdueCheques,
      totalDueSoonAmount,
      totalOverdueAmount
    }));

  } catch (error) {
    console.error('Get due soon cheques error:', error);
    res.status(500).json(formatError('Failed to fetch due soon cheques'));
  }
};

/**
 * Get cheque statistics
 */
const getChequeStatistics = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const stats = await Cheque.getStatistics(companyId);

    // Convert string numbers to floats for amounts
    const formattedStats = {
      totalCheques: parseInt(stats.total_cheques) || 0,
      pendingCount: parseInt(stats.pending_count) || 0,
      paidCount: parseInt(stats.paid_count) || 0,
      teminatCount: parseInt(stats.teminat_count) || 0,
      musteriyeVerildiCount: parseInt(stats.musteriye_verildi_count) || 0,
      cancelledCount: parseInt(stats.cancelled_count) || 0,
      pendingAmount: parseFloat(stats.pending_amount) || 0,
      paidAmount: parseFloat(stats.paid_amount) || 0,
      teminatAmount: parseFloat(stats.teminat_amount) || 0,
      musteriyeVerildiAmount: parseFloat(stats.musteriye_verildi_amount) || 0,
      cancelledAmount: parseFloat(stats.cancelled_amount) || 0,
      dueSoonCount: parseInt(stats.due_soon_count) || 0,
      dueSoonAmount: parseFloat(stats.due_soon_amount) || 0,
      overdueCount: parseInt(stats.overdue_count) || 0,
      overdueAmount: parseFloat(stats.overdue_amount) || 0
    };

    res.json(formatSuccess(formattedStats));

  } catch (error) {
    console.error('Get cheque statistics error:', error);
    res.status(500).json(formatError('Failed to fetch cheque statistics'));
  }
};

module.exports = {
  getAllCheques,
  getChequeById,
  createCheque,
  updateCheque,
  changeChequeStatus,
  deleteCheque,
  getDueSoonCheques,
  getChequeStatistics
};
