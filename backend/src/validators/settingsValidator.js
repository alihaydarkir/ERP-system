const Joi = require('joi');

const updateSettingSchema = Joi.object({
  key: Joi.string().required(),
  value: Joi.any().required()
});

module.exports = {
  updateSettingSchema,
  createSchema: updateSettingSchema,
  updateSchema: updateSettingSchema
};
