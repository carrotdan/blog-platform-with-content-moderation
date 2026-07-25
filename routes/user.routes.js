const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, optionalAuthenticate, checkStatus } = require('../middlewares/auth.middleware');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/refresh', userController.refreshToken);
router.post('/logout', authenticate, userController.logout);
router.put('/profile', authenticate, checkStatus, userController.updateProfile);
router.get('/me', authenticate, checkStatus, userController.getMe);
router.get('/me/bookmarks', authenticate, checkStatus, userController.getBookmarks);
router.get('/:username', optionalAuthenticate, userController.getPublicProfile);

module.exports = router;
