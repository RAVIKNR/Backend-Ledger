const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../src/app');

const databaseIsSafe = process.env.RUN_DB_TESTS === '1' &&
    /ledgerguard_test([?]|$)/.test(process.env.DATABASE_URL || '');
const prisma = new PrismaClient();

const describeDatabase = databaseIsSafe ? describe : describe.skip;

describeDatabase('database-backed account and transfer behavior', () => {
    const createdUserIds = [];
    let first;
    let second;
    let firstAccount;
    let secondAccount;

    async function register(email) {
        const response = await request(app).post('/auth/register').send({
            name: 'Test User',
            email,
            password: 'test-password-123'
        });
        expect(response.status).toBe(201);
        createdUserIds.push(response.body.user.id);
        await prisma.user.update({
            where: { id: response.body.user.id },
            data: {
                phone: '+919876543210',
                addressLine: '1 Ledger Street',
                city: 'Mumbai',
                region: 'MH',
                postalCode: '400001',
                country: 'IN'
            }
        });
        await prisma.emailOtpChallenge.create({
            data: {
                userId: response.body.user.id,
                email,
                otpHash: null,
                status: 'VERIFIED',
                windowStartedAt: new Date(),
                sendsInWindow: 1,
                sentAt: new Date(),
                expiresAt: new Date(Date.now() + 300000),
                resendAfterAt: new Date(),
                verificationAttempts: 0,
                verifiedAt: new Date()
            }
        });
        return response.body;
    }

    beforeAll(async () => {
        first = await register(`phase11-${Date.now()}-1@example.test`);
        second = await register(`phase11-${Date.now()}-2@example.test`);
        firstAccount = (await request(app).post('/accounts')
            .set('Authorization', `Bearer ${first.token}`)
            .send({ currency: 'INR' })).body.account;
        secondAccount = (await request(app).post('/accounts')
            .set('Authorization', `Bearer ${second.token}`)
            .send({ currency: 'INR' })).body.account;
    });

    afterAll(async () => {
        await prisma.adminDecision.deleteMany({ where: { adminUserId: { in: createdUserIds } } });
        await prisma.reversal.deleteMany({ where: { requestedByUserId: { in: createdUserIds } } });
        await prisma.ledgerEntry.deleteMany({ where: { account: { userId: { in: createdUserIds } } } });
        await prisma.riskAssessment.deleteMany({ where: { transfer: { senderAccount: { userId: { in: createdUserIds } } } } });
        await prisma.idempotencyKey.deleteMany({ where: { userId: { in: createdUserIds } } });
        await prisma.transfer.deleteMany({ where: { OR: [{ senderAccount: { userId: { in: createdUserIds } } }, { receiverAccount: { userId: { in: createdUserIds } } }] } });
        await prisma.account.deleteMany({ where: { userId: { in: createdUserIds } } });
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
        await prisma.$disconnect();
    });

    it('prevents one user from reading another user account', async () => {
        const response = await request(app)
            .get(`/accounts/${secondAccount.id}`)
            .set('Authorization', `Bearer ${first.token}`);
        expect(response.status).toBe(404);
    });

    it('rejects insufficient funds without creating a transfer', async () => {
        const before = await prisma.transfer.count({ where: { senderAccountId: firstAccount.id } });
        const response = await request(app).post('/transfers')
            .set('Authorization', `Bearer ${first.token}`)
            .set('Idempotency-Key', `phase11-insufficient-${Date.now()}`)
            .send({
                senderAccountId: firstAccount.id,
                receiverAccountId: secondAccount.id,
                amountMinor: 100,
                currency: 'INR'
            });
        expect(response.status).toBe(409);
        await expect(prisma.transfer.count({ where: { senderAccountId: firstAccount.id } })).resolves.toBe(before);
    });

    it('does not expose password hashes during registration', async () => {
        const user = await prisma.user.findUnique({ where: { id: first.user.id } });
        expect(user.passwordHash).toEqual(expect.any(String));
        expect(first.user.passwordHash).toBeUndefined();
    });
});
