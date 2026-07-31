const express = require('express');
const router = express.Router();
const followController = require('../controllers/follow.controller');
const { authenticate, checkStatus } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { userIdParamSchema } = require('../validators/schemas');

router.post('/', authenticate, checkStatus, followController.toggleFollow);
router.get('/:userId/followers', validate(userIdParamSchema), followController.getFollowers);
router.get('/:userId/following', validate(userIdParamSchema), followController.getFollowing);
router.get('/suggestions', authenticate, checkStatus, followController.getSuggestions);

module.exports = router;
