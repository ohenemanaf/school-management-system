const RoomsModel = require('./rooms.model');

class RoomsController {
    static async getAll(req, res) {
        try {
            const rooms = await RoomsModel.getAll();
            res.json(rooms);
        } catch (error) {
            console.error('Error fetching rooms:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async create(req, res) {
        try {
            const { name, capacity } = req.body;
            if (!name) return res.status(400).json({ message: 'Room name is required' });

            const id = await RoomsModel.create(name, capacity);
            res.status(201).json({ id, name, capacity });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Room already exists' });
            }
            console.error('Error creating room:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async update(req, res) {
        try {
            const { name, capacity } = req.body;
            await RoomsModel.update(req.params.id, name, capacity);
            res.json({ message: 'Room updated' });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Room name already exists' });
            }
            console.error('Error updating room:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async delete(req, res) {
        try {
            await RoomsModel.delete(req.params.id);
            res.json({ message: 'Room deleted' });
        } catch (error) {
            console.error('Error deleting room:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}

module.exports = RoomsController;
