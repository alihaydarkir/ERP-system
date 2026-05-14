const Joi = require('joi');

const updateProfileSchema = Joi.object({
  name: Joi.string().max(100),
  email: Joi.string().email(),
  phone: Joi.string().max(20),
  // Backward compatibility with existing payloads
  username: Joi.string().max(100),
  phone_number: Joi.string().max(20),
  department: Joi.string().max(100),
  job_title: Joi.string().max(100)
}).min(1);

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
  // Backward compatibility with controllers that check confirmation
  confirmPassword: Joi.string().optional()
});

const updateRoleSchema = Joi.object({
  role: Joi.string().valid('admin', 'manager', 'user').required()
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  updateRoleSchema,
  createSchema: updateProfileSchema,
  updateSchema: updateRoleSchema
};
