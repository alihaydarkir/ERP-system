const express = require('express');
const router = express.Router();
const Joi = require('joi');
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { validate } = require('../validators/validate');
const validateId = require('../middleware/validateId');
const { getAllBankTransfers, createBankTransfer, deleteBankTransfer } = require('../controllers/bankTransferController');

// Banka havalesi = Ödemeler modülü → çek izinleriyle korunur (ayrı izin gerektirmez)
const createSchema = Joi.object({
  customer_id:   Joi.number().integer().required(),
  bank_name:     Joi.string().min(2).max(100).required(),
  receipt_no:    Joi.string().max(100).allow('', null),
  transfer_date: Joi.date().required(),
  amount:        Joi.number().min(0.01).required(),
  notes:         Joi.string().allow('', null),
});

router.get('/', authMiddleware, requirePermission('cheques.view'), getAllBankTransfers);
router.post('/', authMiddleware, requirePermission('cheques.create'), validate(createSchema), createBankTransfer);
router.delete('/:id', authMiddleware, validateId, requirePermission('cheques.delete'), deleteBankTransfer);

module.exports = router;
