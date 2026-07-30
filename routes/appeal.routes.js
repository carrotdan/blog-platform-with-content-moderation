const express = require('express');
const router = express.Router();
const appealController = require('../controllers/appeal.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createAppealSchema, appealIdSchema } = require('../validators/schemas');

router.post('/', authenticate, validate(createAppealSchema), appealController.createAppeal);
router.get('/my', authenticate, appealController.getMyAppeals);
router.get('/pending', authenticate, authorize('ADMIN'), appealController.getPendingAppeals);
router.get('/all', authenticate, authorize('ADMIN'), appealController.getAllAppeals);
router.put('/:id/approve', authenticate, authorize('ADMIN'), validate(appealIdSchema), appealController.approveAppeal);
router.put('/:id/reject', authenticate, authorize('ADMIN'), validate(appealIdSchema), appealController.rejectAppeal);

module.exports = router;
