const AttendanceModel = require('./attendance.model');

class AttendanceController {
    static async getAll(req, res) {
        try {
            const { role, id } = req.user;
            let attendance;

            if (role === 'STUDENT') {
                const db = require('../../config/db');
                const [student] = await db.execute('SELECT id FROM students WHERE user_id = ?', [id]);
                if (student.length === 0) return res.status(404).json({ message: 'Student not found' });
                attendance = await AttendanceModel.findByStudent(student[0].id);
            } else {
                attendance = await AttendanceModel.findAll();
            }

            res.json(attendance);
        } catch (error) {
            console.error('Error fetching attendance:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async mark(req, res) {
        try {
            const { studentId, studentGroupId, date, status } = req.body;
            await AttendanceModel.mark(studentId, studentGroupId, date, status);
            res.json({ message: 'Attendance marked successfully' });
        } catch (error) {
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(400).json({ message: 'Invalid Group ID or Student ID. Please ensure they exist.' });
            }
            console.error('Error marking attendance:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async generateGateToken(req, res) {
        try {
            let token = await AttendanceModel.getValidToken();
            if (!token) {
                // Generate a new 5-char alphanumeric token
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // removed ambiguous chars
                token = '';
                for (let i = 0; i < 5; i++) {
                    token += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                await AttendanceModel.createToken(token);
            }
            res.json({ token });
        } catch (error) {
            console.error('Error generating gate token:', error);
            res.status(500).json({ message: 'Server error generating token' });
        }
    }

    static async lecturerCheckIn(req, res) {
        try {
            const { token } = req.body;
            if (!token) return res.status(400).json({ message: 'Token is required' });

            const isValid = await AttendanceModel.validateAndConsumeToken(token.toUpperCase());
            if (!isValid) {
                return res.status(400).json({ message: 'Invalid, used, or expired token' });
            }

            // Mark lecturer present
            const { id } = req.user; // this is the user ID, we need lecturer_id
            const db = require('../../config/db');
            const [lecturer] = await db.execute('SELECT id FROM lecturers WHERE user_id = ?', [id]);
            
            if (lecturer.length === 0) return res.status(404).json({ message: 'Lecturer profile not found' });
            const lecturerId = lecturer[0].id;
            const today = new Date().toISOString().split('T')[0];

            const LecturerAttendanceModel = require('../lecturer_attendance/lecturer_attendance.model');
            const now = new Date().toLocaleTimeString('en-GB'); // HH:mm:ss format
            
            await LecturerAttendanceModel.markAttendance(lecturerId, today, 'Present', now, null);
            
            res.json({ message: 'Check-in successful' });
        } catch (error) {
            console.error('Error during lecturer check-in:', error);
            res.status(500).json({ message: 'Server error during check-in' });
        }
    }
}
module.exports = AttendanceController;
