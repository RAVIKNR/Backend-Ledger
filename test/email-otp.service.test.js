jest.mock('nodemailer', () => ({
    createTransport: jest.fn()
}));

const nodemailer = require('nodemailer');
const {
    EmailOtpConfigurationError,
    EmailOtpDeliveryError,
    assertEmailOtpConfiguration,
    sendEmailOtp
} = require('../src/services/email-otp.service');

describe('Gmail SMTP email OTP delivery', () => {
    const originalEnvironment = {
        NODE_ENV: process.env.NODE_ENV,
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS,
        EMAIL_OTP_DELIVERY_MODE: process.env.EMAIL_OTP_DELIVERY_MODE
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.SMTP_HOST = 'smtp.gmail.com';
        process.env.SMTP_PORT = '587';
        process.env.SMTP_USER = 'ledgerguard@example.test';
        process.env.SMTP_PASS = 'test-app-password';
        delete process.env.EMAIL_OTP_DELIVERY_MODE;
        nodemailer.createTransport.mockReturnValue({ sendMail: jest.fn().mockResolvedValue({}) });
    });

    afterAll(() => {
        for (const [key, value] of Object.entries(originalEnvironment)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });

    it('sends the generated code through configured Gmail STARTTLS without returning provider data', async () => {
        await expect(sendEmailOtp('user@example.test', '123456')).resolves.toBeUndefined();

        expect(nodemailer.createTransport).toHaveBeenCalledWith({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: { user: 'ledgerguard@example.test', pass: 'test-app-password' }
        });
        const transport = nodemailer.createTransport.mock.results[0].value;
        expect(transport.sendMail).toHaveBeenCalledWith(expect.objectContaining({
            from: 'ledgerguard@example.test',
            to: 'user@example.test',
            subject: 'Your LedgerGuard verification code',
            text: expect.stringContaining('123456'),
            html: expect.stringContaining('ledger')
        }));
        const mail = transport.sendMail.mock.calls[0][0];
        expect(mail.html).toContain('expires in <strong');
        expect(mail.text).toContain('expires in five minutes');
        expect(mail.text).toContain('never ask you to share your password');
    });

    it('fails safely when SMTP credentials are missing', async () => {
        delete process.env.SMTP_PASS;

        await expect(sendEmailOtp('user@example.test', '123456')).rejects.toMatchObject({
            name: EmailOtpConfigurationError.name,
            settings: ['SMTP_PASS']
        });
        expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });

    it('sanitizes SMTP send failures', async () => {
        nodemailer.createTransport.mockReturnValue({
            sendMail: jest.fn().mockRejectedValue(new Error('sensitive SMTP diagnostic'))
        });

        await expect(sendEmailOtp('user@example.test', '123456')).rejects.toMatchObject({
            name: EmailOtpDeliveryError.name
        });
    });

    it('delivers to the local Mailpit test server only in development without SMTP credentials', async () => {
        process.env.NODE_ENV = 'development';
        process.env.EMAIL_OTP_DELIVERY_MODE = 'mailpit';
        delete process.env.SMTP_USER;
        delete process.env.SMTP_PASS;

        expect(assertEmailOtpConfiguration()).toMatchObject({
            deliveryMode: 'mailpit',
            host: '127.0.0.1',
            port: 1025
        });
        await expect(sendEmailOtp('user@example.test', '123456')).resolves.toBeUndefined();

        expect(nodemailer.createTransport).toHaveBeenCalledWith({
            host: '127.0.0.1',
            port: 1025,
            secure: false,
            requireTLS: false
        });
        expect(nodemailer.createTransport.mock.results[0].value.sendMail).toHaveBeenCalledWith(expect.objectContaining({
            from: 'LedgerGuard <no-reply@ledgerguard.test>',
            to: 'user@example.test',
            html: expect.stringContaining('ledger')
        }));
    });

    it('refuses the Mailpit delivery mode outside development', () => {
        process.env.NODE_ENV = 'production';
        process.env.EMAIL_OTP_DELIVERY_MODE = 'mailpit';

        expect(assertEmailOtpConfiguration).toThrow(EmailOtpConfigurationError);
        expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });
});
