const express = require('express');
const { body, param } = require('express-validator');
const accountController = require('../controllers/account.controller');
const { authenticate } = require('../middleware/account.middleware');
const validateRequest = require('../middleware/validation.middleware');

const router = express.Router();
const accountIdValidation = [
    param('id').isUUID().withMessage('Account ID must be a valid UUID')
];
const recipientValidation = [
    param('id').isString().trim().isLength({ min: 1, max: 64 }).withMessage('Recipient account number is required')
];
const currencyValidation = [
    body('currency').optional().custom(value => String(value).trim().toUpperCase() === 'INR').withMessage('Only INR accounts are supported')
];

router.post('/create', authenticate, currencyValidation, validateRequest, accountController.createAccount);
router.get('/', authenticate, accountController.getAccounts);
router.get('/getaccounts', authenticate, accountController.getAccounts);
router.get('/recipient/:id', authenticate, recipientValidation, validateRequest, accountController.getRecipientAccount);
router.get('/getbalance/:accountId', authenticate, [
    param('accountId').isUUID().withMessage('Account ID must be a valid UUID')
], validateRequest, accountController.getBalance);
router.get('/transfers/:transferId', authenticate, accountController.getTransferDetail);

router.post('/', authenticate, currencyValidation, validateRequest, accountController.createAccount);
router.get('/:id', authenticate, accountIdValidation, validateRequest, accountController.getAccount);
router.get('/:id/balance', authenticate, accountIdValidation, validateRequest, accountController.getBalance);
router.get('/:id/transfers', authenticate, accountIdValidation, validateRequest, accountController.getAccountTransfers);

module.exports = router;
