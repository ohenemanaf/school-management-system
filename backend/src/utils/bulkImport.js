const csv = require('csv-parser');
const { Readable } = require('stream');
const db = require('../config/db');
const emailService = require('./emailService');
const { generateTemporaryPassword, hashPassword } = require('./passwords');

const MAX_ROWS = 2000;

function parseCsv(buffer) {
    return new Promise((resolve, reject) => {
        const rows = [];
        Readable.from([buffer])
            .pipe(csv({ mapHeaders: ({ header }) => header.trim() }))
            .on('data', (row) => rows.push(row))
            .on('end', () => resolve(rows))
            .on('error', reject);
    });
}

/** First non-empty value among several possible CSV header spellings. */
function pick(row, ...headers) {
    for (const header of headers) {
        const value = row[header];
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
}

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

/**
 * Creates one account per CSV row in a single transaction.
 *
 * - Rows are validated and de-duplicated within the file before touching the database.
 * - Passwords are hashed in parallel before the transaction opens, so it stays short.
 * - Each row runs inside a savepoint: a row that fails (e.g. email already registered)
 *   is undone on its own and reported, without aborting the rest of the import.
 * - Welcome emails are sent only after the commit, so nobody receives credentials
 *   for an account that was rolled back.
 *
 * @param {object} options
 * @param {Buffer} options.buffer        uploaded CSV
 * @param {string} options.roleName      role for the new users
 * @param {(row) => object} options.toRecord  maps a CSV row to `{ email, uniqueKeys?, ... }` or `{ error }`
 * @param {(connection, userId, record) => Promise} options.insertProfile  inserts the role-specific row
 * @param {(record, password) => any[]} options.welcomeArgs  arguments for emailService.sendWelcomeEmail
 */
async function importAccounts({ buffer, roleName, toRecord, insertProfile, welcomeArgs }) {
    const rows = await parseCsv(buffer);
    if (rows.length === 0) throw badRequest('The CSV file has no data rows.');
    if (rows.length > MAX_ROWS) throw badRequest(`Import at most ${MAX_ROWS} rows at a time.`);

    const failed = [];
    const candidates = [];
    const seen = new Set();

    rows.forEach((row, index) => {
        const line = index + 2; // header is line 1
        const record = toRecord(row);
        if (record.error) {
            failed.push({ line, reason: record.error });
            return;
        }
        record.email = record.email.trim().toLowerCase();
        const keys = [`email:${record.email}`, ...(record.uniqueKeys || [])];
        if (keys.some((key) => seen.has(key))) {
            failed.push({ line, email: record.email, reason: 'Duplicate of an earlier row in this file' });
            return;
        }
        keys.forEach((key) => seen.add(key));
        candidates.push({ line, record });
    });

    // bcrypt runs on libuv's thread pool, so hashing in parallel uses several cores.
    await Promise.all(candidates.map(async (candidate) => {
        candidate.password = generateTemporaryPassword();
        candidate.hash = await hashPassword(candidate.password);
    }));

    const created = [];
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [roles] = await connection.execute('SELECT id FROM roles WHERE name = ?', [roleName]);
        if (roles.length === 0) throw new Error(`Role '${roleName}' not found`);

        for (const candidate of candidates) {
            await connection.query('SAVEPOINT import_row');
            try {
                const [userResult] = await connection.execute(
                    'INSERT INTO users (role_id, email, password_hash, must_change_password) VALUES (?, ?, ?, 1)',
                    [roles[0].id, candidate.record.email, candidate.hash]
                );
                await insertProfile(connection, userResult.insertId, candidate.record);
                await connection.query('RELEASE SAVEPOINT import_row');
                created.push(candidate);
            } catch (error) {
                if (!String(error.code || '').startsWith('ER_')) throw error;
                await connection.query('ROLLBACK TO SAVEPOINT import_row');
                failed.push({
                    line: candidate.line,
                    email: candidate.record.email,
                    reason: error.code === 'ER_DUP_ENTRY' ? 'Email or ID number already exists' : 'Invalid values in this row',
                });
            }
        }
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    // Send credentials in the background, one at a time, without delaying the response.
    (async () => {
        for (const { record, password } of created) {
            await emailService.sendWelcomeEmail(...welcomeArgs(record, password));
        }
    })().catch((error) => console.error('Failed while sending import welcome emails:', error));

    failed.sort((a, b) => a.line - b.line);
    return { successful: created.length, failed: failed.length, failedDetails: failed };
}

/** Express handler wrapper shared by the bulk upload controllers. */
const bulkUploadHandler = (options) => async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    try {
        const result = await importAccounts({ buffer: req.file.buffer, ...options });
        res.json({ message: 'Bulk upload completed', ...result });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Bulk upload failed:', error);
        res.status(500).json({ message: 'Server error during bulk upload' });
    }
};

module.exports = { importAccounts, bulkUploadHandler, parseCsv, pick };
