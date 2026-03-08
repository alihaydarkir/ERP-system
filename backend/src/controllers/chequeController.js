const { Cheque, ChequeTransaction } = require('../models/Cheque');
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');
const ActivityLogService = require('../services/activityLogService');
const { formatSuccess, formatError, formatPaginated } = require('../utils/formatters');
const { getClientIP, calculateOffset } = require('../utils/helpers');

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

    const userId = req.user.id;

    // Build filters
    const filters = {
      user_id: userId,
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
    const total = await Cheque.count({ user_id: userId, status, customer_id, bank_name, start_date, end_date });

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
    const userId = req.user.id;

    const cheque = await Cheque.findById(id);

    if (!cheque) {
      return res.status(404).json(formatError('Cheque not found'));
    }

    // Check if cheque belongs to user
    if (cheque.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json(formatError('Access denied'));
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
    const validStatuses = ['pending', 'paid', 'cancelled', 'teminat', 'musteriye_verildi'];
    const chequeStatus = status || 'pending';
    if (!validStatuses.includes(chequeStatus)) {
      return res.status(400).json(formatError(`Status must be one of: ${validStatuses.join(', ')}`));
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

    // Check if customer exists and belongs to user
    const customer = await Customer.findById(customer_id);
    if (!customer) {
      return res.status(404).json(formatError('Customer not found'));
    }

    if (customer.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json(formatError('Access denied to this customer'));
    }

    // Check for duplicate (same serial number + bank)
    const existingCheque = await Cheque.findBySerialAndBank(check_serial_no, bank_name);
    if (existingCheque) {
      return res.status(400).json(formatError('A cheque with this serial number and bank already exists'));
    }

    // Create cheque
    const cheque = await Cheque.create({
      user_id: userId,
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
      old_status: null,
      new_status: chequeStatus,
      changed_by: userId,
      notes: status === 'teminat' ? `Teminat: ${collateral_bank}` : (status === 'musteriye_verildi' ? `Müşteri ID: ${given_to_customer_id}` : 'Cheque created'),
      ip_address: getClientIP(req)
    });

    // Log the action
    await AuditLog.create({
      user_id: userId,
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

    // Check if cheque exists and belongs to user
    const existingCheque = await Cheque.findById(id);
    if (!existingCheque) {
      return res.status(404).json(formatError('Cheque not found'));
    }

    if (existingCheque.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json(formatError('Access denied'));
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

      if (customer.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json(formatError('Access denied to this customer'));
      }
    }

    // Update cheque
    const updatedCheque = await Cheque.update(id, req.body);

    // Log the action
    await AuditLog.create({
      user_id: userId,
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

    // Validate status
    const validStatuses = ['pending', 'cleared', 'bounced', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json(formatError(`Status must be one of: ${validStatuses.join(', ')}`));
    }

    // Check if cheque exists and belongs to user
    const existingCheque = await Cheque.findById(id);
    if (!existingCheque) {
      return res.status(404).json(formatError('Cheque not found'));
    }

    if (existingCheque.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json(formatError('Access denied'));
    }

    const oldStatus = existingCheque.status;

    // Prevent certain status changes (business logic)
    if (oldStatus === 'cleared' && status !== 'cleared') {
      // Only admin can change from cleared status
      if (req.user.role !== 'admin') {
        return res.status(403).json(formatError('Only admin can change cleared cheques'));
      }
    }

    // Update status
    const updatedCheque = await Cheque.updateStatus(id, status);

    // Create transaction record
    await ChequeTransaction.create({
      cheque_id: id,
      old_status: oldStatus,
      new_status: status,
      changed_by: userId,
      notes: notes || `Status changed from ${oldStatus} to ${status}`,
      ip_address: getClientIP(req)
    });

    // Log the action
    await AuditLog.create({
      user_id: userId,
      action: 'CHANGE_CHEQUE_STATUS',
      entity_type: 'cheque',
      entity_id: id,
      ip_address: getClientIP(req),
      changes: { old_status: oldStatus, new_status: status, notes }
    });

    // Log to activity logs
    await ActivityLogService.log(
      userId,
      'change_cheque_status',
      'cheques',
      { cheque_id: id, old_status: oldStatus, new_status: status, notes },
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

    // Check if cheque exists and belongs to user
    const existingCheque = await Cheque.findById(id);
    if (!existingCheque) {
      return res.status(404).json(formatError('Cheque not found'));
    }

    if (existingCheque.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json(formatError('Access denied'));
    }

    // Only allow deletion of pending or cancelled cheques
    if (existingCheque.status === 'cleared' && req.user.role !== 'admin') {
      return res.status(403).json(formatError('Cannot delete cleared cheques'));
    }

    // Delete cheque
    await Cheque.delete(id);

    // Log the action
    await AuditLog.create({
      user_id: userId,
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
    const userId = req.user.id;
    const days = req.query.days ? parseInt(req.query.days) : 7;

    const dueSoonCheques = await Cheque.getDueSoon(userId, days);
    const overdueCheques = await Cheque.getOverdue(userId);

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
    const userId = req.user.id;

    const stats = await Cheque.getStatistics(userId);

    // Convert string numbers to floats for amounts
    const formattedStats = {
      totalCheques: parseInt(stats.total_cheques) || 0,
      pendingCount: parseInt(stats.pending_count) || 0,
      clearedCount: parseInt(stats.cleared_count) || 0,
      bouncedCount: parseInt(stats.bounced_count) || 0,
      cancelledCount: parseInt(stats.cancelled_count) || 0,
      pendingAmount: parseFloat(stats.pending_amount) || 0,
      clearedAmount: parseFloat(stats.cleared_amount) || 0,
      bouncedAmount: parseFloat(stats.bounced_amount) || 0,
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
