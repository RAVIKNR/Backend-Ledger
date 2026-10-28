jest.mock('jsonwebtoken', () => ({
    verify: jest.fn()
}));

jest.mock('../src/config/db', () => ({
    prisma: {
        user: { findUnique: jest.fn(), count: jest.fn() },
        account: { count: jest.fn() },
        transfer: { count: jest.fn() }
    }
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { prisma } = require('../src/config/db');
const app = require('../src/app');

const adminId = '10000000-0000-4000-8000-000000000001';
const userId = '20000000-0000-4000-8000-000000000002';
const originalJwtSecret = process.env.JWT_SECRET;
const originalAdminId = process.env.ADMIN_USER_ID;

describe('GET /api/admin/overview', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test-admin-jwt-secret';
        process.env.ADMIN_USER_ID = adminId;
        jwt.verify.mockImplementation((token) => ({ sub: token === 'admin-token' ? adminId : userId }));
        prisma.user.findUnique.mockImplementation(({ where }) => Promise.resolve({
            id: where.id,
            name: 'LedgerGuard User',
            email: 'user@example.com',
            status: 'ACTIVE',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            phone: null,
            addressLine: null,
            city: null,
            region: null,
            postalCode: null,
            country: null
        }));
    });

    afterAll(() => {
        if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = originalJwtSecret;
        if (originalAdminId === undefined) delete process.env.ADMIN_USER_ID;
        else process.env.ADMIN_USER_ID = originalAdminId;
    });

    it('requires authentication', async () => {
        const response = await request(app).get('/api/admin/overview');

        expect(response.status).toBe(401);
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('denies ordinary users even if they submit a forged administrator ID', async () => {
        const response = await request(app)
            .get('/api/admin/overview')
            .set('Authorization', 'Bearer user-token')
            .set('x-admin-user-id', adminId)
            .query({ userId: adminId });

        expect(response.status).toBe(403);
        expect(response.body.error.message).toBe('Administrator access required');
        expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: userId }
        }));
        expect(prisma.user.count).not.toHaveBeenCalled();
    });

    it('returns database-backed counts for the configured administrator', async () => {
        prisma.user.count.mockResolvedValue(17);
        prisma.account.count.mockResolvedValue(23);
        prisma.transfer.count
            .mockResolvedValueOnce(31)
            .mockResolvedValueOnce(4);

        const response = await request(app)
            .get('/api/admin/overview')
            .set('Authorization', 'Bearer admin-token');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            overview: {
                totalUsers: 17,
                totalAccounts: 23,
                totalTransfers: 31,
                pendingTransfers: 4
            }
        });
        expect(prisma.user.count).toHaveBeenCalledTimes(1);
        expect(prisma.account.count).toHaveBeenCalledTimes(1);
        expect(prisma.transfer.count.mock.calls[0]).toEqual([]);
        expect(prisma.transfer.count.mock.calls[1]).toEqual([{ where: { status: 'PENDING' } }]);
    });
});
