const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/admin.middleware');
const { createRun, listRuns } = require('../controllers/reconciliation.controller');

const router = express.Router();

router.post('/runs', authenticate, requireAdmin, createRun);
router.get('/runs', authenticate, requireAdmin, listRuns);

module.exports = router;
