const Joi = require('joi');

const assignPermissionSchema = Joi.object({
  userId: Joi.number().integer().required(),
  permissions: Joi.array().items(Joi.string()).min(1).required()
});

module.exports = {
  assignPermissionSchema,
  createSchema: assignPermissionSchema,
  updateSchema: assignPermissionSchema
};
