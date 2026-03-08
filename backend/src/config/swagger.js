/**
 * OpenAPI / Swagger yapılandırması
 * AI agent'lar için makine-okuyabilir API şeması.
 * Erişim: GET /api/openapi.json  (JSON spec)
 *         GET /api/docs          (Swagger UI - insan okuma)
 */
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ERP System API',
      version: '2.0.0',
      description: `
## Kimlik Doğrulama
1. \`POST /api/auth/login\` → \`{ email, password }\` → \`{ token }\`
2. Tüm isteklerde: \`Authorization: Bearer <token>\`

## Yanıt Formatı
Tüm endpoint'ler tutarlı zarf kullanır:
\`\`\`json
{ "success": true, "data": {}, "message": "açıklama" }
\`\`\`

## Sayfalama (Liste endpoint'leri)
Query parametreleri: \`?page=1&limit=20\`
Yanıt içerir: \`{ pagination: { total, page, limit, totalPages, hasMore } }\`

## Hata Yanıtları
\`\`\`json
{ "success": false, "message": "hata mesajı", "code": "ERR_KODU" }
\`\`\`
Hata kodları: \`NOT_FOUND\`, \`UNAUTHORIZED\`, \`VALIDATION_ERROR\`,
\`DUPLICATE_ENTRY\`, \`INSUFFICIENT_STOCK\`, \`INVALID_STATUS_TRANSITION\`

## Multi-Tenancy
Her istek company_id bazında izole edilir. Token'dan otomatik çözülür.
      `.trim(),
      contact: { name: 'Ali Haydar Kır' },
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'POST /api/auth/login ile token alın, buraya yapıştırın',
        },
      },
      schemas: {
        /* ── Ortak Yanıt Sarmalayıcıları ─────────────── */
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data:    { type: 'object',  description: 'Asıl veri' },
            message: { type: 'string',  example: 'Success' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string',  example: 'Kayıt bulunamadı' },
            code:    { type: 'string',  example: 'NOT_FOUND',
              description: 'Makine-okuyabilir hata kodu' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data:    { type: 'array',   items: { type: 'object' } },
            pagination: {
              type: 'object',
              properties: {
                total:      { type: 'integer', example: 142 },
                page:       { type: 'integer', example: 1 },
                limit:      { type: 'integer', example: 20 },
                totalPages: { type: 'integer', example: 8 },
                hasMore:    { type: 'boolean', example: true },
              },
            },
          },
        },
        /* ── Alan Şemaları ───────────────────────────── */
        Product: {
          type: 'object',
          properties: {
            id:                   { type: 'integer' },
            name:                 { type: 'string'  },
            sku:                  { type: 'string'  },
            category:             { type: 'string'  },
            price:                { type: 'number'  },
            stock_quantity:       { type: 'integer' },
            low_stock_threshold:  { type: 'integer' },
            description:          { type: 'string'  },
            supplier_id:          { type: 'integer' },
            warehouse_id:         { type: 'integer' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id:           { type: 'integer' },
            order_number: { type: 'string'  },
            status:       { type: 'string',  enum: ['pending','confirmed','processing','shipped','delivered','completed','cancelled'] },
            total_amount: { type: 'number'  },
            customer_id:  { type: 'integer' },
            created_at:   { type: 'string',  format: 'date-time' },
            items:        { type: 'array',   items: { type: 'object' } },
          },
        },
        Customer: {
          type: 'object',
          properties: {
            id:          { type: 'integer' },
            name:        { type: 'string'  },
            email:       { type: 'string'  },
            phone:       { type: 'string'  },
            company:     { type: 'string'  },
            tax_number:  { type: 'string'  },
          },
        },
        Invoice: {
          type: 'object',
          properties: {
            id:             { type: 'integer' },
            invoice_number: { type: 'string'  },
            status:         { type: 'string',  enum: ['draft','sent','paid','overdue','cancelled'] },
            total_amount:   { type: 'number'  },
            tax_rate:       { type: 'number'  },
            issue_date:     { type: 'string',  format: 'date' },
            due_date:       { type: 'string',  format: 'date' },
          },
        },
      },
    },
    /* Tüm endpoint'ler JWT ile korunur (auth hariç) */
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth',      description: 'Kimlik doğrulama' },
      { name: 'Products',  description: 'Ürün yönetimi' },
      { name: 'Orders',    description: 'Sipariş yönetimi' },
      { name: 'Customers', description: 'Müşteri yönetimi' },
      { name: 'Invoices',  description: 'Fatura yönetimi' },
      { name: 'Suppliers', description: 'Tedarikçi yönetimi' },
      { name: 'Warehouses',description: 'Depo yönetimi' },
      { name: 'Reports',   description: 'Raporlar & analitik' },
      { name: 'System',    description: 'Sistem & sağlık kontrolü' },
    ],
  },
  apis: ['./src/routes/*.js', './server.js'],
};

module.exports = swaggerJsdoc(options);
