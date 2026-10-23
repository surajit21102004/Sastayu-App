const express = require('express');
const router = express.Router();
const disputesController = require('../controllers/disputes.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

router.post('/report-extra', optionalAuth, disputesController.reportExtraCharge);
router.get('/', optionalAuth, disputesController.getMyDisputes);

module.exports = router;
