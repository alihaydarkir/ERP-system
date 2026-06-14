const Joi = require('joi');

const createChequeSchema = Joi.object({
  check_serial_no:     Joi.string().required(),
  // check_issuer (keşideci) ve received_date (alındığı tarih) tabloda NOT NULL ama
  // formda her zaman gönderilmiyor — makul varsayılanlarla doldur.
  check_issuer:        Joi.string().allow('').default('Bilinmiyor'),
  customer_id:         Joi.number().integer().required(),
  bank_name:           Joi.string().required(),
  received_date:       Joi.date().default(() => new Date()),
  due_date:            Joi.date().required(),
  amount:              Joi.number().min(0.01).required(),
  currency:            Joi.string().valid('TRY', 'USD', 'EUR', 'GBP').default('TRY'),
  status:              Joi.string().optional(),
  // Form bu ikisini durum pending iken hep '' gönderiyor → boş'u kabul et ('' → yok say)
  collateral_bank:     Joi.string().allow('').optional(),
  given_to_customer_id: Joi.number().integer().empty('').optional(),
  notes:               Joi.string().optional().allow(''),
});

const updateChequeStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'paid', 'cancelled', 'teminat', 'musteriye_verildi').required(),
  notes:                Joi.string().optional().allow(''),
  collateral_bank:      Joi.string().optional().allow(''),
  given_to_customer_id: Joi.alternatives().try(Joi.number().integer(), Joi.string().allow('')).optional()
});

module.exports = {
  createChequeSchema,
  updateChequeStatusSchema,
  createSchema: createChequeSchema,
  updateSchema: updateChequeStatusSchema
};
