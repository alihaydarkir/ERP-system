const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const rbacMiddleware = require('../middleware/rbac');
const {
  initialize,
  generateDataset,
  createModel,
  listModels,
  testModel,
  deleteModel,
  getStatistics,
  listDatasets
} = require('../controllers/fineTuningController');

// All fine-tuning endpoints require admin role
router.post('/initialize', authMiddleware, rbacMiddleware('admin'), initialize);
router.post('/dataset/generate', authMiddleware, rbacMiddleware('admin'), generateDataset);
router.get('/datasets', authMiddleware, rbacMiddleware('admin'), listDatasets);
router.post('/model/create', authMiddleware, rbacMiddleware('admin'), createModel);
router.get('/models', authMiddleware, rbacMiddleware('admin'), listModels);
router.post('/model/test', authMiddleware, rbacMiddleware('admin'), testModel);
router.delete('/model/:modelName', authMiddleware, rbacMiddleware('admin'), deleteModel);
router.get('/statistics', authMiddleware, rbacMiddleware('admin'), getStatistics);

module.exports = router;
