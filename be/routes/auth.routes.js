const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Customer Auth
router.post('/customer/send-otp', authController.customerSendOtp);
router.post('/customer/verify-otp', authController.customerVerifyOtp);
router.post('/customer/setup-profile', authenticateToken, authController.customerSetupProfile);

// Worker Partner Auth
router.post('/worker/login', authController.workerLogin);
router.post('/worker/register', authController.workerRegister);
router.post('/worker/setup-profile', authenticateToken, authController.workerSetupProfile);

// Profile
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
