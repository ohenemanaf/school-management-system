const db = require('../config/db');

/** Student row id for the logged-in user, or null. */
async function studentIdFor(userId) {
    const [rows] = await db.execute('SELECT id FROM students WHERE user_id = ?', [userId]);
    return rows.length ? rows[0].id : null;
}

/** Lecturer row id for the logged-in user, or null. */
async function lecturerIdFor(userId) {
    const [rows] = await db.execute('SELECT id FROM lecturers WHERE user_id = ?', [userId]);
    return rows.length ? rows[0].id : null;
}

module.exports = { studentIdFor, lecturerIdFor };
