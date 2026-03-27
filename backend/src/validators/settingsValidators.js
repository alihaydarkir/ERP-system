const Joi = require('joi');

const settingCategories = ['general', 'email', 'stock', 'tax', 'ai', 'storage'];

const settingsSchemas = {
  update: Joi.object({
    key: Joi.string().min(1).max(100).required(),
    value: Joi.any().required(),
    type: Joi.string().valid('string', 'number', 'boolean').required(),
  }),

  getQuery: Joi.object({
    category: Joi.string().valid(...settingCategories).optional(),
  }).unknown(true),
};

module.exports = {
  settingsSchemas,
};
