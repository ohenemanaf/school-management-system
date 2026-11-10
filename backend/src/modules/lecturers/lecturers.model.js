const db = require('../../config/db');

class LecturerModel {
    static async findAll() {
        const [rows] = await db.execute(`
            SELECT t.id, t.first_name, t.last_name, t.department, t.hire_date, u.email, u.is_active
            FROM lecturers t
            JOIN users u ON t.user_id = u.id
        `);
        return rows;
    }

    static async create(lecturerData) {
        const { email, passwordHash, firstName, lastName, department, hireDate } = lecturerData;
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const [roles] = await connection.execute('SELECT id FROM roles WHERE name = ?', ['LECTURER']);
            const roleId = roles[0].id;
            
            const [userResult] = await connection.execute(
                'INSERT INTO users (role_id, email, password_hash, must_change_password) VALUES (?, ?, ?, 1)',
                [roleId, email, passwordHash]
            );
            
            const userId = userResult.insertId;
            
            const [lecturerResult] = await connection.execute(
                'INSERT INTO lecturers (user_id, first_name, last_name, department, hire_date) VALUES (?, ?, ?, ?, ?)',
                [userId, firstName, lastName, department, hireDate || null]
            );
            
            await connection.commit();
            return lecturerResult.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async delete(id) {
        const [lecturer] = await db.execute('SELECT user_id FROM lecturers WHERE id = ?', [id]);
        if (lecturer.length > 0) {
            await db.execute('DELETE FROM users WHERE id = ?', [lecturer[0].user_id]);
            return true;
        }
        return false;
    }

    static async update(id, lecturerData) {
        const { email, firstName, lastName, department, hireDate } = lecturerData;
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const [lecturer] = await connection.execute('SELECT user_id FROM lecturers WHERE id = ?', [id]);
            if (lecturer.length === 0) throw new Error('Lecturer not found');
            const userId = lecturer[0].user_id;

            await connection.execute(
                'UPDATE users SET email = ? WHERE id = ?',
                [email, userId]
            );
            
            await connection.execute(
                `UPDATE lecturers SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name),
                     department = ?, hire_date = ? WHERE id = ?`,
                [firstName || null, lastName || null, department, hireDate || null, id]
            );
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}
module.exports = LecturerModel;
