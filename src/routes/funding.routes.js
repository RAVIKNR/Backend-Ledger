const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireAdmin } = require('../middleware/admin.middleware');
const validateRequest = require('../middleware/validation.middleware');
const { fundAccount, fundInitialDemoAccount } = require('../controllers/funding.controller');

const router = express.Router();
const demoRouter = express.Router();

demoRouter.post('/initial-demo', authenticate, fundInitialDemoAccount);
router.post('/', authenticate, requireAdmin, [
    body('accountId').isUUID().withMessage('accountId must be a valid UUID'),
    body('amountMinor').isInt({ min: 1 }).withMessage('amountMinor must be a positive integer'),
    body('currency').custom(value => String(value).trim().toUpperCase() === 'INR').withMessage('Only INR funding is supported'),
    body('reason').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }).withMessage('reason must be 1000 characters or fewer')
], validateRequest, fundAccount);

module.exports = router;
module.exports.demoRouter = demoRouter;
