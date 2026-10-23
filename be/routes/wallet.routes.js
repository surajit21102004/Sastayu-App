const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

router.get('/balance', optionalAuth, walletController.getWalletBalance);
router.post('/create-recharge-order', optionalAuth, walletController.createRechargeOrder);
router.post('/verify-recharge', optionalAuth, walletController.verifyRecharge);
router.post('/direct-recharge', optionalAuth, walletController.directRecharge);
router.get('/checkout-page', walletController.renderCheckoutPage);
router.get('/transactions', optionalAuth, walletController.getTransactions);

module.exports = router;
