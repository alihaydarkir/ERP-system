const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');
const { validate } = require('../validators/validate');
const { employeeApprovalSchemas } = require('../validators/employeeApprovalValidators');
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
  validate(employeeApprovalSchemas.query, 'query'),
  getPendingApprovals
);

// Get all employees with status
router.get('/all',
  authMiddleware,
  requireRole(['admin']),
  validate(employeeApprovalSchemas.query, 'query'),
  getAllEmployees
);

// Approve employee
router.post('/:userId/approve',
  authMiddleware,
  requireRole(['admin']),
  validate(employeeApprovalSchemas.create),
  approveEmployee
);

// Reject employee
router.post('/:userId/reject',
  authMiddleware,
  requireRole(['admin']),
  validate(employeeApprovalSchemas.create),
  rejectEmployee
);

module.exports = router;
