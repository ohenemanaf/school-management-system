const rateLimit = require('express-rate-limit');

const tooMany = (message) => ({ standardHeaders: 'draft-7', legacyHeaders: false, message: { message } });

// Failed logins only; successful ones do not count against the user.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    ...tooMany('Too many login attempts. Try again in 15 minutes.'),
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    ...tooMany('Too many registrations from this address. Try again later.'),
});

// Per lecturer, so guessing gate tokens is not practical.
const checkInLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 10,
    keyGenerator: (req) => `lecturer:${req.user.id}`,
    ...tooMany('Too many check-in attempts. Ask the gatekeeper for a fresh code.'),
});

module.exports = { loginLimiter, registerLimiter, checkInLimiter };
