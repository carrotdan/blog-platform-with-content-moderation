const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, optionalAuthenticate, checkStatus } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { paginationSchema, usernameParamSchema } = require('../validators/schemas');

router.post('/logout', authenticate, userController.logout);
router.put('/profile', authenticate, checkStatus, userController.updateProfile);
router.get('/me', authenticate, checkStatus, userController.getMe);
router.get('/me/bookmarks', authenticate, checkStatus, validate(paginationSchema), userController.getBookmarks);
router.get('/:username', optionalAuthenticate, validate(paginationSchema), validate(usernameParamSchema), userController.getPublicProfile);

module.exports = router;
