const { reconcileSnapshot } = require('../src/services/reconciliation.service');

describe('reconciliation engine', () => {
    it('reports a deliberately missing credit without modifying records', () => {
        const discrepancies = reconcileSnapshot({
            accounts: [
                { id: 'sender', currency: 'INR' },
                { id: 'receiver', currency: 'INR' }
            ],
            transfers: [{
                id: 'transfer-1',
                senderAccountId: 'sender',
                receiverAccountId: 'receiver',
                amountMinor: 500n,
                currency: 'INR',
                status: 'COMPLETED'
            }],
            ledgerEntries: [{
                id: 'entry-1',
                transferId: 'transfer-1',
                accountId: 'sender',
                entryType: 'DEBIT',
                amountMinor: 500n,
                currency: 'INR'
            }]
        });

        expect(discrepancies).toEqual(expect.arrayContaining([
            expect.objectContaining({
                type: 'TRANSFER_LEDGER_MISMATCH',
                transferId: 'transfer-1'
            }),
            expect.objectContaining({
                type: 'ACCOUNT_BALANCE_MISMATCH',
                accountId: 'receiver'
            })
        ]));
    });
});
