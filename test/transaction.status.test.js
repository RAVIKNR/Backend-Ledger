jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));

jest.mock('../src/config/db', () => ({
    prisma: {
        user: { findUnique: jest.fn() },
        idempotencyKey: { findUnique: jest.fn() }
    }
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { prisma } = require('../src/config/db');
const app = require('../src/app');

const userId = '10000000-0000-4000-8000-000000000001';
const idempotencyKey = '8d0b4f03-7760-48a8-96fd-1ddaa08e5a65';

describe('idempotent transfer status lookup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test-transaction-status-secret';
        jwt.verify.mockReturnValue({ sub: userId });
        prisma.user.findUnique.mockResolvedValue({ id: userId, status: 'ACTIVE' });
    });

    afterAll(() => {
        delete process.env.JWT_SECRET;
    });

    it('returns only the authenticated user’s transfer for the supplied request key', async () => {
        const createdAt = new Date('2026-06-01T12:30:00.000Z');
        prisma.idempotencyKey.findUnique.mockResolvedValue({
            userId,
            key: idempotencyKey,
            transfer: {
                id: '20000000-0000-4000-8000-000000000002',
                senderAccountId: '30000000-0000-4000-8000-000000000003',
                receiverAccountId: '40000000-0000-4000-8000-000000000004',
                amountMinor: 2350n,
                currency: 'INR ',
                status: 'COMPLETED',
                createdAt,
                riskAssessment: null
            }
        });

        const response = await request(app)
            .get('/api/transaction/status')
            .set('Authorization', 'Bearer status-test-token')
            .set('Idempotency-Key', idempotencyKey);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            replayed: true,
            transfer: {
                amountMinor: '2350',
                currency: 'INR',
                status: 'COMPLETED',
                createdAt: createdAt.toISOString()
            }
        });
        expect(prisma.idempotencyKey.findUnique).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId_key: { userId, key: idempotencyKey } }
        }));
    });

    it('reports an unknown request key without creating or resubmitting a transfer', async () => {
        prisma.idempotencyKey.findUnique.mockResolvedValue(null);

        const response = await request(app)
            .get('/api/transaction/status')
            .set('Authorization', 'Bearer status-test-token')
            .set('Idempotency-Key', idempotencyKey);

        expect(response.status).toBe(404);
        expect(response.body.error.message).toMatch(/No transfer is recorded/);
        expect(prisma.idempotencyKey.findUnique).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId_key: { userId, key: idempotencyKey } }
        }));
    });

    it('requires authentication and an idempotency key', async () => {
        const unauthenticated = await request(app).get('/api/transaction/status');
        const missingKey = await request(app)
            .get('/api/transaction/status')
            .set('Authorization', 'Bearer status-test-token');

        expect(unauthenticated.status).toBe(401);
        expect(missingKey.status).toBe(400);
        expect(prisma.idempotencyKey.findUnique).not.toHaveBeenCalled();
    });
});
