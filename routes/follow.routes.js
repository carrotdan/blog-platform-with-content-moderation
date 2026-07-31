const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const followController = require('../controllers/follow.controller');
const { authenticate, checkStatus } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { userIdParamSchema, followSchema } = require('../validators/schemas');

const followLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many follow requests, please try again after 1 minute' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/', authenticate, checkStatus, followLimiter, validate(followSchema), followController.toggleFollow);
router.get('/:userId/followers', validate(userIdParamSchema), followController.getFollowers);
router.get('/:userId/following', validate(userIdParamSchema), followController.getFollowing);
router.get('/suggestions', authenticate, checkStatus, followController.getSuggestions);

module.exports = router;
