const db = require('../../config/db');

class UserModel {
    static async findByEmail(email) {
        const [rows] = await db.execute(
            'SELECT users.*, roles.name as role FROM users JOIN roles ON users.role_id = roles.id WHERE users.email = ?',
            [email]
        );
        return rows[0];
    }

    static async create(email, passwordHash, roleName = 'STUDENT') {
        // First get the role ID
        const [roles] = await db.execute('SELECT id FROM roles WHERE name = ?', [roleName]);
        if (roles.length === 0) throw new Error('Role not found');
        const roleId = roles[0].id;

        const [result] = await db.execute(
            'INSERT INTO users (role_id, email, password_hash) VALUES (?, ?, ?)',
            [roleId, email, passwordHash]
        );
        return result.insertId;
    }

    static async findAll() {
        const [rows] = await db.execute(
            'SELECT users.id, users.email, users.is_active, users.created_at, roles.name as role FROM users JOIN roles ON users.role_id = roles.id'
        );
        return rows;
    }

    static async updateRole(userId, roleName) {
        const [roles] = await db.execute('SELECT id FROM roles WHERE name = ?', [roleName]);
        if (roles.length === 0) throw new Error('Role not found');
        const roleId = roles[0].id;

        const [result] = await db.execute(
            'UPDATE users SET role_id = ? WHERE id = ?',
            [roleId, userId]
        );
        return result.affectedRows;
    }

    static async delete(userId) {
        const [result] = await db.execute('DELETE FROM users WHERE id = ?', [userId]);
        return result.affectedRows;
    }
}

module.exports = UserModel;
