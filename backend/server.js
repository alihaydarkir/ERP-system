const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Parse allowed CORS origins from env (comma-separated) with sensible dev defaults
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

const io = socketIo(server, {
  cors: {
    origin: corsOrigins,
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
      scriptSrc: ["'self'", "'unsafe-inline'"],  // swagger-ui için gerekli
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
  origin: corsOrigins,
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

// Rate limiting — production: 100 req/15min, development: 1000
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || (process.env.NODE_ENV === 'production' ? 100 : 1000),
  message: { success: false, message: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Routes
/**
 * @openapi
 * /:
 *   get:
 *     tags: [System]
 *     summary: API kök endpoint — canlılık kontrolü
 *     security: []
 *     responses:
 *       200:
 *         description: API çalışıyor
 */
app.get('/', (req, res) => {
  res.json({ message: 'ERP Backend API', version: '2.0', status: 'running' });
});

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [System]
 *     summary: Detaylı sistem sağlık kontrolü
 *     description: AI agent'lar için — sistemin tüm bileşenlerinin durumunu döner
 *     security: []
 *     responses:
 *       200:
 *         description: Sistem durumu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:    { type: string, example: ok }
 *                 timestamp: { type: string, format: date-time }
 *                 version:   { type: string, example: '2.0.0' }
 *                 services:  { type: object }
 */
app.get('/api/health', async (req, res) => {
  const pool = require('./src/config/database');
  let dbOk = false;
  try { await pool.query('SELECT 1'); dbOk = true; } catch (_) {}

  res.status(dbOk ? 200 : 503).json({
    status:    dbOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version:   '2.0.0',
    services: {
      api:      { status: 'ok' },
      database: { status: dbOk ? 'ok' : 'error' },
      frontend: { url: process.env.FRONTEND_URL || 'http://localhost:5173' },
    },
  });
});

/**
 * @openapi
 * /api/capabilities:
 *   get:
 *     tags: [System]
 *     summary: AI agent manifest — tüm modüller ve işlemler
 *     description: >
 *       AI agent'ların bu API ile neler yapabileceğini açıklayan
 *       makine-okuyabilir manifest. Chat module'ü bu endpoint'i
 *       kullanarak hangi tool'ları çağırabileceğini öğrenir.
 *     security: []
 *     responses:
 *       200:
 *         description: Capabilities manifest
 */
app.get('/api/capabilities', (req, res) => {
  res.json({
    name: 'ERP System API',
    version: '2.0.0',
    openapi_spec: '/api/openapi.json',
    docs_ui:      '/api/docs',
    auth: {
      method:      'JWT Bearer',
      obtain_token: { method: 'POST', path: '/api/auth/login',
        body: { email: 'string', password: 'string' } },
    },
    modules: [
      { name: 'products',   base: '/api/products',
        actions: ['list','get','create','update','delete'],
        filters: ['search','category','lowStock','page','limit'] },
      { name: 'orders',     base: '/api/orders',
        actions: ['list','get','create','update','updateStatus','delete'],
        filters: ['status','start_date','end_date','page','limit'],
        statuses: ['pending','confirmed','processing','shipped','delivered','completed','cancelled'] },
      { name: 'customers',  base: '/api/customers',
        actions: ['list','get','create','update','delete','search'],
        filters: ['search','page','limit'] },
      { name: 'invoices',   base: '/api/invoices',
        actions: ['list','get','create','update','delete','markPaid','markSent'],
        filters: ['status','customer_id','page','limit'],
        statuses: ['draft','sent','paid','overdue','cancelled'] },
      { name: 'suppliers',  base: '/api/suppliers',
        actions: ['list','get','create','update','delete'] },
      { name: 'warehouses', base: '/api/warehouses',
        actions: ['list','get','create','update','delete'] },
      { name: 'reports',    base: '/api/reports',
        actions: ['dashboard_summary','daily','weekly','monthly','top_products','inventory'] },
      { name: 'cheques',         base: '/api/cheques',
        actions: ['list','get','create','update','delete'] },
      { name: 'current-accounts', base: '/api/current-accounts',
        actions: ['summary','list','detail','transactions'],
        description: 'Müşteri cari hesap: açık bakiye, sipariş/fatura geçmişi' },
    ],
  });
});

/* ── Swagger UI + OpenAPI JSON ─────────────────────────────── */
app.get('/api/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'ERP API Docs',
  swaggerOptions: { persistAuthorization: true },
}));

// API Routes
console.log('Loading routes...');
const authRoutes = require('./src/routes/auth');
console.log('✓ Auth routes loaded');
const productRoutes = require('./src/routes/products');
console.log('✓ Product routes loaded');
const orderRoutes = require('./src/routes/orders');
console.log('✓ Order routes loaded');
const chatRoutes = require('./src/routes/chat');
console.log('✓ Chat routes loaded');
const reportRoutes = require('./src/routes/reports');
console.log('✓ Report routes loaded');
const adminRoutes = require('./src/routes/admin');
console.log('✓ Admin routes loaded');
const customerRoutes = require('./src/routes/customers');
console.log('✓ Customer routes loaded');
const chequeRoutes = require('./src/routes/cheques');
console.log('✓ Cheque routes loaded');
const settingsRoutes = require('./src/routes/settings');
console.log('✓ Settings routes loaded');
const userProfileRoutes = require('./src/routes/userProfile');
console.log('✓ User profile routes loaded');
const importRoutes = require('./src/routes/import');
console.log('✓ Import routes loaded');
const usersRoutes = require('./src/routes/users');
console.log('✓ Users routes loaded');
const permissionsRoutes = require('./src/routes/permissions');
console.log('✓ Permissions routes loaded');
const activityLogsRoutes = require('./src/routes/activityLogs');
console.log('✓ Activity logs routes loaded');
const securityRoutes = require('./src/routes/security');
console.log('✓ Security routes loaded');
const supplierRoutes = require('./src/routes/suppliers');
console.log('✓ Supplier routes loaded');
const warehouseRoutes = require('./src/routes/warehouses');
console.log('✓ Warehouse routes loaded');
const employeeApprovalRoutes = require('./src/routes/employeeApproval');
console.log('✓ Employee approval routes loaded');
const invoiceRoutes = require('./src/routes/invoices');
console.log('✓ Invoice routes loaded');
const currentAccountRoutes = require('./src/routes/currentAccounts');
console.log('✓ Current account routes loaded');
const aiRoutes = require('./src/routes/ai');
console.log('✓ AI routes loaded');

console.log('✓ Employee approval routes loaded');

console.log('Registering routes...');
app.use('/api/auth', authRoutes);
console.log('✓ /api/auth registered');
app.use('/api/products', productRoutes);
console.log('✓ /api/products registered');
app.use('/api/orders', orderRoutes);
console.log('✓ /api/orders registered');
app.use('/api/chat', chatRoutes);
console.log('✓ /api/chat registered');
app.use('/api/ai', aiRoutes);
console.log('✓ /api/ai registered');
app.use('/api/reports', reportRoutes);
console.log('✓ /api/reports registered');
app.use('/api/admin', adminRoutes);
console.log('✓ /api/admin registered');
app.use('/api/customers', customerRoutes);
console.log('✓ /api/customers registered');
app.use('/api/suppliers', supplierRoutes);
console.log('✓ /api/suppliers registered');
app.use('/api/warehouses', warehouseRoutes);
console.log('✓ /api/warehouses registered');
app.use('/api/cheques', chequeRoutes);
console.log('✓ /api/cheques registered');
app.use('/api/settings', settingsRoutes);
console.log('✓ /api/settings registered');
app.use('/api/users', userProfileRoutes);
console.log('✓ /api/users registered');
app.use('/api/import', importRoutes);
console.log('✓ /api/import registered');
app.use('/api/user-management', usersRoutes);
console.log('✓ /api/user-management registered');
app.use('/api/permissions', permissionsRoutes);
console.log('✓ /api/permissions registered');
app.use('/api/activity-logs', activityLogsRoutes);
console.log('✓ /api/activity-logs registered');
app.use('/api/security', securityRoutes);
console.log('✓ /api/security registered');
app.use('/api/employee-approval', employeeApprovalRoutes);
console.log('✓ /api/employee-approval registered');
app.use('/api/invoices', invoiceRoutes);
console.log('✓ /api/invoices registered');
app.use('/api/current-accounts', currentAccountRoutes);
console.log('✓ /api/current-accounts registered');
console.log('All routes registered successfully!');

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
  console.log(`🚀 Server running on port 5000`);
  console.log(`📡 WebSocket ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Keep server alive
  setInterval(() => {
    // Ping to keep alive
  }, 1000 * 60 * 5); // Every 5 minutes
});

// Keep process alive and handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit
});

// Don't export in production, causes exit
// module.exports = { app, io };

