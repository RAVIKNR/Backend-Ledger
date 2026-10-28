const { Prisma } = require('@prisma/client');
const { prisma } = require('../config/db');

async function reverseTransfer(req, res) {
    const transferId = req.params.transferId;
    const idempotencyKey = req.get('Idempotency-Key');

    if (!idempotencyKey) {
        return res.status(400).json({ error: { message: 'Idempotency-Key is required' } });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const existing = await tx.reversal.findUnique({
                where: {
                    requestedByUserId_idempotencyKey: {
                        requestedByUserId: req.user.id,
                        idempotencyKey
                    }
                },
                include: { originalTransfer: true, reversalTransfer: true }
            });
            if (existing) {
                if (existing.originalTransferId !== transferId) {
                    const error = new Error('Idempotency key is already in use for another reversal');
                    error.statusCode = 409;
                    throw error;
                }
                return { reversal: existing, replayed: true };
            }

            const transfer = await tx.transfer.findUnique({
                where: { id: transferId },
                include: {
                    reversal: true,
                    reversalOf: true,
                    senderAccount: { select: { userId: true } }
                }
            });
            if (!transfer) {
                const error = new Error('Transfer not found');
                error.statusCode = 404;
                throw error;
            }
            if (transfer.senderAccountId === null || transfer.status !== 'COMPLETED') {
                const error = new Error('Only completed customer transfers can be reversed');
                error.statusCode = 409;
                throw error;
            }
            if (transfer.senderAccount.userId !== req.user.id) {
                const error = new Error('You do not own the transfer');
                error.statusCode = 403;
                throw error;
            }
            if (transfer.reversalOf) {
                const error = new Error('A compensating transfer cannot be reversed');
                error.statusCode = 409;
                throw error;
            }
            if (transfer.reversal) {
                const error = new Error('Transfer has already been reversed');
                error.statusCode = 409;
                throw error;
            }

            await tx.$queryRaw`
                SELECT id FROM "accounts"
                WHERE id IN (${transfer.senderAccountId}::uuid, ${transfer.receiverAccountId}::uuid)
                ORDER BY id FOR UPDATE
            `;

            const accounts = await tx.account.findMany({
                where: { id: { in: [transfer.senderAccountId, transfer.receiverAccountId] } },
                select: { id: true, status: true }
            });
            const senderAccount = accounts.find(account => account.id === transfer.senderAccountId);
            const receiverAccount = accounts.find(account => account.id === transfer.receiverAccountId);
            if (!senderAccount || !receiverAccount) {
                const error = new Error('Transfer account was not found');
                error.statusCode = 409;
                throw error;
            }
            if (senderAccount.status !== 'ACTIVE' || receiverAccount.status !== 'ACTIVE') {
                const error = new Error('Both accounts must be active to reverse this transfer');
                error.statusCode = 409;
                throw error;
            }

            const balanceRows = await tx.$queryRaw`
                SELECT COALESCE(SUM(
                    CASE WHEN entry_type = 'CREDIT' THEN amount_minor ELSE -amount_minor END
                ), 0)::bigint AS balance
                FROM "ledger_entries"
                WHERE account_id = ${transfer.receiverAccountId}::uuid
            `;
            if (BigInt(balanceRows[0].balance) < transfer.amountMinor) {
                const error = new Error('The recipient account has insufficient funds to reverse this transfer');
                error.statusCode = 409;
                throw error;
            }

            const reversalTransfer = await tx.transfer.create({
                data: {
                    senderAccountId: transfer.receiverAccountId,
                    receiverAccountId: transfer.senderAccountId,
                    amountMinor: transfer.amountMinor,
                    currency: transfer.currency,
                    status: 'COMPLETED',
                    reference: `REVERSAL:${transfer.id}`
                }
            });

            await tx.ledgerEntry.createMany({
                data: [
                    {
                        transferId: reversalTransfer.id,
                        accountId: transfer.receiverAccountId,
                        entryType: 'DEBIT',
                        amountMinor: transfer.amountMinor,
                        currency: transfer.currency
                    },
                    {
                        transferId: reversalTransfer.id,
                        accountId: transfer.senderAccountId,
                        entryType: 'CREDIT',
                        amountMinor: transfer.amountMinor,
                        currency: transfer.currency
                    }
                ]
            });

            await tx.transfer.update({
                where: { id: transfer.id },
                data: { status: 'REVERSED' }
            });

            const reversal = await tx.reversal.create({
                data: {
                    originalTransferId: transfer.id,
                    reversalTransferId: reversalTransfer.id,
                    requestedByUserId: req.user.id,
                    idempotencyKey
                },
                include: { reversalTransfer: true }
            });
            return { reversal, replayed: false };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        return res.status(result.replayed ? 200 : 201).json({
            reversal: {
                id: result.reversal.id,
                originalTransferId: result.reversal.originalTransferId,
                reversalTransferId: result.reversal.reversalTransferId,
                status: result.reversal.reversalTransfer.status,
                amountMinor: result.reversal.reversalTransfer.amountMinor.toString(),
                currency: result.reversal.reversalTransfer.currency.trim(),
                createdAt: result.reversal.createdAt.toISOString()
            },
            replayed: result.replayed
        });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: { message: 'Transfer has already been reversed or idempotency key is in use' } });
        }
        throw error;
    }
}

module.exports = { reverseTransfer };
