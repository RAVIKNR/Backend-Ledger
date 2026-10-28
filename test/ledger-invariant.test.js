const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

afterAll(async () => {
    await prisma.$disconnect();
});

describe('posted transfer ledger invariants', () => {
    it('keeps every completed transfer balanced', async () => {
        const transfers = await prisma.transfer.findMany({
            where: { status: 'COMPLETED' },
            select: {
                id: true,
                senderAccountId: true,
                amountMinor: true,
                ledgerEntries: {
                    select: {
                        entryType: true,
                        amountMinor: true
                    }
                }
            }
        });

        for (const transfer of transfers) {
            const debits = transfer.ledgerEntries
                .filter((entry) => entry.entryType === 'DEBIT')
                .reduce((total, entry) => total + entry.amountMinor, 0n);
            const credits = transfer.ledgerEntries
                .filter((entry) => entry.entryType === 'CREDIT')
                .reduce((total, entry) => total + entry.amountMinor, 0n);

            if (transfer.senderAccountId === null) {
                expect(transfer.ledgerEntries).toHaveLength(1);
                expect(debits).toBe(0n);
                expect(credits).toBe(transfer.amountMinor);
            } else {
                expect(transfer.ledgerEntries).toHaveLength(2);
                expect(debits).toBe(transfer.amountMinor);
                expect(credits).toBe(transfer.amountMinor);
            }
        }
    });
});
