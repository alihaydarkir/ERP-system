const Joi = require('joi');

const activityLogSchemas = {
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(1000).optional(),
    userId: Joi.number().integer().min(1).optional(),
    module: Joi.string().max(100).optional(),
    action: Joi.string().max(100).optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
  })
    .rename('dateFrom', 'startDate', { ignoreUndefined: true, override: false })
    .rename('dateTo', 'endDate', { ignoreUndefined: true, override: false })
    .unknown(true),
};

module.exports = {
  activityLogSchemas,
};
