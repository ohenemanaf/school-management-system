const TimetableModel = require('./timetable.model');

class TimetableController {
    static async getAll(req, res) {
        try {
            const filters = {};
            if (req.query.student_group_id) filters.student_group_id = req.query.student_group_id;
            if (req.query.lecturer_id) filters.lecturer_id = req.query.lecturer_id;
            if (req.query.room_id) filters.room_id = req.query.room_id;
            
            const timetable = await TimetableModel.findAll(filters);
            res.json(timetable);
        } catch (error) {
            console.error('Error fetching timetable:', error);
            res.status(500).json({ message: 'Failed to fetch timetable' });
        }
    }

    static async create(req, res) {
        try {
            const { course_id, student_group_id, lecturer_id, room_id, day_of_week, start_time, end_time } = req.body;
            
            if (!course_id || !student_group_id || !lecturer_id || !room_id || !day_of_week || !start_time || !end_time) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            if (start_time >= end_time) {
                return res.status(400).json({ message: 'Start time must be before end time' });
            }

            // Check for overlap via custom logic (kept for end_time overlaps)
            const isOverlap = await TimetableModel.checkOverlap(lecturer_id, student_group_id, room_id, day_of_week, start_time, end_time);
            if (isOverlap) {
                return res.status(409).json({ message: 'Time slot overlaps with an existing schedule for this group, lecturer, or room' });
            }

            const insertId = await TimetableModel.create(req.body);
            res.status(201).json({ message: 'Timetable slot created successfully', id: insertId });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Error: This lecturer, group, or room is already booked for this specific time slot.' });
            }
            console.error('Error creating timetable slot:', error);
            res.status(500).json({ message: 'Failed to create timetable slot' });
        }
    }

    static async delete(req, res) {
        try {
            const affected = await TimetableModel.delete(req.params.id);
            if (affected === 0) return res.status(404).json({ message: 'Timetable slot not found' });
            res.json({ message: 'Timetable slot deleted successfully' });
        } catch (error) {
            console.error('Error deleting timetable slot:', error);
            res.status(500).json({ message: 'Failed to delete timetable slot' });
        }
    }
}

module.exports = TimetableController;
