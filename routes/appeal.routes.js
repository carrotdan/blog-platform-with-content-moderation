const express = require('express');
const router = express.Router();
const appealController = require('../controllers/appeal.controller');
const { authenticate, authorize, checkStatus } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { appealSchema, appealIdSchema } = require('../validators/schemas');

router.post('/', authenticate, checkStatus, validate(appealSchema), appealController.createAppeal);
router.get('/my', authenticate, checkStatus, appealController.getMyAppeals);
router.get('/pending', authenticate, checkStatus, authorize('ADMIN'), appealController.getPendingAppeals);
router.get('/all', authenticate, checkStatus, authorize('ADMIN'), appealController.getAllAppeals);
router.put('/:id/approve', authenticate, checkStatus, authorize('ADMIN'), validate(appealIdSchema), appealController.approveAppeal);
router.put('/:id/reject', authenticate, checkStatus, authorize('ADMIN'), validate(appealIdSchema), appealController.rejectAppeal);

module.exports = router;
