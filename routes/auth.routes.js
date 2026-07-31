const express = require('express');
const authController = require('../controllers/auth.controller');
const rateLimit = require('express-rate-limit');
const { validate } = require('../middlewares/validate.middleware');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/schemas');
const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { success: false, message: 'Too many requests, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, validate(refreshSchema), authController.refresh);

module.exports = router;
