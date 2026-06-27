const LecturerAttendanceModel = require('./lecturer_attendance.model');

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

    static async mark(req, res) {
        try {
            const { lecturerId, date, status, checkInTime, checkOutTime } = req.body;
            await LecturerAttendanceModel.markAttendance(lecturerId, date, status, checkInTime, checkOutTime);
            res.json({ message: 'Lecturer attendance recorded successfully' });
        } catch (error) {
            console.error('Error recording lecturer attendance:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}

module.exports = LecturerAttendanceController;
