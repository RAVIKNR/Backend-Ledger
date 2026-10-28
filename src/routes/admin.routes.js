const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, requireAdmin } = require('../middleware/admin.middleware');
const {
    getOverview,
    listFlaggedTransfers,
    decideTransfer,
    listUsers,
    listAdministrators,
    listEligibleAdminUsers,
    updateAdminRole,
    updateUserStatus,
    listAccounts,
    listRecipientAccounts,
    updateAccountStatus,
    listTransactions,
    listAdminAudit
} = require('../controllers/admin.controller');
const { enqueueReconciliation, enqueueRiskAssessment } = require('../controllers/job.controller');
const validateRequest = require('../middleware/validation.middleware');

const router = express.Router();
router.use(authenticate, requireAdmin);

const paginationValidation = [
    query('page').optional().isInt({ min: 1, max: 1000000 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt()
];
const dateRangeValidation = [
    query('from').optional().isISO8601({ strict: true }).withMessage('from must be an ISO-8601 date'),
    query('to').optional().isISO8601({ strict: true }).withMessage('to must be an ISO-8601 date'),
    query('to').custom((value, { req }) => {
        if (value && req.query.from && new Date(value) < new Date(req.query.from)) {
            throw new Error('to must be on or after from');
        }
        return true;
    })
];

router.get('/overview', getOverview);
router.get('/transfers/flagged', listFlaggedTransfers);
router.get('/users', [
    ...paginationValidation,
    query('search').optional().trim().isLength({ max: 120 }),
    query('status').optional().isIn(['ACTIVE', 'SUSPENDED', 'CLOSED'])
], validateRequest, listUsers);
router.get('/administrators', listAdministrators);
router.get('/eligible-admin-users', [
    query('search').optional().trim().isLength({ max: 120 })
], validateRequest, listEligibleAdminUsers);
router.patch('/users/:userId/admin-role', [
    param('userId').isUUID().withMessage('userId must be a valid UUID'),
    body('action').isIn(['PROMOTE', 'DEMOTE']).withMessage('action must be PROMOTE or DEMOTE'),
    body('reason').isString().trim().notEmpty().isLength({ max: 1000 }).withMessage('reason is required and must be 1000 characters or fewer')
], validateRequest, updateAdminRole);
router.patch('/users/:userId/status', [
    param('userId').isUUID().withMessage('userId must be a valid UUID'),
    body('status').isIn(['ACTIVE', 'SUSPENDED']).withMessage('status must be ACTIVE or SUSPENDED'),
    body('reason').isString().trim().notEmpty().isLength({ max: 1000 }).withMessage('reason is required and must be 1000 characters or fewer')
], validateRequest, updateUserStatus);
router.get('/accounts', [
    ...paginationValidation,
    query('search').optional().trim().isLength({ max: 120 }),
    query('status').optional().isIn(['ACTIVE', 'FROZEN', 'CLOSED'])
], validateRequest, listAccounts);
router.get('/accounts/recipients', [
    query('page').optional().isInt({ min: 1, max: 1000000 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('search').optional().trim().isLength({ max: 120 })
], validateRequest, listRecipientAccounts);
router.patch('/accounts/:accountId/status', [
    param('accountId').isUUID().withMessage('accountId must be a valid UUID'),
    body('status').isIn(['ACTIVE', 'FROZEN']).withMessage('status must be ACTIVE or FROZEN'),
    body('reason').isString().trim().notEmpty().isLength({ max: 1000 }).withMessage('reason is required and must be 1000 characters or fewer')
], validateRequest, updateAccountStatus);
router.get('/transfers', [
    ...paginationValidation,
    ...dateRangeValidation,
    query('status').optional().isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'REVIEW', 'FAILED', 'REVERSED']),
    query('accountId').optional().isUUID().withMessage('accountId must be a valid UUID'),
    query('riskLevel').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
    query('riskDecision').optional().isIn(['PENDING', 'APPROVED', 'REVIEW', 'DECLINED'])
], validateRequest, listTransactions);
router.get('/audit', [
    ...paginationValidation,
    ...dateRangeValidation,
    query('actorId').optional().isUUID().withMessage('actorId must be a valid UUID'),
    query('action').optional().trim().isLength({ min: 1, max: 80 }),
    query('targetType').optional().trim().isLength({ min: 1, max: 40 }),
    query('targetId').optional().trim().isLength({ min: 1, max: 255 })
], validateRequest, listAdminAudit);
router.post(
    '/transfers/:transferId/decision',
    param('transferId').isUUID().withMessage('transferId must be a valid UUID'),
    body('decision').isIn(['APPROVE', 'DECLINE']).withMessage('decision must be APPROVE or DECLINE'),
    body('notes').optional().isString().trim().isLength({ max: 1000 }).withMessage('notes must be a string of 1000 characters or fewer'),
    validateRequest,
    decideTransfer
);
router.post('/jobs/reconciliation', enqueueReconciliation);
router.post('/jobs/risk/:transferId', param('transferId').isUUID().withMessage('transferId must be a valid UUID'), validateRequest, enqueueRiskAssessment);

module.exports = router;
