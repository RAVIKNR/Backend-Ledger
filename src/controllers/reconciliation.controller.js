const { prisma } = require('../config/db');
const { runReconciliation } = require('../services/reconciliation.service');
const { recordAdminAudit } = require('../services/admin-audit.service');

async function createRun(req, res) {
    const run = await runReconciliation();
    await recordAdminAudit(prisma, {
        actorId: req.user.id,
        action: 'RECONCILIATION_RUN',
        targetType: 'RECONCILIATION_RUN',
        targetId: run.id,
        metadata: { status: run.status, recordsChecked: run.recordsChecked }
    });
    res.status(run.status === 'PASSED' ? 200 : 409).json({ run });
}

async function listRuns(req, res) {
    const runs = await prisma.reconciliationRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 50
    });
    res.json({ runs });
}

module.exports = { createRun, listRuns };
