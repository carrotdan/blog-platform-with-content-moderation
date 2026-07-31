const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize, checkStatus } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { idParamSchema, paginationSchema, adminResolveReportSchema } = require('../validators/schemas');

// Protect all admin routes - allow both ADMIN and MODERATOR, but never banned/muted accounts
router.use(authenticate, checkStatus, authorize(['ADMIN', 'MODERATOR']));

router.get('/violations', validate(paginationSchema), adminController.getViolations);
router.get('/users', validate(paginationSchema), adminController.getUsers);
// H34: User-management actions (role/ban/mute/reset-score) are ADMIN-only.
// MODERATORs may review content but must not escalate privileges.
router.put('/users/:id/role', authorize('ADMIN'), validate(idParamSchema), adminController.changeRole);

router.get('/posts', adminController.getPosts);
router.put('/posts/:id/hide', validate(idParamSchema), adminController.hidePost);
router.put('/posts/:id/unhide', validate(idParamSchema), adminController.unhidePost);
router.put('/posts/:id/mark-sensitive', validate(idParamSchema), adminController.markSensitive);
router.put('/posts/:id/unmark-sensitive', validate(idParamSchema), adminController.unmarkSensitive);
router.delete('/posts/:id', validate(idParamSchema), adminController.deletePost);

router.get('/reports', adminController.getReports);
router.put('/reports/:id/resolve', validate(adminResolveReportSchema), adminController.resolveReport);

router.put('/users/:id/mute', authorize('ADMIN'), validate(idParamSchema), adminController.muteUser);
router.put('/users/:id/ban', authorize('ADMIN'), validate(idParamSchema), adminController.banUser);
router.put('/users/:id/reset-score', authorize('ADMIN'), validate(idParamSchema), adminController.resetScore);

module.exports = router;
