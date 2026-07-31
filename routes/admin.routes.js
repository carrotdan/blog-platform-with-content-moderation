const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { idParamSchema } = require('../validators/schemas');

// Protect all admin routes - allow both ADMIN and MODERATOR
router.use(authenticate, authorize(['ADMIN', 'MODERATOR']));

router.get('/violations', adminController.getViolations);
router.get('/users', adminController.getUsers);
router.put('/users/:id/role', validate(idParamSchema), adminController.changeRole);

router.get('/posts', adminController.getPosts);
router.put('/posts/:id/hide', validate(idParamSchema), adminController.hidePost);
router.put('/posts/:id/unhide', validate(idParamSchema), adminController.unhidePost);
router.put('/posts/:id/mark-sensitive', validate(idParamSchema), adminController.markSensitive);
router.put('/posts/:id/unmark-sensitive', validate(idParamSchema), adminController.unmarkSensitive);
router.delete('/posts/:id', validate(idParamSchema), adminController.deletePost);

router.get('/reports', adminController.getReports);
router.put('/reports/:id/resolve', validate(idParamSchema), adminController.resolveReport);

router.put('/users/:id/mute', validate(idParamSchema), adminController.muteUser);
router.put('/users/:id/ban', validate(idParamSchema), adminController.banUser);
router.put('/users/:id/reset-score', validate(idParamSchema), adminController.resetScore);

module.exports = router;
