const Joi = require('joi');

const twoFaSchemas = {
  enable: Joi.object({
    password: Joi.string().required(),
  }),

  verify: Joi.object({
    token: Joi.string().pattern(/^\d{6}$/).required(),
  }),

  disable: Joi.object({
    password: Joi.string().required(),
    token: Joi.string().pattern(/^\d{6}$/).optional(),
  }),
};

module.exports = {
  twoFaSchemas,
};
