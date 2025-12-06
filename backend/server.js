const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Security Middleware
const { 
  ipAccessControl, 
  detectSuspiciousActivity, 
  sqlInjectionProtection,
  csrfProtection 
} = require('./src/middleware/security');

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

app.use(express.json({ limit: '10mb' })); // JSON boyut limiti
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Güvenlik middleware'leri
app.use(ipAccessControl);
app.use(sqlInjectionProtection);
app.use(detectSuspiciousActivity);

// Rate limiting - development için daha yüksek limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Development için yüksek limit
  message: { success: false, message: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'ERP Backend API', version: '2.0', status: 'running' });
});

// API Routes
const authRoutes = require('./src/routes/auth');
const productRoutes = require('./src/routes/products');
const orderRoutes = require('./src/routes/orders');
const chatRoutes = require('./src/routes/chat');
const reportRoutes = require('./src/routes/reports');
const adminRoutes = require('./src/routes/admin');
const customerRoutes = require('./src/routes/customers');
const chequeRoutes = require('./src/routes/cheques');
const settingsRoutes = require('./src/routes/settings');
const userProfileRoutes = require('./src/routes/userProfile');
const importRoutes = require('./src/routes/import');
const usersRoutes = require('./src/routes/users');
const permissionsRoutes = require('./src/routes/permissions');
const activityLogsRoutes = require('./src/routes/activityLogs');
const securityRoutes = require('./src/routes/security');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/cheques', chequeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userProfileRoutes);
app.use('/api/import', importRoutes);
app.use('/api/user-management', usersRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/activity-logs', activityLogsRoutes);
app.use('/api/security', securityRoutes);

// Error handling middleware
const errorHandler = require('./src/middleware/errorHandler');
app.use(errorHandler);

// WebSocket handlers
const WebSocketHandlers = require('./src/websocket/handlers');
const wsHandlers = new WebSocketHandlers(io);

// WebSocket connection
io.on('connection', (socket) => {
  wsHandlers.initializeHandlers(socket);
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, io };

