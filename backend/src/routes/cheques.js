const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { upload } = require('../middleware/fileUpload');
const { requirePermission, requireAnyPermission, logActivity } = require('../middleware/permissions');

// Controllers
const {
  getAllCheques,
  getChequeById,
  createCheque,
  updateCheque,
  changeChequeStatus,
  deleteCheque,
  getDueSoonCheques,
  getChequeStatistics
} = require('../controllers/chequeController');

const {
  validateChequeImport,
  importCheques,
  exportChequesToExcel,
  downloadTemplate
} = require('../controllers/chequeImportController');

// All routes require authentication
router.use(auth);

// Statistics and summary routes
router.get('/statistics', requirePermission('cheques.view'), getChequeStatistics);
router.get('/due-soon', requirePermission('cheques.view'), getDueSoonCheques);

// Import/Export routes
router.get('/import/template', requirePermission('cheques.view'), downloadTemplate);
router.post('/import/validate', requirePermission('cheques.create'), upload.single('file'), validateChequeImport);
router.post('/import', requirePermission('cheques.create'), upload.single('file'), importCheques);
router.get('/export/excel', requirePermission('cheques.view'), exportChequesToExcel);

// CRUD routes
router.get('/', requirePermission('cheques.view'), getAllCheques);
router.get('/:id', requirePermission('cheques.view'), getChequeById);
router.post('/', requirePermission('cheques.create'), logActivity('create_cheque', 'cheques'), createCheque);
router.put('/:id', requirePermission('cheques.edit'), logActivity('update_cheque', 'cheques'), updateCheque);
router.put('/:id/status', requireAnyPermission(['cheques.change_status', 'cheques.edit']), logActivity('change_cheque_status', 'cheques'), changeChequeStatus);
router.delete('/:id', requirePermission('cheques.delete'), logActivity('delete_cheque', 'cheques'), deleteCheque);

module.exports = router;
