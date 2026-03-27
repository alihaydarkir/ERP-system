const Joi = require('joi');

const warehouseSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(160),
    warehouse_name: Joi.string().min(2).max(160),
    address: Joi.string().max(255).allow('', null),
    location: Joi.string().max(120).allow('', null),
    capacity: Joi.number().integer().greater(0).optional(),
    warehouse_code: Joi.string().max(60).optional(),
    city: Joi.string().max(80).allow('', null),
    country: Joi.string().max(80).allow('', null),
    manager_name: Joi.string().max(120).allow('', null),
    phone: Joi.string().max(30).allow('', null),
    email: Joi.string().email({ tlds: { allow: false } }).allow('', null),
    notes: Joi.string().max(1000).allow('', null),
  })
    .rename('name', 'warehouse_name', { ignoreUndefined: true, override: false })
    .or('warehouse_name')
    .messages({ 'object.missing': 'name alanı zorunludur' }),

  update: Joi.object({
    name: Joi.string().min(2).max(160).optional(),
    warehouse_name: Joi.string().min(2).max(160).optional(),
    address: Joi.string().max(255).allow('', null),
    location: Joi.string().max(120).allow('', null),
    capacity: Joi.number().integer().greater(0).optional(),
    warehouse_code: Joi.string().max(60).optional(),
    city: Joi.string().max(80).allow('', null),
    country: Joi.string().max(80).allow('', null),
    manager_name: Joi.string().max(120).allow('', null),
    phone: Joi.string().max(30).allow('', null),
    email: Joi.string().email({ tlds: { allow: false } }).allow('', null),
    notes: Joi.string().max(1000).allow('', null),
    is_active: Joi.boolean().optional(),
  })
    .rename('name', 'warehouse_name', { ignoreUndefined: true, override: false })
    .min(1),

  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(1000).optional(),
    search: Joi.string().max(120).optional(),
  }).unknown(true),
};

module.exports = {
  warehouseSchemas,
};
