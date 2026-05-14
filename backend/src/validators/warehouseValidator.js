const Joi = require('joi');

const createWarehouseSchema = Joi.object({
  name: Joi.string().max(100).required(),
  location: Joi.string().max(255).optional().allow('', null),
  capacity: Joi.number().min(0).optional()
});

const updateWarehouseSchema = Joi.object({
  name: Joi.string().max(100).required(),
  location: Joi.string().max(255).optional().allow('', null),
  capacity: Joi.number().min(0).optional()
});

module.exports = {
  createWarehouseSchema,
  updateWarehouseSchema,
  createSchema: createWarehouseSchema,
  updateSchema: updateWarehouseSchema
};
