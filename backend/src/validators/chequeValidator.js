const Joi = require('joi');

const createChequeSchema = Joi.object({
  check_serial_no: Joi.string().required(),
  amount: Joi.number().min(0.01).required(),
  due_date: Joi.date().required(),
  customer_id: Joi.number().integer().required()
});

const updateChequeStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'cleared', 'bounced', 'cancelled').required()
});

module.exports = {
  createChequeSchema,
  updateChequeStatusSchema,
  createSchema: createChequeSchema,
  updateSchema: updateChequeStatusSchema
};
