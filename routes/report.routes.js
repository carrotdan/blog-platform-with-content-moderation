const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const reportController = require('../controllers/report.controller');
const { authenticate, authorize, checkStatus } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { idParamSchema, reportSchema } = require('../validators/schemas');

const contentCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many reports submitted, please try again after 1 minute' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/', authenticate, checkStatus, contentCreateLimiter, validate(reportSchema), reportController.createReport);

// Admin routes
router.get('/', authenticate, authorize(['ADMIN']), reportController.listReports);
router.put('/:id', authenticate, authorize(['ADMIN']), validate(idParamSchema), reportController.resolveReport);

module.exports = router;
