jest.mock('../src/config/db', () => ({
    prisma: {
        transactionNotification: {
            findMany: jest.fn(),
            updateMany: jest.fn()
        }
    }
}));

jest.mock('../src/services/email.services', () => ({
    sendTransactionEmail: jest.fn()
}));

const { prisma } = require('../src/config/db');
const { sendTransactionEmail } = require('../src/services/email.services');
const {
    dispatchTransactionNotifications,
    queueTransferNotifications
} = require('../src/services/transaction-notification.service');

describe('transaction notifications', () => {
    beforeEach(() => jest.clearAllMocks());

    it('queues one debit and one credit notification for a completed transfer', async () => {
        const tx = {
            transactionNotification: { createMany: jest.fn().mockResolvedValue({ count: 2 }) }
        };
        const transfer = {
            id: 'transfer-id',
            amountMinor: 1250n,
            currency: 'INR ',
            reference: 'LG-123',
            createdAt: new Date('2026-10-27T10:00:00.000Z'),
            senderAccount: { user: { id: 'sender', email: 'sender@example.test', name: 'Sender' } },
            receiverAccount: { user: { id: 'receiver', email: 'receiver@example.test', name: 'Receiver' } }
        };

        await queueTransferNotifications(tx, transfer);

        expect(tx.transactionNotification.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({ notificationType: 'DEBIT', recipientEmail: 'sender@example.test' }),
                expect.objectContaining({ notificationType: 'CREDIT', recipientEmail: 'receiver@example.test' })
            ]),
            skipDuplicates: true
        });
    });

    it('sends each claimed notification and marks it sent', async () => {
        const notification = {
            id: 'notification-id',
            recipientEmail: 'owner@example.test',
            recipientName: 'Owner',
            notificationType: 'CREDIT',
            amountMinor: 500n,
            currency: 'USD',
            reference: 'LG-456',
            occurredAt: new Date()
        };
        prisma.transactionNotification.findMany.mockResolvedValue([notification]);
        prisma.transactionNotification.updateMany
            .mockResolvedValueOnce({ count: 1 })
            .mockResolvedValueOnce({ count: 1 });
        sendTransactionEmail.mockResolvedValue(undefined);

        await dispatchTransactionNotifications('transfer-id');

        expect(sendTransactionEmail).toHaveBeenCalledWith(expect.objectContaining({
            email: 'owner@example.test',
            type: 'CREDIT',
            reference: 'LG-456'
        }));
        expect(prisma.transactionNotification.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: 'SENT' })
        }));
    });

    it('returns failed delivery to pending without affecting the transfer', async () => {
        prisma.transactionNotification.findMany.mockResolvedValue([{
            id: 'notification-id',
            recipientEmail: 'owner@example.test',
            recipientName: 'Owner',
            notificationType: 'DEBIT',
            amountMinor: 500n,
            currency: 'USD',
            occurredAt: new Date(),
            attempts: 0
        }]);
        prisma.transactionNotification.updateMany
            .mockResolvedValueOnce({ count: 1 })
            .mockResolvedValueOnce({ count: 1 });
        sendTransactionEmail.mockRejectedValue(new Error('provider unavailable'));

        await expect(dispatchTransactionNotifications('transfer-id')).resolves.toBeUndefined();
        expect(prisma.transactionNotification.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: 'PENDING' })
        }));
    });
});
