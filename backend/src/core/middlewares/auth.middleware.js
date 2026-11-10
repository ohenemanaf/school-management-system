const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const { secret: jwtSecret } = require('../../config/jwt');

// Routes an account may still use while it is required to change its password.
const PASSWORD_CHANGE_ROUTES = new Set([
    'GET /api/users/profile',
    'PUT /api/users/security/password',
]);

const authenticateToken = async (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    let payload;
    try {
        payload = jwt.verify(token, jwtSecret);
    } catch {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    try {
        // Re-read the account on every request so deactivation, deletion and
        // role changes take effect immediately instead of when the token expires.
        const [rows] = await db.execute(
            `SELECT u.id, u.email, u.is_active, u.must_change_password, r.name AS role
             FROM users u
             JOIN roles r ON u.role_id = r.id
             WHERE u.id = ?`,
            [payload.id]
        );
        const account = rows[0];
        if (!account || !account.is_active) {
            return res.status(401).json({ message: 'Account is not active.' });
        }

        req.user = {
            id: account.id,
            email: account.email,
            role: account.role,
            mustChangePassword: Boolean(account.must_change_password),
        };

        const route = `${req.method} ${req.originalUrl.split('?')[0]}`;
        if (req.user.mustChangePassword && !PASSWORD_CHANGE_ROUTES.has(route)) {
            return res.status(403).json({
                code: 'PASSWORD_CHANGE_REQUIRED',
                message: 'You must change your password before continuing.',
            });
        }
        next();
    } catch (error) {
        next(error);
    }
};

const requireRole = (roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
    }
    next();
};

module.exports = { authenticateToken, requireRole };
