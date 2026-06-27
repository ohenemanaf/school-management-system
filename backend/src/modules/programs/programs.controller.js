const db = require('../../config/db');

class ProgramsController {
    static async getAll(req, res) {
        try {
            const [rows] = await db.execute('SELECT * FROM programs');
            res.json(rows);
        } catch (error) {
            console.error('Error fetching programs:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async create(req, res) {
        try {
            const { name, code } = req.body;
            if (!name || !code) {
                return res.status(400).json({ message: 'Missing fields' });
            }
            const [result] = await db.execute('INSERT INTO programs (name, code) VALUES (?, ?)', [name, code]);
            res.status(201).json({ id: result.insertId, name, code });
        } catch (error) {
            console.error('Error creating program:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const [result] = await db.execute('DELETE FROM programs WHERE id = ?', [id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Program not found' });
            }
            res.json({ message: 'Program deleted' });
        } catch (error) {
            console.error('Error deleting program:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
module.exports = ProgramsController;
