const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const reportController = require('../controllers/report.controller');
const { authenticate, authorize, checkStatus } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { reportSchema, resolveReportSchema, paginationSchema } = require('../validators/schemas');

const contentCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many reports submitted, please try again after 1 minute' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/', authenticate, checkStatus, contentCreateLimiter, validate(reportSchema), reportController.createReport);

// Admin routes (H35: banned/muted admins must not list/resolve reports)
// H48: the resolve body/status is validated against ['RESOLVED','DISMISSED'].
// M53: the listing is paginated (was returning every report).
router.get('/', authenticate, checkStatus, authorize(['ADMIN']), validate(paginationSchema), reportController.listReports);
router.put('/:id', authenticate, checkStatus, authorize(['ADMIN']), validate(resolveReportSchema), reportController.resolveReport);

module.exports = router;
