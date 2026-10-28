const mockTransaction = jest.fn();

jest.mock('../src/config/db', () => ({
    prisma: { $transaction: jest.fn((...args) => mockTransaction(...args)) }
}));

const { prisma } = require('../src/config/db');
const { reverseTransfer } = require('../src/controllers/reversal.controller');

const originalTransfer = {
    id: 'transfer-1',
    senderAccountId: 'sender-account',
    receiverAccountId: 'receiver-account',
    amountMinor: 500n,
    currency: 'INR',
    status: 'COMPLETED',
    reversal: null,
    reversalOf: null,
    senderAccount: { userId: 'user-1' }
};

function createTransaction({ recipientBalance = 500n, statuses = ['ACTIVE', 'ACTIVE'] } = {}) {
    let balanceRead = false;
    const tx = {
        reversal: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
                id: 'reversal-1',
                originalTransferId: 'transfer-1',
                reversalTransferId: 'reversal-transfer-1',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                reversalTransfer: {
                    id: 'reversal-transfer-1',
                    status: 'COMPLETED',
                    amountMinor: 500n,
                    currency: 'INR',
                    createdAt: new Date('2026-01-01T00:00:00.000Z')
                }
            })
        },
        transfer: {
            findUnique: jest.fn().mockResolvedValue(originalTransfer),
            create: jest.fn().mockResolvedValue({ id: 'reversal-transfer-1' }),
            update: jest.fn().mockResolvedValue({})
        },
        account: {
            findMany: jest.fn().mockResolvedValue([
                { id: 'sender-account', status: statuses[0] },
                { id: 'receiver-account', status: statuses[1] }
            ])
        },
        ledgerEntry: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
        $queryRaw: jest.fn().mockImplementation(() => {
            if (!balanceRead) {
                balanceRead = true;
                return Promise.resolve([]);
            }
            return Promise.resolve([{ balance: recipientBalance }]);
        })
    };
    return tx;
}

function makeRequest() {
    return {
        params: { transferId: 'transfer-1' },
        user: { id: 'user-1' },
        get: jest.fn().mockReturnValue('reversal-key-1')
    };
}

function makeResponse() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
}

describe('transfer reversal balance safeguards', () => {
    beforeEach(() => jest.clearAllMocks());

    it('rejects a reversal that would overdraw the recipient and writes no ledger data', async () => {
        const tx = createTransaction({ recipientBalance: 499n });
        mockTransaction.mockImplementation(callback => callback(tx));

        await expect(reverseTransfer(makeRequest(), makeResponse()))
            .rejects.toMatchObject({
                statusCode: 409,
                message: 'The recipient account has insufficient funds to reverse this transfer'
            });

        expect(tx.transfer.create).not.toHaveBeenCalled();
        expect(tx.ledgerEntry.createMany).not.toHaveBeenCalled();
        expect(tx.transfer.update).not.toHaveBeenCalled();
        expect(tx.reversal.create).not.toHaveBeenCalled();
    });

    it('posts a reversal atomically when the recipient has the full amount available', async () => {
        const tx = createTransaction({ recipientBalance: 500n });
        mockTransaction.mockImplementation(callback => callback(tx));
        const res = makeResponse();

        await reverseTransfer(makeRequest(), res);

        expect(tx.transfer.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                senderAccountId: 'receiver-account',
                receiverAccountId: 'sender-account',
                amountMinor: 500n,
                status: 'COMPLETED'
            })
        });
        expect(tx.ledgerEntry.createMany).toHaveBeenCalledTimes(1);
        expect(tx.transfer.update).toHaveBeenCalledWith({
            where: { id: 'transfer-1' },
            data: { status: 'REVERSED' }
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
            isolationLevel: 'Serializable'
        });
    });

    it('does not reverse transfers involving a frozen account', async () => {
        const tx = createTransaction({ statuses: ['ACTIVE', 'FROZEN'] });
        mockTransaction.mockImplementation(callback => callback(tx));

        await expect(reverseTransfer(makeRequest(), makeResponse()))
            .rejects.toMatchObject({ statusCode: 409 });

        expect(tx.transfer.create).not.toHaveBeenCalled();
        expect(tx.ledgerEntry.createMany).not.toHaveBeenCalled();
    });
});
