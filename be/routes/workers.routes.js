const express = require('express');
const router = express.Router();
const workersController = require('../controllers/workers.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

router.get('/nearby', workersController.getNearbyWorkers);
router.get('/dashboard', optionalAuth, workersController.getWorkerDashboard);
router.patch('/status', optionalAuth, workersController.toggleWorkerStatus);
router.get('/earnings', optionalAuth, workersController.getWorkerEarnings);

module.exports = router;
