const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

// Admin Executive Portal Routes (Prompt 5)
router.get('/overview', optionalAuth, adminController.getAdminOverview);
router.get('/users', optionalAuth, adminController.getUsersList);
router.patch('/users/:id/status', optionalAuth, adminController.updateUserStatus);
router.get('/workers', optionalAuth, adminController.getWorkersList);
router.patch('/workers/:id/status', optionalAuth, adminController.updateWorkerStatus);
router.get('/worker-earnings', optionalAuth, adminController.getAdminWorkerEarnings);
router.post('/settle-payout', optionalAuth, adminController.settleWorkerPayout);
router.get('/payouts', optionalAuth, adminController.getWeeklyPayoutsList);

module.exports = router;
