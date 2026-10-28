const { recordAdminAudit, sanitizeAuditReason } = require('../src/services/admin-audit.service');

describe('admin audit logging', () => {
    it('redacts common credential values from reasons', () => {
        expect(sanitizeAuditReason('review password=hunter2 token:abc123 and Bearer eyJhbGci.abc.xyz'))
            .toBe('review password=[REDACTED] token:[REDACTED] and Bearer [REDACTED]');
    });

    it('omits absent JSON metadata and persists actor and reason', async () => {
        const create = jest.fn().mockResolvedValue({ id: 'event-id' });
        await recordAdminAudit({ adminAuditLog: { create } }, {
            actorId: 'actor-id',
            action: 'USER_SUSPENDED',
            targetType: 'USER',
            targetId: 'target-id',
            reason: 'review api_key=sample'
        });

        expect(create).toHaveBeenCalledWith({
            data: {
                actorId: 'actor-id',
                action: 'USER_SUSPENDED',
                targetType: 'USER',
                targetId: 'target-id',
                reason: 'review api_key=[REDACTED]'
            }
        });
    });
});
