const db = require('../../config/db');

class LecturerModel {
    static async findAll() {
        const [rows] = await db.execute(`
            SELECT t.id, t.department, t.hire_date, u.email, u.is_active
            FROM lecturers t
            JOIN users u ON t.user_id = u.id
        `);
        return rows;
    }

    static async create(lecturerData) {
        const { email, passwordHash, department, hireDate } = lecturerData;
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const [roles] = await connection.execute('SELECT id FROM roles WHERE name = ?', ['LECTURER']);
            const roleId = roles[0].id;
            
            const [userResult] = await connection.execute(
                'INSERT INTO users (role_id, email, password_hash) VALUES (?, ?, ?)',
                [roleId, email, passwordHash]
            );
            
            const userId = userResult.insertId;
            
            const [lecturerResult] = await connection.execute(
                'INSERT INTO lecturers (user_id, department, hire_date) VALUES (?, ?, ?)',
                [userId, department, hireDate || null]
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
        const { email, department, hireDate } = lecturerData;
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
                'UPDATE lecturers SET department = ?, hire_date = ? WHERE id = ?',
                [department, hireDate || null, id]
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
