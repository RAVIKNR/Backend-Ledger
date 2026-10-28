jest.mock('../src/config/db', () => ({
    prisma: {
        user: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn()
        }
    }
}));

jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashed-password'),
    compare: jest.fn().mockResolvedValue(true)
}));

jest.mock('../src/services/email.services', () => ({
    sendVerificationEmail: jest.fn(),
    sendRegistrationConfirmationEmail: jest.fn().mockResolvedValue(undefined),
    sendLoginConfirmationEmail: jest.fn().mockResolvedValue(undefined)
}));

const { prisma } = require('../src/config/db');
const { sendVerificationEmail, sendRegistrationConfirmationEmail, sendLoginConfirmationEmail } = require('../src/services/email.services');
const { registerUser, loginUser, verifyEmail, resendVerification } = require('../src/controllers/auth.controller');

function response() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
}

describe('Email verification', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test-jwt-secret';
    });

    it('creates an unverified account, sends a verification email, and does not issue a JWT', async () => {
        const createdAt = new Date();
        prisma.user.create.mockResolvedValueOnce({
            id: 'user-1',
            email: 'new@example.com',
            name: 'New User',
            status: 'ACTIVE',
            createdAt,
            emailVerifiedAt: null
        });
        const res = response();

        await registerUser({
            body: {
                name: 'New User',
                email: 'new@example.com',
                password: 'secret123',
                role: 'ADMIN'
            }
        }, res);

        expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ name: 'New User', email: 'new@example.com' })
        }));
        expect(prisma.user.create.mock.calls[0][0].data).not.toHaveProperty('role');
        expect(sendVerificationEmail).toHaveBeenCalledWith('new@example.com', 'New User', expect.any(String));
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ verificationRequired: true }));
        expect(res.json.mock.calls[0][0]).not.toHaveProperty('token');
    });

    it('does not log provider diagnostics when verification email delivery fails', async () => {
        const diagnostic = 'test-only-private-provider-diagnostic';
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});
        prisma.user.create.mockResolvedValueOnce({
            id: 'user-1',
            email: 'new@example.com',
            name: 'New User',
            status: 'ACTIVE',
            createdAt: new Date(),
            emailVerifiedAt: null
        });
        sendVerificationEmail.mockRejectedValueOnce(new Error(diagnostic));
        const res = response();

        await registerUser({
            body: { name: 'New User', email: 'new@example.com', password: 'secret123' }
        }, res);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(JSON.stringify(log.mock.calls)).not.toContain(diagnostic);
    });

    it('rejects an unverified password login', async () => {
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'user-2',
            email: 'unverified@example.com',
            passwordHash: '$2b$12$KIXL4c1kYv4p5y8h6u8u6eJ9QfQ6Z5J7V8C4vVq2rFJ5hVn6o7o6i',
            status: 'ACTIVE',
            emailVerifiedAt: null
        });

        const res = response();

        await loginUser({ body: { email: 'unverified@example.com', password: 'secret123' } }, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: { message: 'Please verify your email before signing in' } });
    });

    it('sends a sign-in confirmation only after successful authentication', async () => {
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'user-4',
            email: 'verified@example.com',
            name: 'Verified User',
            passwordHash: 'stored-hash',
            status: 'ACTIVE',
            emailVerifiedAt: new Date()
        });
        const res = response();

        await loginUser({ body: { email: 'verified@example.com', password: 'secret123' } }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(sendLoginConfirmationEmail).toHaveBeenCalledWith(expect.objectContaining({
            email: 'verified@example.com',
            name: 'Verified User',
            occurredAt: expect.any(Date)
        }));
    });

    it('marks a valid token verified and clears it so it cannot be reused', async () => {
        prisma.user.findFirst.mockResolvedValueOnce({
            id: 'user-5',
            email: 'verified@example.com',
            name: 'Verified User'
        });
        prisma.user.updateMany.mockResolvedValueOnce({ count: 1 });
        const res = response();

        await verifyEmail({ query: { token: 'a'.repeat(64) } }, res);

        expect(prisma.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                emailVerifiedAt: expect.any(Date),
                emailVerificationTokenHash: null
            })
        }));
        expect(res.json).toHaveBeenCalledWith({ message: 'Email verified successfully. You can now sign in.' });
        expect(sendRegistrationConfirmationEmail).toHaveBeenCalledWith(expect.objectContaining({
            email: 'verified@example.com',
            name: 'Verified User',
            occurredAt: expect.any(Date)
        }));
    });

    it('rejects invalid, expired, or reused tokens', async () => {
        prisma.user.updateMany.mockResolvedValueOnce({ count: 0 });
        const res = response();

        await verifyEmail({ query: { token: 'b'.repeat(64) } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: { message: 'This verification link is invalid or expired' } });
    });

    it('enforces the resend cooldown', async () => {
        prisma.user.findUnique.mockResolvedValueOnce({
            id: 'user-3',
            email: 'cooldown@example.com',
            name: 'Cooldown',
            emailVerifiedAt: null,
            googleSubject: null,
            emailVerificationSentAt: new Date()
        });
        const res = response();

        await resendVerification({ body: { email: 'cooldown@example.com' } }, res);

        expect(res.status).toHaveBeenCalledWith(429);
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('returns a conflict when concurrent registration loses the unique email race', async () => {
        prisma.user.create.mockRejectedValueOnce({ code: 'P2002' });
        const res = response();

        await registerUser({ body: { name: 'Duplicate', email: 'duplicate@example.com', password: 'secret123' } }, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({ error: { message: 'Email is already registered' } });
        expect(sendVerificationEmail).not.toHaveBeenCalled();
    });
});
