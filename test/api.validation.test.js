const request = require('supertest');
const app = require('../src/app');

describe('API validation and authorization boundaries', () => {
    it('returns a request ID and healthy response', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.headers['x-request-id']).toEqual(expect.any(String));
    });

    it('rejects an unauthenticated account request', async () => {
        const response = await request(app).get('/accounts/00000000-0000-0000-0000-000000000001');
        expect(response.status).toBe(401);
    });

    it('rejects a transfer without its required idempotency key', async () => {
        const response = await request(app).post('/transfers').send({
            senderAccountId: '00000000-0000-0000-0000-000000000001',
            receiverAccountId: '00000000-0000-0000-0000-000000000002',
            amountMinor: 100,
            currency: 'INR'
        });
        expect(response.status).toBe(401);
    });

    it('registers the resend verification route under the API prefix', async () => {
        const response = await request(app)
            .post('/api/auth/resend-verification')
            .send({ email: 'not-an-email' });

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('Validation failed');
    });

    it('registers the admin risk route under the API prefix', async () => {
        const response = await request(app).get('/api/admin/transfers/flagged');
        expect(response.status).toBe(401);
    });
});
