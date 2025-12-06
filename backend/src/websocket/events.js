/**
 * WebSocket Event Definitions
 */

module.exports = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',

  // Authentication events
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  AUTHENTICATION_ERROR: 'authentication_error',

  // Chat events
  CHAT_MESSAGE: 'chat:message',
  CHAT_RESPONSE: 'chat:response',
  CHAT_ERROR: 'chat:error',
  CHAT_TYPING: 'chat:typing',

  // Product events
  PRODUCT_CREATED: 'product:created',
  PRODUCT_UPDATED: 'product:updated',
  PRODUCT_DELETED: 'product:deleted',
  PRODUCT_STOCK_UPDATED: 'product:stock_updated',
  PRODUCT_LOW_STOCK: 'product:low_stock',

  // Order events
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  ORDER_DELETED: 'order:deleted',
  ORDER_STATUS_CHANGED: 'order:status_changed',

  // Notification events
  NOTIFICATION: 'notification',
  ALERT: 'alert',

  // Dashboard events
  DASHBOARD_UPDATE: 'dashboard:update',
  STATS_UPDATE: 'stats:update',

  // User events
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  USER_ACTIVITY: 'user:activity',

  // System events
  SYSTEM_MESSAGE: 'system:message',
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong'
};
