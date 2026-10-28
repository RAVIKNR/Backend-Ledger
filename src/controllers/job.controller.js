const { getQueues } = require('../jobs/queues');
const { prisma } = require('../config/db');
const { recordAdminAudit } = require('../services/admin-audit.service');

async function enqueueReconciliation(req, res) {
    const { reconciliationQueue } = getQueues();
    const job = await reconciliationQueue.add('reconcile', {}, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 100
    });
    await recordAdminAudit(prisma, {
        actorId: req.user.id,
        action: 'RECONCILIATION_JOB_QUEUED',
        targetType: 'JOB',
        targetId: String(job.id),
        metadata: { jobType: 'reconciliation' }
    });
    res.status(202).json({ jobId: job.id, type: 'reconciliation' });
}

async function enqueueRiskAssessment(req, res) {
    const { riskQueue } = getQueues();
    const job = await riskQueue.add('assess-risk', { transferId: req.params.transferId }, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 100
    });
    await recordAdminAudit(prisma, {
        actorId: req.user.id,
        action: 'RISK_ASSESSMENT_JOB_QUEUED',
        targetType: 'TRANSFER',
        targetId: req.params.transferId,
        metadata: { jobId: String(job.id), jobType: 'risk-assessment' }
    });
    res.status(202).json({ jobId: job.id, type: 'risk', transferId: req.params.transferId });
}

module.exports = { enqueueReconciliation, enqueueRiskAssessment };
