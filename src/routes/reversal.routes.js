const express = require('express');
const { header } = require('express-validator');
const { authenticate } = require('../middleware/account.middleware');
const validateRequest = require('../middleware/validation.middleware');
const { reverseTransfer } = require('../controllers/reversal.controller');

const router = express.Router();

router.post(
    '/:transferId/reversal',
    authenticate,
    header('Idempotency-Key').isLength({ min: 1, max: 255 }).withMessage('Idempotency-Key is required'),
    validateRequest,
    reverseTransfer
);

module.exports = router;
