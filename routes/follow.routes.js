const express = require('express');
const router = express.Router();
const followController = require('../controllers/follow.controller');
const { authenticate, checkStatus } = require('../middlewares/auth.middleware');

router.post('/', authenticate, checkStatus, followController.toggleFollow);
router.get('/:userId/followers', followController.getFollowers);
router.get('/:userId/following', followController.getFollowing);
router.get('/suggestions', authenticate, followController.getSuggestions);

module.exports = router;
