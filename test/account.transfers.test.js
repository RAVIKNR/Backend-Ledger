jest.mock('jsonwebtoken', () => ({
    verify: jest.fn(() => ({ sub: '10000000-0000-4000-8000-000000000001' }))
}));

jest.mock('../src/config/db', () => ({
    prisma: {
        user: { findUnique: jest.fn() },
        account: { findFirst: jest.fn() },
        transfer: { findMany: jest.fn(), count: jest.fn() },
        $transaction: jest.fn()
    }
}));

const request = require('supertest');
const { prisma } = require('../src/config/db');
const app = require('../src/app');

const accountId = '20000000-0000-4000-8000-000000000001';
const userId = '10000000-0000-4000-8000-000000000001';

const account = { id: accountId };

function transfer(overrides = {}) {
    return {
        id: '30000000-0000-4000-8000-000000000001',
        reference: 'LG-TEST-1',
        senderAccountId: accountId,
        receiverAccountId: '20000000-0000-4000-8000-000000000002',
        amountMinor: 1250n,
        currency: 'INR ',
        status: 'COMPLETED',
        createdAt: new Date('2026-10-28T00:00:00.000Z'),
        updatedAt: new Date('2026-10-28T00:00:01.000Z'),
        failureReason: null,
        availableBalanceMinor: null,
        riskAssessment: null,
        ...overrides
    };
}

describe('account transfer history', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        prisma.user.findUnique.mockResolvedValue({ id: userId, status: 'ACTIVE' });
        prisma.account.findFirst.mockResolvedValue(account);
        prisma.$transaction.mockImplementation((queries) => Promise.all(queries));
        prisma.transfer.findMany.mockResolvedValue([]);
        prisma.transfer.count.mockResolvedValue(0);
    });

    it('returns populated successful and failed history with pagination', async () => {
        prisma.transfer.findMany.mockResolvedValue([
            transfer(),
            transfer({
                id: '30000000-0000-4000-8000-000000000002',
                reference: null,
                status: 'FAILED',
                failureReason: 'Insufficient Funds',
                availableBalanceMinor: 500n
            }),
            transfer({
                id: '30000000-0000-4000-8000-000000000003',
                senderAccountId: null,
                receiverAccountId: accountId,
                reference: 'ADMIN_FUNDING'
            })
        ]);
        prisma.transfer.count.mockResolvedValue(13);

        const response = await request(app)
            .get(`/api/accounts/${accountId}/transfers?page=2&pageSize=2`)
            .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body.transfers).toEqual(expect.arrayContaining([
            expect.objectContaining({ status: 'COMPLETED', amountMinor: '1250', reference: 'LG-TEST-1' }),
            expect.objectContaining({
                status: 'FAILED',
                reference: null,
                failureReason: 'Insufficient Funds',
                availableBalanceMinor: '500'
            })
        ]));
        expect(response.body.transfers).toEqual(expect.arrayContaining([
            expect.objectContaining({ senderAccountId: null, direction: 'INCOMING', reference: 'ADMIN_FUNDING' })
        ]));
        expect(response.body.pagination).toEqual({ page: 2, pageSize: 2, total: 13, totalPages: 7 });
        expect(prisma.transfer.findMany).toHaveBeenCalledWith(expect.objectContaining({
            skip: 2,
            take: 2,
            where: expect.objectContaining({ AND: expect.any(Array) })
        }));
    });

    it('returns a consistent empty history response', async () => {
        const response = await request(app)
            .get(`/api/accounts/${accountId}/transfers?page=1&pageSize=10`)
            .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            transfers: [],
            pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 }
        });
    });

    it('rejects invalid account IDs before querying history', async () => {
        const response = await request(app)
            .get('/api/accounts/not-an-uuid/transfers?page=1&pageSize=10')
            .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(400);
        expect(prisma.transfer.findMany).not.toHaveBeenCalled();
    });

    it('rejects unauthenticated history requests', async () => {
        const response = await request(app)
            .get(`/api/accounts/${accountId}/transfers?page=1&pageSize=10`);

        expect(response.status).toBe(401);
        expect(prisma.transfer.findMany).not.toHaveBeenCalled();
    });

    it('returns not found when the account belongs to another user', async () => {
        prisma.account.findFirst.mockResolvedValue(null);

        const response = await request(app)
            .get(`/api/accounts/${accountId}/transfers?page=1&pageSize=10`)
            .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(404);
        expect(prisma.transfer.findMany).not.toHaveBeenCalled();
    });
});
