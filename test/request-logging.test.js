const request = require('supertest');

const app = require('../src/app');

describe('request URL redaction', () => {
    it('does not expose query-string tokens in 404 responses or access logs', async () => {
        const marker = 'test-only-verification-token';
        const originalWrite = process.stdout.write;
        let accessLog = '';
        process.stdout.write = function (chunk) {
            accessLog += String(chunk);
            return true;
        };

        let response;
        try {
            response = await request(app).get(`/missing-route?token=${marker}`);
        } finally {
            process.stdout.write = originalWrite;
        }

        expect(response.status).toBe(404);
        expect(response.text).not.toContain(marker);
        expect(response.body.error.message).toContain('/missing-route');
        expect(accessLog).toContain('/missing-route');
        expect(accessLog).not.toContain(marker);
    });
});
