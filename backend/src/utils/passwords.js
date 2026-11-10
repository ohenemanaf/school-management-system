const crypto = require('crypto');
const bcrypt = require('bcrypt');

const MIN_LENGTH = 12;
const MAX_BYTES = 72; // bcrypt ignores anything past 72 bytes

/** Returns an error message, or null when the password is acceptable. */
function validatePassword(password) {
    if (typeof password !== 'string' || password.length < MIN_LENGTH || Buffer.byteLength(password, 'utf8') > MAX_BYTES) {
        return `Password must be at least ${MIN_LENGTH} characters and at most ${MAX_BYTES} UTF-8 bytes.`;
    }
    return null;
}

/** 16-character URL-safe temporary password (96 bits of randomness). */
function generateTemporaryPassword() {
    return crypto.randomBytes(12).toString('base64url');
}

const hashPassword = (password) => bcrypt.hash(password, 10);

module.exports = { validatePassword, generateTemporaryPassword, hashPassword };
