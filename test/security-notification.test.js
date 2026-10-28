jest.mock('../src/config/db', () => ({
    prisma: {
        securityNotification: {
            findUnique: jest.fn(),
            updateMany: jest.fn()
        }
    }
}));

jest.mock('../src/services/email.services', () => ({
    sendSecurityNotificationEmail: jest.fn()
}));

const { prisma } = require('../src/config/db');
const { sendSecurityNotificationEmail } = require('../src/services/email.services');
const { dispatchSecurityNotification } = require('../src/services/security-notification.service');

describe('security notification delivery', () => {
    beforeEach(() => jest.clearAllMocks());

    it('keeps a committed state notification retryable when email delivery fails', async () => {
        prisma.securityNotification.findUnique.mockResolvedValue({
            id: 'notification-id',
            eventType: 'ACCOUNT_FROZEN',
            accountId: '30000000-0000-4000-8000-000000000003',
            previousStatus: 'ACTIVE',
            resultingStatus: 'FROZEN',
            recipientEmail: 'owner@example.test',
            recipientName: 'Owner',
            attempts: 0
        });
        prisma.securityNotification.updateMany
            .mockResolvedValueOnce({ count: 1 })
            .mockResolvedValueOnce({ count: 1 });
        sendSecurityNotificationEmail.mockRejectedValue(new Error('provider unavailable'));

        await expect(dispatchSecurityNotification('notification-id')).resolves.toBeUndefined();
        expect(prisma.securityNotification.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: 'PENDING' })
        }));
    });
});
