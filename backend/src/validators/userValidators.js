const Joi = require('joi');

const userRoles = ['admin', 'manager', 'user'];

const userManagementSchemas = {
  createUser: Joi.object({
    username: Joi.string().min(3).max(100).required(),
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid(...userRoles).default('user'),
    phone_number: Joi.string().max(20).allow('', null),
    department: Joi.string().max(100).allow('', null),
    job_title: Joi.string().max(100).allow('', null),
  }),

  updateUser: Joi.object({
    username: Joi.string().min(3).max(100).optional(),
    email: Joi.string().email({ tlds: { allow: false } }).optional(),
    role: Joi.string().valid(...userRoles).optional(),
    phone_number: Joi.string().max(20).allow('', null),
    department: Joi.string().max(100).allow('', null),
    job_title: Joi.string().max(100).allow('', null),
  }).min(1),

  listQuery: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(1000).optional(),
    role: Joi.string().valid(...userRoles).optional(),
    search: Joi.string().max(120).optional(),
  }).unknown(true),
};

module.exports = {
  userManagementSchemas,
};
