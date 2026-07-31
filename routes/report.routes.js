const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const reportController = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const contentCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many reports submitted, please try again after 1 minute' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/', authenticate, contentCreateLimiter, reportController.createReport);

// Admin routes
router.get('/', authenticate, authorize(['ADMIN']), reportController.listReports);
router.put('/:id', authenticate, authorize(['ADMIN']), reportController.resolveReport);

module.exports = router;
