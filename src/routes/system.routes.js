const express = require('express');
const { readiness, metrics } = require('../controllers/system.controller');

const router = express.Router();
router.get('/readyz', readiness);
router.get('/metrics', metrics);

module.exports = router;
