const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');
const {
  getPendingApprovals,
  approveEmployee,
  rejectEmployee,
  getAllEmployees
} = require('../controllers/employeeApprovalController');

// Get pending approval requests
router.get('/pending', 
  authMiddleware,
  requireRole(['admin']),
  getPendingApprovals
);

// Get all employees with status
router.get('/all',
  authMiddleware,
  requireRole(['admin']),
  getAllEmployees
);

// Approve employee
router.post('/:userId/approve',
  authMiddleware,
  requireRole(['admin']),
  approveEmployee
);

// Reject employee
router.post('/:userId/reject',
  authMiddleware,
  requireRole(['admin']),
  rejectEmployee
);

module.exports = router;
