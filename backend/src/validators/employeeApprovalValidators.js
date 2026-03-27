const Joi = require('joi');

const employeeApprovalSchemas = {
  create: Joi.object({
    type: Joi.string().min(2).max(100).required(),
    details: Joi.object().required(),
  }),

  query: Joi.object({
    status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(1000).optional(),
  }).unknown(true),
};

module.exports = {
  employeeApprovalSchemas,
};
