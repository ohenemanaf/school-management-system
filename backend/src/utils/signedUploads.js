const crypto = require('crypto');
const { secret } = require('../config/jwt');

// Uploaded files (student photos, library PDFs) are served only through links
// the API hands to logged-in users. <img> and <a> tags cannot send the bearer
// token, so each link carries an expiry and an HMAC instead.

const KEY = crypto.createHmac('sha256', secret).update('signed-uploads-v1').digest();
const BUCKET_SECONDS = 3600;      // links are identical within an hour, so browsers can cache
const LIFETIME_SECONDS = 12 * 3600;

const signature = (path, exp) => crypto.createHmac('sha256', KEY).update(`${path}:${exp}`).digest('base64url');

/** Adds `?exp=&sig=` to a local /uploads/ path; anything else is returned unchanged. */
function signUploadUrl(value, now = Date.now()) {
    if (typeof value !== 'string' || !value.startsWith('/uploads/')) return value;
    const path = value.split('?')[0];
    const bucketStart = Math.floor(now / 1000 / BUCKET_SECONDS) * BUCKET_SECONDS;
    const exp = bucketStart + LIFETIME_SECONDS;
    return `${path}?exp=${exp}&sig=${signature(path, exp)}`;
}

/** Signs the given fields on one row or a list of rows. */
function signFields(rows, ...fields) {
    const sign = (row) => {
        if (!row) return row;
        const copy = { ...row };
        for (const field of fields) copy[field] = signUploadUrl(copy[field]);
        return copy;
    };
    return Array.isArray(rows) ? rows.map(sign) : sign(rows);
}

/** Express middleware for the /uploads mount: lets through only valid, unexpired links. */
function requireSignedUpload(req, res, next) {
    const path = `/uploads${req.path}`;
    const exp = Number(req.query.exp);
    const sig = typeof req.query.sig === 'string' ? req.query.sig : '';
    const expected = Buffer.from(signature(path, exp));
    const given = Buffer.from(sig);
    const valid = Number.isInteger(exp)
        && exp * 1000 > Date.now()
        && given.length === expected.length
        && crypto.timingSafeEqual(given, expected);
    if (!valid) return res.status(403).json({ message: 'This file link is invalid or has expired.' });
    res.setHeader('Cache-Control', 'private, max-age=3600');
    next();
}

module.exports = { signUploadUrl, signFields, requireSignedUpload };
