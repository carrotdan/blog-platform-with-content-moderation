const express = require('express');
const authController = require('../controllers/auth.controller');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authLimiter, authController.refresh);

module.exports = router;
