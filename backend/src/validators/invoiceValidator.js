const Joi = require('joi');

const createInvoiceSchema = Joi.object({
  customer_id: Joi.number().integer().required(),
  items: Joi.array().min(1).max(500).items(Joi.object({
    quantity: Joi.number().positive().max(1e9),
    unit_price: Joi.number().min(0).max(1e12),
    price: Joi.number().min(0).max(1e12),
    tax_rate: Joi.number().min(0).max(100)
  }).unknown(true)).required(),
  due_date: Joi.date().optional(),
  order_id: Joi.number().integer().optional(),
  tax_rate: Joi.number().min(0).max(100).optional(),
  discount_amount: Joi.number().min(0).optional(),
  issue_date: Joi.date().optional(),
  notes: Joi.string().allow('', null).optional()
});

const updateInvoiceStatusSchema = Joi.object({
  status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled').required()
});

module.exports = {
  createInvoiceSchema,
  updateInvoiceStatusSchema,
  createSchema: createInvoiceSchema,
  updateSchema: updateInvoiceStatusSchema
};
