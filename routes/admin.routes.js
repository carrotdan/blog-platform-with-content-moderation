const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Protect all admin routes
router.use(authenticate, authorize('ADMIN'));

router.get('/violations', adminController.getViolations);
router.get('/users', adminController.getUsers);
router.put('/users/:id/role', adminController.changeRole);

router.get('/posts', adminController.getPosts);
router.put('/posts/:id/hide', adminController.hidePost);
router.put('/posts/:id/unhide', adminController.unhidePost);
router.put('/posts/:id/mark-sensitive', adminController.markSensitive);
router.put('/posts/:id/unmark-sensitive', adminController.unmarkSensitive);
router.delete('/posts/:id', adminController.deletePost);

router.get('/reports', adminController.getReports);
router.put('/reports/:id/resolve', adminController.resolveReport);

router.put('/users/:id/mute', adminController.muteUser);
router.put('/users/:id/ban', adminController.banUser);
router.put('/users/:id/reset-score', adminController.resetScore);

module.exports = router;
