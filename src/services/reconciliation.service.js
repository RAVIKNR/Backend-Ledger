const { prisma } = require('../config/db');

function addDiscrepancy(discrepancies, type, details) {
    discrepancies.push({ type, ...details });
}

function reconcileSnapshot({ accounts, transfers, ledgerEntries }) {
    const discrepancies = [];
    const entriesByTransfer = new Map();
    const entriesByAccount = new Map();

    for (const entry of ledgerEntries) {
        if (!entriesByTransfer.has(entry.transferId)) {
            entriesByTransfer.set(entry.transferId, []);
        }
        entriesByTransfer.get(entry.transferId).push(entry);

        if (!entriesByAccount.has(entry.accountId)) {
            entriesByAccount.set(entry.accountId, []);
        }
        entriesByAccount.get(entry.accountId).push(entry);
    }

    for (const transfer of transfers) {
        const entries = entriesByTransfer.get(transfer.id) || [];
        const amount = BigInt(transfer.amountMinor);
        const debits = entries.filter((entry) => entry.entryType === 'DEBIT');
        const credits = entries.filter((entry) => entry.entryType === 'CREDIT');
        const debitTotal = debits.reduce((total, entry) => total + BigInt(entry.amountMinor), 0n);
        const creditTotal = credits.reduce((total, entry) => total + BigInt(entry.amountMinor), 0n);

        if (transfer.status === 'COMPLETED' || transfer.status === 'REVERSED') {
            const expectedCount = transfer.senderAccountId === null ? 1 : 2;
            if (entries.length !== expectedCount ||
                (transfer.senderAccountId === null
                    ? debitTotal !== 0n || creditTotal !== amount
                    : debitTotal !== amount || creditTotal !== amount)) {
                addDiscrepancy(discrepancies, 'TRANSFER_LEDGER_MISMATCH', {
                    transferId: transfer.id,
                    expectedAmountMinor: amount.toString(),
                    debitTotalMinor: debitTotal.toString(),
                    creditTotalMinor: creditTotal.toString(),
                    entryCount: entries.length
                });
            }
        } else if (entries.length > 0) {
            addDiscrepancy(discrepancies, 'STATUS_WITH_POSTINGS', {
                transferId: transfer.id,
                status: transfer.status,
                entryCount: entries.length
            });
        }

        const postingKeys = new Set();
        for (const entry of entries) {
            const key = `${entry.accountId}:${entry.entryType}:${entry.amountMinor}:${entry.currency}`;
            if (postingKeys.has(key)) {
                addDiscrepancy(discrepancies, 'DUPLICATE_POSTING', {
                    transferId: transfer.id,
                    ledgerEntryId: entry.id,
                    postingKey: key
                });
            }
            postingKeys.add(key);
        }
    }

    for (const account of accounts) {
        const entries = entriesByAccount.get(account.id) || [];
        const ledgerBalance = entries.reduce((balance, entry) => {
            const amount = BigInt(entry.amountMinor);
            return entry.entryType === 'CREDIT' ? balance + amount : balance - amount;
        }, 0n);
        const projectedBalance = transfers.reduce((balance, transfer) => {
            if (!['COMPLETED', 'REVERSED'].includes(transfer.status) ||
                transfer.currency.trim() !== account.currency.trim()) {
                return balance;
            }
            const amount = BigInt(transfer.amountMinor);
            if (transfer.receiverAccountId === account.id) return balance + amount;
            if (transfer.senderAccountId === account.id) return balance - amount;
            return balance;
        }, 0n);

        if (ledgerBalance !== projectedBalance) {
            addDiscrepancy(discrepancies, 'ACCOUNT_BALANCE_MISMATCH', {
                accountId: account.id,
                ledgerBalanceMinor: ledgerBalance.toString(),
                projectedBalanceMinor: projectedBalance.toString()
            });
        }
    }

    return discrepancies;
}

async function runReconciliation() {
    const [accounts, transfers, ledgerEntries] = await Promise.all([
        prisma.account.findMany({ select: { id: true, currency: true } }),
        prisma.transfer.findMany({
            select: {
                id: true,
                senderAccountId: true,
                receiverAccountId: true,
                amountMinor: true,
                currency: true,
                status: true
            }
        }),
        prisma.ledgerEntry.findMany({
            select: {
                id: true,
                transferId: true,
                accountId: true,
                entryType: true,
                amountMinor: true,
                currency: true
            }
        })
    ]);
    const discrepancies = reconcileSnapshot({ accounts, transfers, ledgerEntries });
    const completedAt = new Date();

    return prisma.reconciliationRun.create({
        data: {
            completedAt,
            status: discrepancies.length === 0 ? 'PASSED' : 'DISCREPANCIES_FOUND',
            recordsChecked: transfers.length + ledgerEntries.length + accounts.length,
            discrepancies
        }
    });
}

module.exports = { reconcileSnapshot, runReconciliation };
