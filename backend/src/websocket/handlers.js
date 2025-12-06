const jwt = require('jsonwebtoken');
const events = require('./events');
const ragService = require('../services/ragService');
const cacheService = require('../services/cacheService');
const AuditLog = require('../models/AuditLog');

class WebSocketHandlers {
  constructor(io) {
    this.io = io;
    this.users = new Map(); // Track connected users
  }

  /**
   * Initialize all socket handlers
   */
  initializeHandlers(socket) {
    console.log(`Client connected: ${socket.id}`);

    // Authentication
    socket.on(events.AUTHENTICATE, (data) => this.handleAuthentication(socket, data));

    // Chat events
    socket.on(events.CHAT_MESSAGE, (data) => this.handleChatMessage(socket, data));
    socket.on(events.CHAT_TYPING, (data) => this.handleTyping(socket, data));

    // Product events
    socket.on(events.PRODUCT_CREATED, (data) => this.broadcastProductEvent(socket, events.PRODUCT_CREATED, data));
    socket.on(events.PRODUCT_UPDATED, (data) => this.broadcastProductEvent(socket, events.PRODUCT_UPDATED, data));
    socket.on(events.PRODUCT_DELETED, (data) => this.broadcastProductEvent(socket, events.PRODUCT_DELETED, data));

    // Order events
    socket.on(events.ORDER_CREATED, (data) => this.broadcastOrderEvent(socket, events.ORDER_CREATED, data));
    socket.on(events.ORDER_UPDATED, (data) => this.broadcastOrderEvent(socket, events.ORDER_UPDATED, data));

    // System events
    socket.on(events.PING, () => socket.emit(events.PONG));

    // Disconnect
    socket.on(events.DISCONNECT, () => this.handleDisconnect(socket));
  }

  /**
   * Handle user authentication
   */
  async handleAuthentication(socket, data) {
    try {
      const { token } = data;

      if (!token) {
        socket.emit(events.AUTHENTICATION_ERROR, { error: 'No token provided' });
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Store user information
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      socket.username = decoded.username;

      // Track user connection
      this.users.set(socket.userId, {
        socketId: socket.id,
        username: socket.username,
        role: socket.userRole,
        connectedAt: new Date()
      });

      // Join user to their personal room
      socket.join(`user:${socket.userId}`);

      // Notify success
      socket.emit(events.AUTHENTICATED, {
        success: true,
        userId: socket.userId,
        username: socket.username
      });

      // Broadcast user online status
      this.io.emit(events.USER_ONLINE, {
        userId: socket.userId,
        username: socket.username
      });

      console.log(`User authenticated: ${socket.username} (${socket.userId})`);
    } catch (error) {
      console.error('Authentication error:', error.message);
      socket.emit(events.AUTHENTICATION_ERROR, { error: 'Invalid token' });
    }
  }

  /**
   * Handle chat messages with AI
   */
  async handleChatMessage(socket, data) {
    try {
      const { message } = data;

      if (!socket.userId) {
        socket.emit(events.CHAT_ERROR, { error: 'Not authenticated' });
        return;
      }

      console.log(`Chat message from ${socket.username}: ${message}`);

      // Send typing indicator
      socket.emit(events.CHAT_TYPING, { typing: true });

      // Get AI response using RAG
      const aiResponse = await ragService.generateAnswer(message);

      // Send response
      socket.emit(events.CHAT_RESPONSE, {
        message: aiResponse.answer,
        sources: aiResponse.sources || [],
        timestamp: new Date(),
        context_used: aiResponse.context_used
      });

      // Log activity
      await AuditLog.create({
        user_id: socket.userId,
        action: 'CHAT',
        entity_type: 'chat',
        entity_id: null,
        changes: {
          user_message: message,
          ai_response: aiResponse.answer
        },
        ip_address: socket.handshake.address
      });
    } catch (error) {
      console.error('Chat message error:', error.message);
      socket.emit(events.CHAT_ERROR, { error: 'Failed to process message' });
    }
  }

  /**
   * Handle typing indicator
   */
  handleTyping(socket, data) {
    const { typing } = data;
    socket.broadcast.emit(events.CHAT_TYPING, {
      userId: socket.userId,
      username: socket.username,
      typing
    });
  }

  /**
   * Broadcast product events to all clients
   */
  async broadcastProductEvent(socket, eventType, data) {
    if (!socket.userId) {
      return;
    }

    console.log(`Product event: ${eventType}`, data);

    // Invalidate product cache
    await cacheService.invalidateProductCache(data.productId);

    // Broadcast to all connected clients
    this.io.emit(eventType, {
      ...data,
      userId: socket.userId,
      username: socket.username,
      timestamp: new Date()
    });

    // Check for low stock and send alert
    if (eventType === events.PRODUCT_STOCK_UPDATED && data.stock < 10) {
      this.io.emit(events.PRODUCT_LOW_STOCK, {
        productId: data.productId,
        productName: data.name,
        stock: data.stock,
        timestamp: new Date()
      });
    }
  }

  /**
   * Broadcast order events to all clients
   */
  async broadcastOrderEvent(socket, eventType, data) {
    if (!socket.userId) {
      return;
    }

    console.log(`Order event: ${eventType}`, data);

    // Invalidate order cache
    await cacheService.invalidateOrderCache();

    // Broadcast to all connected clients
    this.io.emit(eventType, {
      ...data,
      userId: socket.userId,
      username: socket.username,
      timestamp: new Date()
    });

    // Send notification to admins
    if (eventType === events.ORDER_CREATED) {
      this.sendToAdmins(events.NOTIFICATION, {
        type: 'new_order',
        message: `New order #${data.orderId} created by ${socket.username}`,
        orderId: data.orderId,
        timestamp: new Date()
      });
    }
  }

  /**
   * Send notification to all connected admins
   */
  sendToAdmins(eventType, data) {
    for (const [userId, user] of this.users.entries()) {
      if (user.role === 'admin') {
        this.io.to(`user:${userId}`).emit(eventType, data);
      }
    }
  }

  /**
   * Send alert to specific user
   */
  sendToUser(userId, eventType, data) {
    this.io.to(`user:${userId}`).emit(eventType, data);
  }

  /**
   * Broadcast dashboard update to all clients
   */
  async broadcastDashboardUpdate(stats) {
    this.io.emit(events.DASHBOARD_UPDATE, {
      stats,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast system message
   */
  broadcastSystemMessage(message, type = 'info') {
    this.io.emit(events.SYSTEM_MESSAGE, {
      message,
      type,
      timestamp: new Date()
    });
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(socket) {
    console.log(`Client disconnected: ${socket.id}`);

    if (socket.userId) {
      // Remove from users map
      this.users.delete(socket.userId);

      // Broadcast user offline status
      this.io.emit(events.USER_OFFLINE, {
        userId: socket.userId,
        username: socket.username
      });

      console.log(`User ${socket.username} (${socket.userId}) went offline`);
    }
  }

  /**
   * Get online users
   */
  getOnlineUsers() {
    return Array.from(this.users.values()).map(user => ({
      userId: user.userId,
      username: user.username,
      role: user.role,
      connectedAt: user.connectedAt
    }));
  }

  /**
   * Get connected user count
   */
  getUserCount() {
    return this.users.size;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId) {
    return this.users.has(userId);
  }
}

module.exports = WebSocketHandlers;
