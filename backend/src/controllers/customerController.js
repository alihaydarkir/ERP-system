const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');
const ActivityLogService = require('../services/activityLogService');
const { formatSuccess, formatError, formatPaginated } = require('../utils/formatters');
const { getClientIP, calculateOffset } = require('../utils/helpers');

/**
 * Get all customers
 */
const getAllCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 50, offset } = req.query;
    const { company_id } = req.user; // MULTI-TENANCY

    // Build filters
    const filters = {
      company_id, // MULTI-TENANCY
      search,
      limit: parseInt(limit),
      offset: offset ? parseInt(offset) : calculateOffset(parseInt(page), parseInt(limit))
    };

    const customers = await Customer.findAll(filters);
    const total = await Customer.count({ company_id, search });

    const result = formatPaginated(
      customers,
      total,
      parseInt(page),
      parseInt(limit)
    );

    res.json(result);

  } catch (error) {
    console.error('Get all customers error:', error);
    res.status(500).json(formatError('Failed to fetch customers'));
  }
};

/**
 * Get customer by ID
 */
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;

    const customer = await Customer.findById(id, company_id);

    if (!customer) {
      return res.status(404).json(formatError('Customer not found'));
    }

    res.json(formatSuccess(customer));

  } catch (error) {
    console.error('Get customer by ID error:', error);
    res.status(500).json(formatError('Failed to fetch customer'));
  }
};

/**
 * Create a new customer
 */
const createCustomer = async (req, res) => {
  try {
    const { full_name, company_name, tax_office, tax_number, phone_number, company_location } = req.body;
    const userId = req.user.id;
    const { company_id } = req.user; // MULTI-TENANCY

    // Check if customer with same tax number already exists for this company
    const existingCustomer = await Customer.findByTaxNumber(tax_number, company_id);
    if (existingCustomer) {
      return res.status(400).json(formatError('A customer with this tax number already exists'));
    }

    // Create customer
    const customer = await Customer.create({
      user_id: userId,
      full_name,
      company_name,
      tax_office,
      tax_number,
      phone_number,
      company_location,
      company_id // MULTI-TENANCY
    });

    // Log the action
    await AuditLog.create({
      user_id: userId,
      action: 'CREATE_CUSTOMER',
      entity_type: 'customer',
      entity_id: customer.id,
      ip_address: getClientIP(req),
      user_agent: req.get('user-agent'),
      details: { company_name, tax_number },
      company_id // MULTI-TENANCY
    });

    // Log to activity logs
    await ActivityLogService.log(
      userId,
      'create_customer',
      'customers',
      { customer_id: customer.id, company_name, tax_number, full_name },
      req
    );

    res.status(201).json(formatSuccess(customer, 'Customer created successfully'));

  } catch (error) {
    console.error('Create customer error:', error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json(formatError('Customer with this tax number already exists'));
    }

    res.status(500).json(formatError('Failed to create customer'));
  }
};

/**
 * Update customer
 */
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { company_id } = req.user;
    const updateData = req.body;

    // Check if customer exists
    const existingCustomer = await Customer.findById(id, company_id);
    if (!existingCustomer) {
      return res.status(404).json(formatError('Customer not found'));
    }

    // If tax number is being updated, check uniqueness
    if (updateData.tax_number && updateData.tax_number !== existingCustomer.tax_number) {
      const duplicateCustomer = await Customer.findByTaxNumber(updateData.tax_number, company_id);
      if (duplicateCustomer) {
        return res.status(400).json(formatError('A customer with this tax number already exists'));
      }
    }

    // Update customer
    const customer = await Customer.update(id, updateData, company_id);

    // Log the action
    await AuditLog.create({
      user_id: userId,
      action: 'UPDATE_CUSTOMER',
      entity_type: 'customer',
      entity_id: id,
      ip_address: getClientIP(req),
      user_agent: req.get('user-agent'),
      details: { updated_fields: Object.keys(updateData) },
      company_id
    });

    // Log to activity logs
    await ActivityLogService.log(
      userId,
      'update_customer',
      'customers',
      { customer_id: id, updated_fields: Object.keys(updateData), updates: updateData },
      req
    );

    res.json(formatSuccess(customer, 'Customer updated successfully'));

  } catch (error) {
    console.error('Update customer error:', error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json(formatError('Customer with this tax number already exists'));
    }

    res.status(500).json(formatError('Failed to update customer'));
  }
};

/**
 * Delete customer
 */
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { company_id } = req.user;

    // Check if customer exists
    const customer = await Customer.findById(id, company_id);
    if (!customer) {
      return res.status(404).json(formatError('Customer not found'));
    }

    // Delete customer
    await Customer.delete(id, company_id);

    // Log the action
    await AuditLog.create({
      user_id: userId,
      action: 'DELETE_CUSTOMER',
      entity_type: 'customer',
      entity_id: id,
      ip_address: getClientIP(req),
      user_agent: req.get('user-agent'),
      details: { company_name: customer.company_name, tax_number: customer.tax_number },
      company_id
    });

    // Log to activity logs
    await ActivityLogService.log(
      userId,
      'delete_customer',
      'customers',
      { customer_id: id, company_name: customer.company_name, tax_number: customer.tax_number },
      req
    );

    res.json(formatSuccess(null, 'Customer deleted successfully'));

  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json(formatError('Failed to delete customer'));
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
};
