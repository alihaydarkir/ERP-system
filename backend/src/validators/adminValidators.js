const Joi = require('joi');

const adminSchemas = {
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(1000).optional(),
    companyId: Joi.number().integer().min(1).optional(),
  }).unknown(true),
};

module.exports = {
  adminSchemas,
};
