const jwt = require('jsonwebtoken');
const { secret: jwtSecret } = require('../../config/jwt');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token.' });
        req.user = user;
        next();
    });
};
const requireRole = (roles) => {
    return (req, res, next) => {
        // Ensure 'user' was attached to 'req' by 'authenticateToken'
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    };
};

module.exports = { 
    authenticateToken, 
    requireRole};
