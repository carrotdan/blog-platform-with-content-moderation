const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.post('/', authenticate, reportController.createReport);

// Admin routes
router.get('/', authenticate, authorize(['ADMIN']), reportController.listReports);
router.put('/:id', authenticate, authorize(['ADMIN']), reportController.resolveReport);

module.exports = router;
