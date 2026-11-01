const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getAlerts } = require('../controllers/alertsController');

router.get('/', authMiddleware, getAlerts);

module.exports = router;
