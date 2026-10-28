const { prisma } = require('../config/db');
const { getMetrics } = require('../middleware/observability.middleware');

async function readiness(req, res) {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ready', database: 'up' });
    } catch (error) {
        res.status(503).json({ status: 'not_ready', database: 'down' });
    }
}

function metrics(req, res) {
    res.json(getMetrics());
}

module.exports = { readiness, metrics };
