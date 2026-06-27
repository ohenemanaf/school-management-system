const db = require('../../config/db');

class StudentModel {
    static async getNextEnrollmentNumber() {
        const [rows] = await db.execute('SELECT id FROM students ORDER BY id DESC LIMIT 1');
        const nextId = rows.length > 0 ? rows[0].id + 1 : 1;
        const currentYear = new Date().getFullYear();
        return `SMS-${currentYear}-${String(nextId).padStart(4, '0')}`;
    }

    static async findAll() {
        const [rows] = await db.execute(`
            SELECT s.*, u.email, u.is_active, sg.name as student_group_name, sg.level 
            FROM students s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN student_groups sg ON s.student_group_id = sg.id
        `);
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute(`
            SELECT s.*, u.email, u.is_active, sg.name as student_group_name, sg.level
            FROM students s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN student_groups sg ON s.student_group_id = sg.id
            WHERE s.id = ?
        `, [id]);
        return rows[0];
    }

    static async create(studentData) {
        const { 
            email, passwordHash, firstName, lastName, enrollmentNumber, dateOfBirth, gender,
            profileImageUrl, address, guardianName, guardianPhone, medicalConditions, bloodGroup, studentGroupId
        } = studentData;
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const [roles] = await connection.execute('SELECT id FROM roles WHERE name = ?', ['STUDENT']);
            const roleId = roles[0].id;
            
            const [userResult] = await connection.execute(
                'INSERT INTO users (role_id, email, password_hash) VALUES (?, ?, ?)',
                [roleId, email, passwordHash]
            );
            
            const userId = userResult.insertId;
            
            const [studentResult] = await connection.execute(
                `INSERT INTO students (
                    user_id, first_name, last_name, enrollment_number, date_of_birth, gender,
                    profile_image_url, address, guardian_name, guardian_phone, medical_conditions, blood_group, student_group_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId, firstName, lastName, enrollmentNumber, dateOfBirth || null, gender,
                    profileImageUrl || null, address || null, guardianName || null, guardianPhone || null, medicalConditions || null, bloodGroup || null, studentGroupId || null
                ]
            );
            
            await connection.commit();
            return studentResult.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async update(id, studentData) {
        const { 
            firstName, lastName, enrollmentNumber, dateOfBirth, gender, email,
            profileImageUrl, address, guardianName, guardianPhone, medicalConditions, bloodGroup, studentGroupId
        } = studentData;
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const [student] = await connection.execute('SELECT user_id FROM students WHERE id = ?', [id]);
            if (student.length === 0) throw new Error('Student not found');
            const userId = student[0].user_id;

            if (email) {
                await connection.execute('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
            }
            
            const updates = [
                'first_name = ?', 'last_name = ?', 'enrollment_number = ?', 'date_of_birth = ?', 'gender = ?',
                'address = ?', 'guardian_name = ?', 'guardian_phone = ?', 'medical_conditions = ?', 'blood_group = ?', 'student_group_id = ?'
            ];
            const values = [
                firstName, lastName, enrollmentNumber, dateOfBirth || null, gender,
                address || null, guardianName || null, guardianPhone || null, medicalConditions || null, bloodGroup || null, studentGroupId || null
            ];

            if (profileImageUrl !== undefined) {
                updates.push('profile_image_url = ?');
                values.push(profileImageUrl);
            }

            values.push(id);
            
            await connection.execute(
                `UPDATE students SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
            
            await connection.commit();
            return 1;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async delete(id) {
        const [student] = await db.execute('SELECT user_id FROM students WHERE id = ?', [id]);
        if (student.length > 0) {
            await db.execute('DELETE FROM users WHERE id = ?', [student[0].user_id]);
            return true;
        }
        return false;
    }
}

module.exports = StudentModel;
