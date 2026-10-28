jest.mock('../src/config/db', () => ({
    prisma: { user: { findUnique: jest.fn(), create: jest.fn() } }
}));

jest.mock('../src/services/email.services', () => ({
    sendVerificationEmail: jest.fn(),
    sendRegistrationConfirmationEmail: jest.fn().mockResolvedValue(undefined),
    sendLoginConfirmationEmail: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('google-auth-library', () => ({
    OAuth2Client: jest.fn().mockImplementation(() => ({
        verifyIdToken: jest.fn()
    }))
}));

const { prisma } = require('../src/config/db');
const { OAuth2Client } = require('google-auth-library');
const { googleAuth } = require('../src/controllers/auth.controller');

function response() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
}

function request(credential = 'valid-google-credential') {
    return { body: { credential } };
}

function verifiedPayload(payload) {
    return {
        iss: 'https://accounts.google.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        ...payload
    };
}

describe('Google authentication', () => {
    const verifyIdToken = OAuth2Client.mock.results[0].value.verifyIdToken;
    const originalClientId = process.env.GOOGLE_CLIENT_ID;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
        process.env.JWT_SECRET = 'test-jwt-secret';
    });

    afterAll(() => {
        process.env.GOOGLE_CLIENT_ID = originalClientId;
    });

    it('creates a new Google identity from a verified ID token', async () => {
        verifyIdToken.mockResolvedValueOnce({
            getPayload: () => verifiedPayload({
                sub: 'google-sub-1',
                email: 'new@example.com',
                email_verified: true,
                name: 'New Google User'
            })
        });
        prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
        prisma.user.create.mockResolvedValueOnce({
            id: 'user-1',
            email: 'new@example.com',
            name: 'New Google User',
            status: 'ACTIVE',
            createdAt: new Date()
        });
        const res = response();

        await googleAuth(request(), res);

        expect(verifyIdToken).toHaveBeenCalledWith({
            idToken: 'valid-google-credential',
            audience: 'test-client.apps.googleusercontent.com'
        });
        expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                email: 'new@example.com',
                name: 'New Google User',
                passwordHash: null,
                googleSubject: 'google-sub-1',
                emailVerifiedAt: expect.any(Date)
            })
        }));
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
    });

    it('signs in an existing Google identity', async () => {
        verifyIdToken.mockResolvedValueOnce({
            getPayload: () => verifiedPayload({ sub: 'google-sub-2', email: 'existing@example.com', email_verified: true })
        });
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'user-2',
            email: 'existing@example.com',
            name: 'Existing',
            status: 'ACTIVE',
            createdAt: new Date()
        });
        const res = response();

        await googleAuth(request(), res);

        expect(prisma.user.create).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
    });

    it('rejects invalid tokens and does not touch the database', async () => {
        const diagnostic = 'test-only-private-google-diagnostic';
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});
        verifyIdToken.mockRejectedValueOnce(new Error(diagnostic));
        const res = response();

        await googleAuth(request('invalid-google-credential'), res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
        expect(JSON.stringify(log.mock.calls)).not.toContain(diagnostic);
        log.mockRestore();
    });

    it('does not silently link an existing password account', async () => {
        verifyIdToken.mockResolvedValueOnce({
            getPayload: () => verifiedPayload({ sub: 'google-sub-3', email: 'password@example.com', email_verified: true })
        });
        prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
            id: 'user-3',
            email: 'password@example.com',
            passwordHash: 'bcrypt-hash',
            status: 'ACTIVE'
        });
        const res = response();

        await googleAuth(request(), res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects an unverified Google email, expired token, or wrong issuer', async () => {
        verifyIdToken.mockResolvedValueOnce({
            getPayload: () => verifiedPayload({
                sub: 'google-sub-invalid',
                email: 'invalid@example.com',
                email_verified: false,
                iss: 'https://accounts.google.com',
                exp: Math.floor(Date.now() / 1000) - 1
            })
        });
        const res = response();

        await googleAuth(request(), res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('rejects suspended Google users', async () => {
        verifyIdToken.mockResolvedValueOnce({
            getPayload: () => verifiedPayload({ sub: 'google-sub-suspended', email: 'suspended@example.com', email_verified: true })
        });
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'user-suspended',
            email: 'suspended@example.com',
            name: 'Suspended',
            status: 'SUSPENDED'
        });
        const res = response();

        await googleAuth(request(), res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: { message: 'User is not active' } });
    });
});
