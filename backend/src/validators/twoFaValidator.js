const Joi = require('joi');

const verifyTwoFaSchema = Joi.object({
  token: Joi.string().pattern(/^\d{6}$/).length(6).required()
});

const disableTwoFaSchema = Joi.object({
  password: Joi.string().required()
});

module.exports = {
  verifyTwoFaSchema,
  disableTwoFaSchema,
  createSchema: verifyTwoFaSchema,
  updateSchema: disableTwoFaSchema
};
