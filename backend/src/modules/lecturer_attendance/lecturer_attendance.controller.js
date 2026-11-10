const LecturerAttendanceModel = require('./lecturer_attendance.model');
const { lecturerIdFor } = require('../../utils/currentProfile');

const STATUSES = ['Present', 'Absent', 'On Leave'];

class LecturerAttendanceController {
    static async getAll(req, res) {
        try {
            const records = await LecturerAttendanceModel.findAll();
            res.json(records);
        } catch (error) {
            console.error('Error fetching lecturer attendance:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async getByLecturer(req, res) {
        try {
            const records = await LecturerAttendanceModel.findByLecturerId(req.params.lecturerId);
            res.json(records);
        } catch (error) {
            console.error('Error fetching lecturer attendance by ID:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async getMine(req, res) {
        try {
            const lecturerId = await lecturerIdFor(req.user.id);
            if (!lecturerId) return res.status(404).json({ message: 'Lecturer profile not found' });
            res.json(await LecturerAttendanceModel.findByLecturerId(lecturerId));
        } catch (error) {
            console.error('Error fetching own lecturer attendance:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async mark(req, res) {
        try {
            const { lecturerId, date, status, checkInTime, checkOutTime } = req.body;
            if (!lecturerId || !date || !STATUSES.includes(status)) {
                return res.status(400).json({ message: `lecturerId, date and a status of ${STATUSES.join(', ')} are required` });
            }
            await LecturerAttendanceModel.markAttendance(lecturerId, date, status, checkInTime, checkOutTime);
            res.json({ message: 'Lecturer attendance recorded successfully' });
        } catch (error) {
            console.error('Error recording lecturer attendance:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}

module.exports = LecturerAttendanceController;
