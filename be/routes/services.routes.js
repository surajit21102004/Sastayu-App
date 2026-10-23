const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/services.controller');

router.get('/', servicesController.getServices);
router.get('/categories', servicesController.getCategories);

module.exports = router;
