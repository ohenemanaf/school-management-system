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

/** Ids of the student groups a lecturer teaches, taken from the timetable. */
async function lecturerGroupIds(userId) {
    const [rows] = await db.execute(
        `SELECT DISTINCT ts.student_group_id
         FROM timetable_sessions ts
         JOIN lecturers l ON l.id = ts.lecturer_id
         WHERE l.user_id = ?`,
        [userId]
    );
    return rows.map((row) => row.student_group_id);
}

/**
 * Group scope for list endpoints: null means unrestricted, an array limits the
 * results to those groups (a lecturer's own classes).
 */
async function groupScopeFor(user) {
    return user.role === 'LECTURER' ? lecturerGroupIds(user.id) : null;
}

/** True when `groupId` is inside the scope (or the scope is unrestricted). */
const inScope = (scope, groupId) => scope === null || scope.includes(Number(groupId));

/** SQL fragment and params restricting `column` to the scope; null scope adds nothing. */
function scopeClause(column, scope) {
    if (scope === null) return { sql: '', params: [] };
    if (scope.length === 0) return { sql: '1 = 0', params: [] };
    return { sql: `${column} IN (${scope.map(() => '?').join(', ')})`, params: scope };
}

module.exports = { studentIdFor, lecturerIdFor, lecturerGroupIds, groupScopeFor, inScope, scopeClause };
