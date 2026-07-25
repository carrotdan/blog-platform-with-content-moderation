const express = require('express');
const router = express.Router();
const appealController = require('../controllers/appeal.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// User routes (cần đăng nhập)
router.post('/', authenticate, appealController.createAppeal);
router.get('/my', authenticate, appealController.getMyAppeals);

// Admin routes
router.get('/pending', authenticate, authorize('ADMIN'), appealController.getPendingAppeals);
router.get('/all', authenticate, authorize('ADMIN'), appealController.getAllAppeals);
router.put('/:id/approve', authenticate, authorize('ADMIN'), appealController.approveAppeal);
router.put('/:id/reject', authenticate, authorize('ADMIN'), appealController.rejectAppeal);

module.exports = router;
