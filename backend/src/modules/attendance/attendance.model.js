const db = require('../../config/db');

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;

const clampLimit = (value) => Math.min(Math.max(parseInt(value, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

class AttendanceModel {
    /** Most recent records first, optionally filtered by group and date. Always capped. */
    static async findAll({ studentGroupId, date, limit } = {}) {
        const where = [];
        const params = [];
        if (studentGroupId) { where.push('a.student_group_id = ?'); params.push(studentGroupId); }
        if (date) { where.push('a.date = ?'); params.push(date); }

        // LIMIT is a validated integer, so it is safe to inline (mysql2 prepared
        // statements reject numeric placeholders for LIMIT).
        const [rows] = await db.execute(`
            SELECT a.id, a.date, a.status,
                   s.first_name, s.last_name, s.enrollment_number,
                   sg.name as student_group_name
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN student_groups sg ON a.student_group_id = sg.id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY a.date DESC, a.id DESC
            LIMIT ${clampLimit(limit)}`, params);
        return rows;
    }

    static async findByStudent(studentId) {
        const [rows] = await db.execute(`
            SELECT a.id, a.date, a.status, sg.name as student_group_name
            FROM attendance a
            JOIN student_groups sg ON a.student_group_id = sg.id
            WHERE a.student_id = ?
            ORDER BY a.date DESC
        `, [studentId]);
        return rows;
    }

    static async mark(studentId, studentGroupId, date, status) {
        const [result] = await db.execute(`
            INSERT INTO attendance (student_id, student_group_id, date, status)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE status = VALUES(status)
        `, [studentId, studentGroupId, date, status]);
        return result.insertId || result.affectedRows;
    }

    /**
     * Saves a whole class register in one statement. Students who are not in the
     * group are skipped and reported back.
     * @returns {{ saved: number, skipped: number[] }}
     */
    static async markBulk(studentGroupId, date, records) {
        const ids = [...new Set(records.map((r) => Number(r.studentId)))];
        const [members] = await db.query(
            'SELECT id FROM students WHERE student_group_id = ? AND id IN (?)',
            [studentGroupId, ids]
        );
        const memberIds = new Set(members.map((m) => m.id));

        const rows = records
            .filter((r) => memberIds.has(Number(r.studentId)))
            .map((r) => [Number(r.studentId), Number(studentGroupId), date, r.status]);
        const skipped = ids.filter((id) => !memberIds.has(id));

        if (rows.length > 0) {
            await db.query(
                `INSERT INTO attendance (student_id, student_group_id, date, status) VALUES ?
                 ON DUPLICATE KEY UPDATE status = VALUES(status)`,
                [rows]
            );
        }
        return { saved: rows.length, skipped };
    }

    static async getValidToken() {
        // Return a token that is unused and not expired
        const [rows] = await db.execute(`
            SELECT token FROM gate_tokens
            WHERE is_used = FALSE AND expires_at > NOW()
            ORDER BY created_at DESC LIMIT 1
        `);
        return rows.length ? rows[0].token : null;
    }

    static async createToken(tokenStr) {
        // Old tokens are never needed again; clearing them keeps the table small
        // and frees codes for reuse under the UNIQUE constraint.
        await db.execute('DELETE FROM gate_tokens WHERE expires_at < NOW() - INTERVAL 1 DAY');
        // 5 minute expiry
        await db.execute(`
            INSERT INTO gate_tokens (token, expires_at)
            VALUES (?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))
        `, [tokenStr]);
        return tokenStr;
    }

    /** Marks the token used if it is valid. A single statement, so two lecturers cannot share one token. */
    static async consumeToken(tokenStr) {
        const [result] = await db.execute(
            'UPDATE gate_tokens SET is_used = TRUE WHERE token = ? AND is_used = FALSE AND expires_at > NOW()',
            [tokenStr]
        );
        return result.affectedRows === 1;
    }
}

module.exports = AttendanceModel;
