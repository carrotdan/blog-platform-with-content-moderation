const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const interactionController = require('../controllers/interaction.controller');
const { authenticate, checkStatus } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { postIdParamSchema, interactSchema, bookmarkSchema } = require('../validators/schemas');

const interactionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many requests, please try again after 1 minute' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/', authenticate, checkStatus, interactionLimiter, validate(interactSchema), interactionController.interact);
router.post('/bookmark', authenticate, checkStatus, interactionLimiter, validate(bookmarkSchema), interactionController.bookmark);
router.delete('/bookmark/:postId', authenticate, checkStatus, validate(postIdParamSchema), interactionController.unbookmark);

module.exports = router;
