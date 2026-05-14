const Joi = require('joi');

const createInvoiceSchema = Joi.object({
  customer_id: Joi.number().integer().required(),
  items: Joi.array().min(1).required(),
  due_date: Joi.date().optional(),
  order_id: Joi.number().integer().optional(),
  tax_rate: Joi.number().optional(),
  discount_amount: Joi.number().optional(),
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
