const { authenticate } = require('./account.middleware');

function requireAdmin(req, res, next) {
    if (req.user.id !== process.env.ADMIN_USER_ID && req.user.isAdmin !== true) {
        return res.status(403).json({ error: { message: 'Administrator access required' } });
    }

    next();
}

module.exports = { authenticate, requireAdmin };
