const db = require('../../config/db');

class StatsController {
    static async getDashboardStats(req, res) {
        try {
            const [students] = await db.execute('SELECT COUNT(*) as count FROM students');
            const [lecturers] = await db.execute('SELECT COUNT(*) as count FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = "LECTURER" AND u.is_active = 1');
            const [groups] = await db.execute('SELECT COUNT(*) as count FROM student_groups');
            const [attendance] = await db.execute('SELECT AVG(CASE WHEN status = "PRESENT" THEN 100 ELSE 0 END) as avg_att FROM attendance');
            
            res.json({
                totalStudents: students[0].count,
                activeLecturers: lecturers[0].count,
                totalGroups: groups[0].count,
                avgAttendance: attendance[0].avg_att ? Math.round(attendance[0].avg_att) + '%' : '0%'
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}

module.exports = StatsController;
