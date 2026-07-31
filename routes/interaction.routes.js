const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interaction.controller');
const { authenticate, checkStatus } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { postIdParamSchema } = require('../validators/schemas');

router.post('/', authenticate, checkStatus, interactionController.interact);
router.post('/bookmark', authenticate, checkStatus, interactionController.bookmark);
router.delete('/bookmark/:postId', authenticate, checkStatus, validate(postIdParamSchema), interactionController.unbookmark);

module.exports = router;
