const Joi = require('joi');

const userProfileSchemas = {
  update: Joi.object({
    firstName: Joi.string().max(100).optional(),
    lastName: Joi.string().max(100).optional(),
    phone: Joi.string().max(20).optional(),

    // Backward compatibility with current controller fields
    username: Joi.string().min(3).max(100).optional(),
    phone_number: Joi.string().max(20).allow('', null),
    department: Joi.string().max(100).allow('', null),
    job_title: Joi.string().max(100).allow('', null),
  })
    .rename('phone', 'phone_number', { ignoreUndefined: true, override: false })
    .min(1),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
    confirmPassword: Joi.any().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'confirmPassword newPassword ile aynı olmalı',
    }),
  }),
};

module.exports = {
  userProfileSchemas,
};
