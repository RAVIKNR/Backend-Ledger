const { requestContext } = require('../src/middleware/observability.middleware');

describe('request context logging', () => {
    it('uses a generated request id instead of caller-controlled header content', () => {
        const marker = 'test-only-private-header-marker';
        const req = {
            get: jest.fn().mockReturnValue(marker),
            method: 'GET',
            path: '/health'
        };
        const res = {
            set: jest.fn(),
            on: jest.fn()
        };
        const next = jest.fn();

        requestContext(req, res, next);

        expect(req.requestId).not.toBe(marker);
        expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/);
        expect(res.set).toHaveBeenCalledWith('x-request-id', req.requestId);
        expect(next).toHaveBeenCalled();
    });
});
