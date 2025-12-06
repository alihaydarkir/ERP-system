const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { upload } = require('../middleware/fileUpload');

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
router.get('/statistics', getChequeStatistics);
router.get('/due-soon', getDueSoonCheques);

// Import/Export routes
router.get('/import/template', downloadTemplate);
router.post('/import/validate', upload.single('file'), validateChequeImport);
router.post('/import', upload.single('file'), importCheques);
router.get('/export/excel', exportChequesToExcel);

// CRUD routes
router.get('/', getAllCheques);
router.get('/:id', getChequeById);
router.post('/', createCheque);
router.put('/:id', updateCheque);
router.put('/:id/status', changeChequeStatus);
router.delete('/:id', deleteCheque);

module.exports = router;
