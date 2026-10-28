const { prisma } = require('../config/db');
const { sendTransactionEmail, sendFailedTransactionEmail } = require('./email.services');

async function queueTransferNotifications(tx, transfer) {
    const notifications = [];
    if (transfer.senderAccount?.user) {
        notifications.push({
            transferId: transfer.id,
            recipientUserId: transfer.senderAccount.user.id,
            recipientEmail: transfer.senderAccount.user.email,
            recipientName: transfer.senderAccount.user.name,
            notificationType: 'DEBIT',
            amountMinor: transfer.amountMinor,
            currency: transfer.currency,
            reference: transfer.reference,
            occurredAt: transfer.createdAt
        });
    }

    if (transfer.receiverAccount?.user) {
        notifications.push({
            transferId: transfer.id,
            recipientUserId: transfer.receiverAccount.user.id,
            recipientEmail: transfer.receiverAccount.user.email,
            recipientName: transfer.receiverAccount.user.name,
            notificationType: 'CREDIT',
            amountMinor: transfer.amountMinor,
            currency: transfer.currency,
            reference: transfer.reference,
            occurredAt: transfer.createdAt
        });
    }

    if (notifications.length) {
        await tx.transactionNotification.createMany({ data: notifications, skipDuplicates: true });
    }
}

async function queueTransferFailureNotification(tx, transfer) {
    const user = transfer.senderAccount?.user;
    if (!user || !user.emailVerifiedAt) return;
    await tx.transactionNotification.createMany({
        data: [{
            transferId: transfer.id,
            recipientUserId: user.id,
            recipientEmail: user.email,
            recipientName: user.name,
            notificationType: 'FAILURE',
            amountMinor: transfer.amountMinor,
            currency: transfer.currency,
            reference: transfer.reference,
            occurredAt: transfer.createdAt
        }],
        skipDuplicates: true
    });
}

function safeErrorMessage(error) {
    return error instanceof Error ? error.message.slice(0, 255) : 'Notification delivery failed';
}

async function dispatchTransactionNotifications(transferId) {
    try {
        await prisma.transactionNotification.updateMany({
            where: {
                transferId,
                status: 'SENDING',
                updatedAt: { lt: new Date(Date.now() - 15 * 60 * 1000) }
            },
            data: { status: 'PENDING', lastError: 'Recovered stale notification claim' }
        });
        const notifications = await prisma.transactionNotification.findMany({
            where: { transferId, status: 'PENDING' },
            orderBy: { createdAt: 'asc' },
            include: {
                transfer: {
                    include: {
                        senderAccount: true,
                        receiverAccount: true
                    }
                }
            }
        });

        for (const notification of notifications) {
            const claimed = await prisma.transactionNotification.updateMany({
                where: { id: notification.id, status: 'PENDING' },
                data: { status: 'SENDING', attempts: { increment: 1 }, lastError: null }
            });
            if (claimed.count !== 1) continue;

            try {
                if (notification.notificationType === 'FAILURE') {
                    await sendFailedTransactionEmail({
                        email: notification.recipientEmail,
                        name: notification.recipientName,
                        amountMinor: notification.amountMinor,
                        currency: notification.currency,
                        reason: notification.transfer.failureReason || 'Transfer rejected',
                        sourceAccount: notification.transfer.senderAccount ? `acct-****-${notification.transfer.senderAccount.id.slice(-4)}` : null,
                        recipientAccount: notification.transfer.receiverAccount ? `acct-****-${notification.transfer.receiverAccount.id.slice(-4)}` : null,
                        reference: notification.reference,
                        occurredAt: notification.occurredAt
                    });
                } else {
                    await sendTransactionEmail({
                        email: notification.recipientEmail,
                        name: notification.recipientName,
                        type: notification.notificationType,
                        amountMinor: notification.amountMinor,
                        currency: notification.currency,
                        reference: notification.reference,
                        occurredAt: notification.occurredAt
                    });
                }
                await prisma.transactionNotification.updateMany({
                    where: { id: notification.id, status: 'SENDING' },
                    data: { status: 'SENT', sentAt: new Date(), lastError: null }
                });
            } catch (error) {
                await prisma.transactionNotification.updateMany({
                    where: { id: notification.id, status: 'SENDING' },
                    data: { status: 'PENDING', lastError: safeErrorMessage(error) }
                });
                console.error(JSON.stringify({
                    event: 'transaction_notification_failed',
                    notificationType: notification.notificationType,
                    attempts: notification.attempts + 1,
                    errorName: error instanceof Error ? error.name : 'UnknownError'
                }));
            }
        }
    } catch (error) {
        console.error(JSON.stringify({
            event: 'transaction_notification_dispatch_failed',
            transferId,
            errorName: error instanceof Error ? error.name : 'UnknownError'
        }));
    }
}

module.exports = { dispatchTransactionNotifications, queueTransferNotifications, queueTransferFailureNotification };
