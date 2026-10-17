require('dotenv').config();
const express = require('express');
const cors = require('cors');
const userRoutes = require('./src/modules/users/users.routes');
const studentRoutes = require('./src/modules/students/students.routes');
const statsRoutes = require('./src/modules/stats/stats.routes');
const lecturerRoutes = require('./src/modules/lecturers/lecturers.routes');
const attendanceRoutes = require('./src/modules/attendance/attendance.routes');
const gradesRoutes = require('./src/modules/grades/grades.routes');
const materialsRoutes = require('./src/modules/materials/materials.routes');
const lecturerAttendanceRoutes = require('./src/modules/lecturer_attendance/lecturer_attendance.routes');
const timetableRoutes = require('./src/modules/timetable/timetable.routes');
const notificationsRoutes = require('./src/modules/notifications/notifications.routes');
const financeRoutes = require('./src/modules/finance/finance.routes');
const libraryRoutes = require('./src/modules/library/library.routes');
const programsRoutes = require('./src/modules/programs/programs.routes');
const coursesRoutes = require('./src/modules/courses/courses.routes');
const roomsRoutes = require('./src/modules/rooms/rooms.routes');
const studentGroupsRoutes = require('./src/modules/student_groups/student_groups.routes');
const errorHandler = require('./src/core/middlewares/error.middleware');

const app = express();
const PORT = process.env.PORT || 5000;
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
// Production uses one origin. Cross-origin development is opt-in.
if (process.env.CORS_ORIGIN) {
    app.use(cors({ origin: process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) }));
}
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});
app.use(express.json());
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/lecturers', lecturerRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/lecturer-attendance', lecturerAttendanceRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/programs', programsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/student-groups', studentGroupsRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'SMS Backend is running' });
});


// Readiness checks include the database; liveness above remains lightweight.
app.get('/api/ready', async (req, res) => {
    try {
        await require('./src/config/db').query('SELECT 1');
        res.json({ status: 'ready' });
    } catch {
        res.status(503).json({ status: 'unavailable' });
    }
});
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found' }));

const frontendDir = path.join(__dirname, '../frontend/dist');
if (require('fs').existsSync(path.join(frontendDir, 'index.html'))) {
    app.use(express.static(frontendDir));
    // Express 5 requires a named wildcard, including the root route.
    app.get('/{*path}', (req, res, next) => {
        if (req.path.startsWith('/uploads/') || !req.accepts('html')) return next();
        res.sendFile(path.join(frontendDir, 'index.html'));
    });
}

// Global Error Handler
app.use(errorHandler);

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
const shutdown = () => {
    server.close(async () => {
        await require('./src/config/db').end();
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
