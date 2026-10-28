const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { prisma } = require('../config/db');
const { sendVerificationEmail, sendRegistrationConfirmationEmail, sendLoginConfirmationEmail } = require('../services/email.services');

const googleClient = new OAuth2Client();
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const publicUserSelect = {
    id: true,
    name: true,
    email: true,
    status: true,
    createdAt: true,
    emailVerifiedAt: true
};

function createToken(user) {
    return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '3d' });
}

function publicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        createdAt: user.createdAt,
        emailVerifiedAt: user.emailVerifiedAt || null
    };
}

function createVerificationToken() {
    const token = crypto.randomBytes(32).toString('hex');
    return {
        token,
        tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS)
    };
}

function hashVerificationToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

async function registerUser(req, res) {
    const { name, email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);
    const verification = createVerificationToken();

    try {
        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                emailVerificationTokenHash: verification.tokenHash,
                emailVerificationTokenExpiresAt: verification.expiresAt,
                emailVerificationSentAt: new Date()
            },
            select: publicUserSelect
        });

        try {
            await sendVerificationEmail(user.email, user.name, verification.token);
        } catch (error) {
            console.error(JSON.stringify({
                event: 'verification_email_failed',
                operation: 'registration',
                errorName: error instanceof Error ? error.name : 'UnknownError'
            }));
            return res.status(503).json({ error: { message: 'Your account was created, but we could not send the verification email. Please try again shortly.' } });
        }

        res.status(201).json({
            user: publicUser(user),
            verificationRequired: true,
            message: 'Check your email to verify your account before signing in.'
        });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: { message: 'Email is already registered' } });
        }
        throw error;
    }
}

async function loginUser(req, res) {
    const user = await prisma.user.findUnique({
        where: { email: req.body.email },
        select: { ...publicUserSelect, passwordHash: true }
    });

    if (!user || !user.passwordHash || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
        return res.status(401).json({ error: { message: 'Invalid email or password' } });
    }
    if (user.status !== 'ACTIVE') {
        return res.status(401).json({ error: { message: 'This account is not active' } });
    }
    if (!user.emailVerifiedAt) {
        return res.status(403).json({ error: { message: 'Please verify your email before signing in' } });
    }

    res.status(200).json({ user: publicUser(user), token: createToken(user) });
    void sendLoginConfirmationEmail({
        email: user.email,
        name: user.name,
        occurredAt: new Date()
    }).catch(error => console.error(JSON.stringify({
        event: 'login_confirmation_email_failed',
        errorName: error instanceof Error ? error.name : 'UnknownError'
    })));
}

async function googleAuth(req, res) {
    const { credential } = req.body;
    if (typeof credential !== 'string' || credential.length < 20) {
        return res.status(400).json({ error: { message: 'A Google credential is required' } });
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(503).json({ error: { message: 'Google authentication is not configured' } });
    }

    let payload;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        payload = ticket.getPayload();
    } catch (error) {
        console.error(JSON.stringify({
            event: 'google_token_verification_failed',
            errorName: error instanceof Error ? error.name : 'UnknownError'
        }));
        return res.status(401).json({ error: { message: 'Invalid Google credential' } });
    }

    const validIssuer = payload && ['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss);
    const validExpiry = payload && Number.isFinite(payload.exp) && payload.exp > Math.floor(Date.now() / 1000);
    if (!payload || !payload.sub || !payload.email || payload.email_verified !== true || !validIssuer || !validExpiry) {
        return res.status(401).json({ error: { message: 'Invalid or unverified Google account' } });
    }

    const email = payload.email.toLowerCase();
    const existingGoogleUser = await prisma.user.findUnique({
        where: { googleSubject: payload.sub },
        select: publicUserSelect
    });
    if (existingGoogleUser) {
        if (existingGoogleUser.status !== 'ACTIVE') {
            return res.status(401).json({ error: { message: 'User is not active' } });
        }
        res.json({ user: publicUser(existingGoogleUser), token: createToken(existingGoogleUser) });
        void sendLoginConfirmationEmail({
            email: existingGoogleUser.email,
            name: existingGoogleUser.name,
            occurredAt: new Date()
        }).catch(error => console.error(JSON.stringify({
            event: 'login_confirmation_email_failed',
            provider: 'google',
            errorName: error instanceof Error ? error.name : 'UnknownError'
        })));
        return;
    }

    const existingEmailUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
    });
    if (existingEmailUser) {
        return res.status(409).json({
            error: { message: 'An account already exists for this email. Sign in with your password before linking Google.' }
        });
    }

    try {
        const user = await prisma.user.create({
            data: {
                email,
                name: (payload.name || payload.email.split('@')[0]).slice(0, 120),
                passwordHash: null,
                googleSubject: payload.sub,
                emailVerifiedAt: new Date()
            },
            select: publicUserSelect
        });
        res.status(201).json({ user: publicUser(user), token: createToken(user) });
        void sendRegistrationConfirmationEmail({
            email: user.email,
            name: user.name,
            occurredAt: new Date()
        }).catch(error => console.error(JSON.stringify({
            event: 'registration_confirmation_email_failed',
            provider: 'google',
            errorName: error instanceof Error ? error.name : 'UnknownError'
        })));
        return;
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: { message: 'This Google account is already registered' } });
        }
        throw error;
    }
}

async function verifyEmail(req, res) {
    const { token } = req.query;
    if (typeof token !== 'string' || token.length !== 64) {
        return res.status(400).json({ error: { message: 'This verification link is invalid or expired' } });
    }

    const tokenHash = hashVerificationToken(token);
    const verifiedUser = await prisma.user.findFirst({
        where: {
            emailVerificationTokenHash: tokenHash,
            emailVerificationTokenExpiresAt: { gt: new Date() },
            emailVerifiedAt: null
        },
        select: { id: true, email: true, name: true }
    });
    const result = await prisma.user.updateMany({
        where: {
            ...(verifiedUser ? { id: verifiedUser.id } : {}),
            emailVerificationTokenHash: tokenHash,
            emailVerificationTokenExpiresAt: { gt: new Date() },
            emailVerifiedAt: null
        },
        data: {
            emailVerifiedAt: new Date(),
            emailVerificationTokenHash: null,
            emailVerificationTokenExpiresAt: null,
            emailVerificationSentAt: null
        }
    });

    if (result.count !== 1) {
        return res.status(400).json({ error: { message: 'This verification link is invalid or expired' } });
    }

    void sendRegistrationConfirmationEmail({
        email: verifiedUser.email,
        name: verifiedUser.name,
        occurredAt: new Date()
    }).catch(error => console.error(JSON.stringify({
        event: 'registration_confirmation_email_failed',
        errorName: error instanceof Error ? error.name : 'UnknownError'
    })));
    return res.json({ message: 'Email verified successfully. You can now sign in.' });
}

async function resendVerification(req, res) {
    const email = req.body.email;
    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            name: true,
            emailVerifiedAt: true,
            googleSubject: true,
            emailVerificationSentAt: true
        }
    });
    if (!user || user.emailVerifiedAt || user.googleSubject) {
        return res.json({ message: 'If an eligible account exists, a verification email will be sent shortly.' });
    }

    if (user.emailVerificationSentAt && Date.now() - user.emailVerificationSentAt.getTime() < VERIFICATION_RESEND_COOLDOWN_MS) {
        return res.status(429).json({ error: { message: 'Please wait before requesting another verification email' } });
    }

    const verification = createVerificationToken();
    await prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerificationTokenHash: verification.tokenHash,
            emailVerificationTokenExpiresAt: verification.expiresAt,
            emailVerificationSentAt: new Date()
        },
        select: { id: true }
    });

    try {
        await sendVerificationEmail(user.email, user.name, verification.token);
    } catch (error) {
        console.error(JSON.stringify({
            event: 'verification_email_failed',
            operation: 'resend',
            errorName: error instanceof Error ? error.name : 'UnknownError'
        }));
        return res.status(503).json({ error: { message: 'We could not send the verification email. Please try again shortly.' } });
    }

    return res.json({ message: 'A new verification email has been sent.' });
}

function logoutUser(req, res) {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logged out successfully' });
}

module.exports = { registerUser, loginUser, googleAuth, verifyEmail, resendVerification, logoutUser };
