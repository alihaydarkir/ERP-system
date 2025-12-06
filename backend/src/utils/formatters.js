/**
 * Data formatting utilities
 */

/**
 * Format user object for API response (remove sensitive data)
 */
const formatUser = (user) => {
  if (!user) return null;

  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Format multiple users
 */
const formatUsers = (users) => {
  return users.map(formatUser);
};

/**
 * Format product object
 */
const formatProduct = (product) => {
  if (!product) return null;

  return {
    ...product,
    price: parseFloat(product.price),
    stock: parseInt(product.stock_quantity || product.stock || 0),
    created_at: product.created_at ? new Date(product.created_at).toISOString() : null,
    updated_at: product.updated_at ? new Date(product.updated_at).toISOString() : null
  };
};

/**
 * Format multiple products
 */
const formatProducts = (products) => {
  return products.map(formatProduct);
};

/**
 * Format order object
 */
const formatOrder = (order) => {
  if (!order) return null;

  return {
    ...order,
    total_amount: parseFloat(order.total_amount),
    items: order.items ? order.items.map(item => ({
      ...item,
      price: parseFloat(item.price),
      quantity: parseInt(item.quantity)
    })) : [],
    created_at: order.created_at ? new Date(order.created_at).toISOString() : null,
    updated_at: order.updated_at ? new Date(order.updated_at).toISOString() : null
  };
};

/**
 * Format multiple orders
 */
const formatOrders = (orders) => {
  return orders.map(formatOrder);
};

/**
 * Format currency
 */
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};

/**
 * Format date
 */
const formatDate = (date, locale = 'en-US') => {
  if (!date) return null;
  return new Date(date).toLocaleDateString(locale);
};

/**
 * Format datetime
 */
const formatDateTime = (date, locale = 'en-US') => {
  if (!date) return null;
  return new Date(date).toLocaleString(locale);
};

/**
 * Format percentage
 */
const formatPercentage = (value, decimals = 2) => {
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format number
 */
const formatNumber = (number, decimals = 2) => {
  return parseFloat(number).toFixed(decimals);
};

/**
 * Format file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Format API response
 */
const formatResponse = (success, data = null, message = null, errors = null) => {
  const response = { success };

  if (message) response.message = message;
  if (data !== null) response.data = data;
  if (errors) response.errors = errors;

  return response;
};

/**
 * Format success response
 */
const formatSuccess = (data, message = 'Success') => {
  return formatResponse(true, data, message);
};

/**
 * Format error response
 */
const formatError = (message, errors = null) => {
  return formatResponse(false, null, message, errors);
};

/**
 * Format paginated response
 */
const formatPaginated = (data, total, page, limit) => {
  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: (page * limit) < total
    }
  };
};

/**
 * Sanitize string (remove HTML tags)
 */
const sanitizeString = (str) => {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '');
};

/**
 * Truncate string
 */
const truncateString = (str, maxLength = 100, suffix = '...') => {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Format audit log
 */
const formatAuditLog = (log) => {
  if (!log) return null;

  return {
    ...log,
    changes: typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes,
    created_at: log.created_at ? new Date(log.created_at).toISOString() : null
  };
};

/**
 * Format audit logs
 */
const formatAuditLogs = (logs) => {
  return logs.map(formatAuditLog);
};

/**
 * Convert object keys to camelCase
 */
const toCamelCase = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }

  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    acc[camelKey] = toCamelCase(obj[key]);
    return acc;
  }, {});
};

/**
 * Convert object keys to snake_case
 */
const toSnakeCase = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  }

  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    acc[snakeKey] = toSnakeCase(obj[key]);
    return acc;
  }, {});
};

module.exports = {
  formatUser,
  formatUsers,
  formatProduct,
  formatProducts,
  formatOrder,
  formatOrders,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPercentage,
  formatNumber,
  formatFileSize,
  formatResponse,
  formatSuccess,
  formatError,
  formatPaginated,
  sanitizeString,
  truncateString,
  formatAuditLog,
  formatAuditLogs,
  toCamelCase,
  toSnakeCase
};
