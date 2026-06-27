const db = require('../../config/db');

class RoomsModel {
    static async getAll() {
        const [rows] = await db.execute('SELECT * FROM rooms ORDER BY id ASC');
        return rows;
    }

    static async getById(id) {
        const [rows] = await db.execute('SELECT * FROM rooms WHERE id = ?', [id]);
        return rows[0];
    }

    static async create(name, capacity) {
        const [result] = await db.execute('INSERT INTO rooms (name, capacity) VALUES (?, ?)', [name, capacity || 30]);
        return result.insertId;
    }

    static async update(id, name, capacity) {
        await db.execute('UPDATE rooms SET name = ?, capacity = ? WHERE id = ?', [name, capacity || 30, id]);
    }

    static async delete(id) {
        await db.execute('DELETE FROM rooms WHERE id = ?', [id]);
    }
}

module.exports = RoomsModel;
