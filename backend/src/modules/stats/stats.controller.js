const db = require('../../config/db');

class StatsController {
    static async getDashboardStats(req, res) {
        try {
            // One round trip instead of four.
            const [[row]] = await db.execute(`
                SELECT
                    (SELECT COUNT(*) FROM students) AS total_students,
                    (SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.id
                      WHERE r.name = 'LECTURER' AND u.is_active = 1) AS active_lecturers,
                    (SELECT COUNT(*) FROM student_groups) AS total_groups,
                    (SELECT AVG(status = 'Present') * 100 FROM attendance) AS avg_attendance
            `);

            res.json({
                totalStudents: row.total_students,
                activeLecturers: row.active_lecturers,
                totalGroups: row.total_groups,
                avgAttendance: row.avg_attendance ? Math.round(row.avg_attendance) + '%' : '0%'
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}

module.exports = StatsController;
