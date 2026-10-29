const jwt = require('jsonwebtoken');
const events = require('./events');
const ragService = require('../services/ragService');
const cacheService = require('../services/cacheService');
const AuditLog = require('../models/AuditLog');
const { config } = require('../config/env');
const pool = require('../config/database');

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

    // Ürün/sipariş olayları yalnızca SUNUCU tarafından üretilir. İstemciden gelen product:* / order:*
    // olaylarını yayınlamak kiracılar arası sahte bildirime yol açıyordu (denetim 2026-10); kayıtlı değil.

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
      const { token: dataToken } = data || {};

      // Try cookie fallback if no token passed explicitly
      const cookieHeader = socket.handshake.headers.cookie || '';
      const cookieToken = cookieHeader
        .split('; ')
        .find((c) => c.startsWith('access_token='))
        ?.split('=')[1];

      const token = dataToken || cookieToken;

      if (!token) {
        socket.emit(events.AUTHENTICATION_ERROR, { error: 'No token provided' });
        return;
      }

      const decoded = jwt.verify(token, config.jwt.secret);

      // 2FA ara jetonu gibi amaca özel jetonlar soketi yetkilendiremez
      if (decoded.purpose) {
        socket.emit(events.AUTHENTICATION_ERROR, { error: 'Invalid token' });
        return;
      }

      // Kimlik/rol/şirket JWT iddialarından değil veritabanından alınır (HTTP middleware ile aynı ilke)
      const userRow = await pool.query(
        'SELECT id, username, role, company_id, is_active, deleted_at FROM users WHERE id = $1',
        [decoded.userId]
      );
      const dbUser = userRow.rows[0];
      if (!dbUser || dbUser.is_active === false || dbUser.deleted_at) {
        socket.emit(events.AUTHENTICATION_ERROR, { error: 'Invalid token' });
        return;
      }

      // Store user information
      socket.userId = dbUser.id;
      socket.userRole = dbUser.role;
      socket.username = dbUser.username;
      socket.companyId = dbUser.company_id || null;

      // Track user connection
      this.users.set(socket.userId, {
        userId: socket.userId,
        socketId: socket.id,
        username: socket.username,
        role: socket.userRole,
        companyId: socket.companyId,
        connectedAt: new Date()
      });

      // Join user to their personal room
      socket.join(`user:${socket.userId}`);
      // Yayınlar yalnızca şirket odasına gider
      if (socket.companyId) socket.join(`company:${socket.companyId}`);

      // Notify success
      socket.emit(events.AUTHENTICATED, {
        success: true,
        userId: socket.userId,
        username: socket.username
      });

      // Broadcast user online status (yalnızca kendi şirketine)
      if (socket.companyId) {
        this.io.to(`company:${socket.companyId}`).emit(events.USER_ONLINE, {
          userId: socket.userId,
          username: socket.username
        });
      }

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
      const { message } = data || {};

      // Sohbet yolunda HTTP rotasıyla aynı sınırlar: tür/uzunluk + soket başına hız sınırı
      if (typeof message !== 'string' || !message.trim() || message.length > 1000) {
        socket.emit(events.CHAT_ERROR, { error: 'Invalid message' });
        return;
      }
      const now = Date.now();
      if (socket.lastChatAt && now - socket.lastChatAt < 1500) {
        socket.emit(events.CHAT_ERROR, { error: 'Too many messages' });
        return;
      }
      socket.lastChatAt = now;

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
    if (!socket.userId || !socket.companyId) return;
    const { typing } = data || {};
    socket.to(`company:${socket.companyId}`).emit(events.CHAT_TYPING, {
      userId: socket.userId,
      username: socket.username,
      typing: !!typing
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

    // Yalnızca gönderenin şirket odasına
    if (!socket.companyId) return;
    this.io.to(`company:${socket.companyId}`).emit(eventType, {
      ...data,
      userId: socket.userId,
      username: socket.username,
      timestamp: new Date()
    });

    // Check for low stock and send alert
    if (eventType === events.PRODUCT_STOCK_UPDATED && data.stock < 10) {
      this.io.to(`company:${socket.companyId}`).emit(events.PRODUCT_LOW_STOCK, {
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

    if (!socket.companyId) return;
    this.io.to(`company:${socket.companyId}`).emit(eventType, {
      ...data,
      userId: socket.userId,
      username: socket.username,
      timestamp: new Date()
    });

    // Send notification to admins (yalnızca aynı şirketin yöneticilerine)
    if (eventType === events.ORDER_CREATED) {
      this.sendToAdmins(events.NOTIFICATION, {
        type: 'new_order',
        message: `New order #${data.orderId} created by ${socket.username}`,
        orderId: data.orderId,
        timestamp: new Date()
      }, { companyId: socket.companyId });
    }
  }

  /**
   * Send notification to all connected admins
   */
  sendToAdmins(eventType, data, options = {}) {
    for (const [userId, user] of this.users.entries()) {
      if (user.role === 'admin' && (!options.companyId || Number(user.companyId) === Number(options.companyId))) {
        this.io.to(`user:${userId}`).emit(eventType, data);
      }
    }
  }

  /**
   * Send notification to approvers (manager/admin/super_admin)
   */
  sendToApprovers(eventType, data, options = {}) {
    const companyId = options.companyId;

    for (const [userId, user] of this.users.entries()) {
      const canApprove = ['manager', 'admin', 'super_admin'].includes(user.role);
      if (!canApprove) continue;

      if (user.role !== 'super_admin' && companyId && Number(user.companyId) !== Number(companyId)) {
        continue;
      }

      this.io.to(`user:${userId}`).emit(eventType, data);
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

      // Broadcast user offline status (yalnızca kendi şirketine)
      if (socket.companyId) {
        this.io.to(`company:${socket.companyId}`).emit(events.USER_OFFLINE, {
          userId: socket.userId,
          username: socket.username
        });
      }

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
