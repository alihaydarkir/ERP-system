const Joi = require('joi');

/**
 * Validation schemas using Joi
 */

// User validation schemas
const userSchemas = {
  register: Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'manager', 'user').default('user')
  }),

  login: Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().required()
  }),

  updateUser: Joi.object({
    username: Joi.string().min(3).max(30),
    email: Joi.string().email({ tlds: { allow: false } }),
    password: Joi.string().min(6),
    role: Joi.string().valid('admin', 'manager', 'user')
  }).min(1)
};

// Product validation schemas
const productSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().allow('', null),
    price: Joi.number().min(0).required(),
    stock: Joi.number().integer().min(0).required(),
    category: Joi.string().max(100).allow('', null),
    sku: Joi.string().max(100).required(),
    low_stock_threshold: Joi.number().integer().min(0).default(10)
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(255),
    description: Joi.string().allow('', null),
    price: Joi.number().min(0),
    stock: Joi.number().integer().min(0),
    category: Joi.string().max(100).allow('', null),
    sku: Joi.string().max(100),
    low_stock_threshold: Joi.number().integer().min(0)
  }).min(1),

  updateStock: Joi.object({
    quantity: Joi.number().integer().min(0).required(),
    operation: Joi.string().valid('set', 'increment', 'decrement').default('set')
  })
};

// Order validation schemas
const orderSchemas = {
  create: Joi.object({
    customer_id: Joi.number().integer().optional().allow(null),
    items: Joi.array().items(
      Joi.object({
        product_id: Joi.number().integer().required(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().min(0).required()
      })
    ).min(1).required(),
    total_amount: Joi.number().min(0).required(),
    status: Joi.string().valid('pending', 'completed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded').default('pending')
  }),

  update: Joi.object({
    customer_id: Joi.number().integer().optional().allow(null),
    status: Joi.string().valid('pending', 'completed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'),
    total_amount: Joi.number().min(0)
  }).min(1),

  updateStatus: Joi.object({
    status: Joi.string().valid('pending', 'completed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded').required()
  }),

  cancel: Joi.object({
    reason: Joi.string().max(500).allow('', null)
  })
};

// Chat validation schemas
const chatSchemas = {
  message: Joi.object({
    message: Joi.string().min(1).max(1000).required(),
    context: Joi.object().optional()
  })
};

// RAG Knowledge validation schemas
const ragSchemas = {
  create: Joi.object({
    content: Joi.string().min(1).required(),
    metadata: Joi.object().default({}),
    embedding: Joi.array().items(Joi.number()).optional()
  }),

  search: Joi.object({
    query: Joi.string().min(1).required(),
    limit: Joi.number().integer().min(1).max(20).default(5),
    threshold: Joi.number().min(0).max(1).default(0.7)
  })
};

// Customer validation schemas
const customerSchemas = {
  create: Joi.object({
    full_name: Joi.string().min(3).max(100).required(),
    company_name: Joi.string().min(3).max(100).required(),
    tax_office: Joi.string().min(3).max(255).required(),
    tax_number: Joi.string().min(10).max(50).required(),
    phone_number: Joi.alternatives().try(
      Joi.string().valid('', null),
      Joi.string().pattern(/^[0-9+\-() ]+$/).min(10).max(20)
    ),
    company_location: Joi.string().max(255).allow('', null).optional()
  }),

  update: Joi.object({
    full_name: Joi.string().min(3).max(100),
    company_name: Joi.string().min(3).max(100),
    tax_office: Joi.string().min(3).max(255),
    tax_number: Joi.string().min(10).max(50),
    phone_number: Joi.alternatives().try(
      Joi.string().valid('', null),
      Joi.string().pattern(/^[0-9+\-() ]+$/).min(10).max(20)
    ),
    company_location: Joi.string().max(255).allow('', null).optional()
  }).min(1)
};

// Query parameter validation
const querySchemas = {
  pagination: Joi.object({
    limit: Joi.number().integer().min(1).max(10000).default(20),
    offset: Joi.number().integer().min(0).default(0)
  }).unknown(true),

  dateRange: Joi.object({
    start_date: Joi.date().iso(),
    end_date: Joi.date().iso().min(Joi.ref('start_date'))
  }),

  filters: Joi.object({
    category: Joi.string(),
    status: Joi.string(),
    search: Joi.string(),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    lowStock: Joi.number().integer().min(0),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(10000).default(20)
  }).unknown(true),

  orderFilters: Joi.object({
    user_id: Joi.number().integer(),
    status: Joi.string(),
    start_date: Joi.date().iso(),
    end_date: Joi.date().iso(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(10000).default(20)
  }).unknown(true),

  productFilters: Joi.object({
    category: Joi.string(),
    search: Joi.string(),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    lowStock: Joi.number().integer().min(0),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(10000).default(20)
  }).unknown(true),

  customerFilters: Joi.object({
    user_id: Joi.number().integer(),
    search: Joi.string(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(10000).default(50),
    offset: Joi.number().integer().min(0).default(0)
  }).unknown(true)
};

/**
 * Validation middleware factory
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    // Replace request data with validated and sanitized data
    req[property] = value;
    next();
  };
};

module.exports = {
  userSchemas,
  productSchemas,
  orderSchemas,
  chatSchemas,
  ragSchemas,
  customerSchemas,
  querySchemas,
  validate
};