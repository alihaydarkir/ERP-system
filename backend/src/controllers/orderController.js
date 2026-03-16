const Order = require('../models/Order');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ActivityLogService = require('../services/activityLogService');
const emailService = require('../services/emailService');
const cacheService = require('../services/cacheService');
const { formatOrder, formatOrders, formatSuccess, formatError, formatPaginated } = require('../utils/formatters');
const { getClientIP, calculateOffset } = require('../utils/helpers');
const { ORDER_STATUS, isValidStatusTransition, getNextStatuses } = require('../constants/orderStatus');

/**
 * Get all orders
 */
const getAllOrders = async (req, res) => {
  try {
    const { status, start_date, end_date, page = 1, limit = 20 } = req.query;
    const { company_id } = req.user; // MULTI-TENANCY

    console.log('🔍 getAllOrders called:', { company_id, user_id: req.user.userId, status });

    // Build filters
    const filters = {
      company_id, // MULTI-TENANCY
      status,
      start_date: start_date ? new Date(start_date) : undefined,
      end_date: end_date ? new Date(end_date) : undefined,
      limit: parseInt(limit),
      offset: calculateOffset(parseInt(page), parseInt(limit))
    };

    const orders = await Order.findAll(filters);
    const total = await Order.count({ company_id, status });

    console.log('📊 Orders found:', orders.length, 'Total:', total);

    const result = formatPaginated(
      formatOrders(orders),
      total,
      parseInt(page),
      parseInt(limit)
    );

    res.json(result);

  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json(formatError('Failed to fetch orders'));
  }
};

/**
 * Get order by ID
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user; // MULTI-TENANCY

    const order = await Order.findById(id, company_id); // MULTI-TENANCY

    if (!order) {
      return res.status(404).json(formatError('Order not found'));
    }

    res.json(formatSuccess(formatOrder(order)));

  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json(formatError('Failed to fetch order'));
  }
};

/**
 * Create new order
 */
const createOrder = async (req, res) => {
  try {
    const { customer_id, items, total_amount, status = 'pending' } = req.body;

    // Get user from auth middleware
    const user_id = req.user.id;

    // Validate user exists
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json(formatError('User not found'));
    }

    const order = await Order.create({
      user_id,
      customer_id,
      items,
      total_amount,
      status,
      company_id: req.user.company_id // MULTI-TENANCY
    });

    // Log activity
    await AuditLog.create({
      user_id: req.user.userId,
      action: 'CREATE',
      entity_type: 'order',
      entity_id: order.id,
      changes: { order_id: order.id, total_amount, items_count: items.length },
      ip_address: getClientIP(req),
      company_id: req.user.company_id // MULTI-TENANCY
    });

    // Log to activity logs
    await ActivityLogService.log(
      req.user.userId,
      'create_order',
      'orders',
      { order_id: order.id, customer_id, total_amount, items_count: items.length, status },
      req
    );

    // Send order confirmation email
    emailService.sendOrderConfirmationEmail(order, user).catch(err =>
      console.error('Order confirmation email error:', err)
    );

    // Invalidate cache
    await cacheService.invalidateOrderCache();

    console.log(`Order created: #${order.id} by user ${user_id}`);

    res.status(201).json(formatSuccess(formatOrder(order), 'Order created'));

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json(formatError(error.message || 'Failed to create order'));
  }
};

/**
 * Update order
 */
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user; // MULTI-TENANCY
    const updates = req.body;

    // First check if order belongs to this company
    const existingOrder = await Order.findById(id, company_id);
    if (!existingOrder) {
      return res.status(404).json(formatError('Order not found'));
    }

    const order = await Order.update(id, updates);

    if (!order) {
      return res.status(404).json(formatError('Order not found'));
    }

    // Log activity
    await AuditLog.create({
      user_id: req.user.userId,
      action: 'UPDATE',
      entity_type: 'order',
      entity_id: id,
      changes: updates,
      ip_address: getClientIP(req),
      company_id // MULTI-TENANCY
    });

    // Log to activity logs
    await ActivityLogService.log(
      req.user.userId,
      'update_order',
      'orders',
      { order_id: id, updates },
      req
    );

    // Invalidate cache
    await cacheService.invalidateOrderCache();

    console.log(`Order updated: #${id} by user ${req.user.userId}`);

    res.json(formatSuccess(formatOrder(order), 'Order updated'));

  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json(formatError('Failed to update order'));
  }
};

/**
 * Delete order
 */
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user; // MULTI-TENANCY

    const order = await Order.findById(id, company_id); // MULTI-TENANCY
    if (!order) {
      return res.status(404).json(formatError('Order not found'));
    }

    await Order.delete(id);

    // Log activity
    await AuditLog.create({
      user_id: req.user.userId,
      action: 'DELETE',
      entity_type: 'order',
      entity_id: id,
      changes: { deleted_order: id },
      ip_address: getClientIP(req),
      company_id // MULTI-TENANCY
    });

    // Log to activity logs
    await ActivityLogService.log(
      req.user.userId,
      'delete_order',
      'orders',
      { order_id: id },
      req
    );

    // Invalidate cache
    await cacheService.invalidateOrderCache();

    console.log(`Order deleted: #${id} by user ${req.user.userId}`);

    res.json(formatSuccess(null, 'Order deleted'));

  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json(formatError('Failed to delete order'));
  }
};

/**
 * Update order status
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { company_id } = req.user;

    // Validate status
    if (!Object.values(ORDER_STATUS).includes(status)) {
      return res.status(400).json(formatError(`Invalid status. Allowed: ${Object.values(ORDER_STATUS).join(', ')}`));
    }

    // Get current order
    const order = await Order.findById(id, company_id);
    if (!order) {
      return res.status(404).json(formatError('Order not found'));
    }

    // Check if status transition is valid
    if (!isValidStatusTransition(order.status, status)) {
      const nextStatuses = getNextStatuses(order.status);
      return res.status(400).json(
        formatError(`Cannot change status from '${order.status}' to '${status}'. Allowed: ${nextStatuses.join(', ') || 'none (final state)'}`)
      );
    }

    // Update status
    const updatedOrder = await Order.updateStatus(id, status, company_id);

    // Log activity
    await AuditLog.create({
      user_id: req.user.userId,
      action: 'UPDATE_STATUS',
      entity_type: 'order',
      entity_id: id,
      changes: { old_status: order.status, new_status: status },
      ip_address: getClientIP(req)
    });

    // Invalidate cache
    await cacheService.invalidateOrderCache();

    // Send status update email
    const user = await User.findById(order.user_id);
    emailService.sendOrderStatusUpdateEmail(updatedOrder, user, status).catch(err =>
      console.error('Order status update email error:', err)
    );

    console.log(`Order #${id} status updated: ${order.status} → ${status}`);

    res.json(formatSuccess(formatOrder(updatedOrder), 'Order status updated'));

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json(formatError('Failed to update order status'));
  }
};

/**
 * Cancel order (restore stock)
 */
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { company_id } = req.user;

    // Get current order
    const order = await Order.findById(id, company_id);
    if (!order) {
      return res.status(404).json(formatError('Order not found'));
    }

    // Check if order can be cancelled
    if (!isValidStatusTransition(order.status, ORDER_STATUS.CANCELLED)) {
      return res.status(400).json(
        formatError(`Cannot cancel order with status '${order.status}'. Order is already in final state.`)
      );
    }

    // Cancel order (will restore stock automatically)
    const cancelledOrder = await Order.cancel(id, company_id);

    // Log activity
    await AuditLog.create({
      user_id: req.user.userId,
      action: 'CANCEL',
      entity_type: 'order',
      entity_id: id,
      changes: { old_status: order.status, new_status: ORDER_STATUS.CANCELLED, reason },
      ip_address: getClientIP(req)
    });

    // Invalidate cache
    await cacheService.invalidateOrderCache();

    // Send cancellation email
    const user = await User.findById(order.user_id);
    emailService.sendOrderCancellationEmail(cancelledOrder, user, reason).catch(err =>
      console.error('Order cancellation email error:', err)
    );

    console.log(`Order #${id} cancelled by user ${req.user.userId}. Reason: ${reason || 'N/A'}`);

    res.json(formatSuccess(formatOrder(cancelledOrder), 'Order cancelled successfully'));

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json(formatError('Failed to cancel order'));
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  cancelOrder,
  deleteOrder
};

