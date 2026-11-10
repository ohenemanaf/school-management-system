const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./config/db');
const errorHandler = require('./core/middlewares/error.middleware');

const app = express();
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
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use('/api/users', require('./modules/users/users.routes'));
app.use('/api/students', require('./modules/students/students.routes'));
app.use('/api/stats', require('./modules/stats/stats.routes'));
app.use('/api/lecturers', require('./modules/lecturers/lecturers.routes'));
app.use('/api/attendance', require('./modules/attendance/attendance.routes'));
app.use('/api/grades', require('./modules/grades/grades.routes'));
app.use('/api/materials', require('./modules/materials/materials.routes'));
app.use('/api/lecturer-attendance', require('./modules/lecturer_attendance/lecturer_attendance.routes'));
app.use('/api/timetable', require('./modules/timetable/timetable.routes'));
app.use('/api/notifications', require('./modules/notifications/notifications.routes'));
app.use('/api/finance', require('./modules/finance/finance.routes'));
app.use('/api/library', require('./modules/library/library.routes'));
app.use('/api/programs', require('./modules/programs/programs.routes'));
app.use('/api/courses', require('./modules/courses/courses.routes'));
app.use('/api/rooms', require('./modules/rooms/rooms.routes'));
app.use('/api/student-groups', require('./modules/student_groups/student_groups.routes'));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'SMS Backend is running' });
});

// Readiness checks include the database; liveness above remains lightweight.
app.get('/api/ready', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'ready' });
    } catch {
        res.status(503).json({ status: 'unavailable' });
    }
});
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found' }));

const frontendDir = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(path.join(frontendDir, 'index.html'))) {
    app.use(express.static(frontendDir));
    // Express 5 requires a named wildcard, including the root route.
    app.get('/{*path}', (req, res, next) => {
        if (req.path.startsWith('/uploads/') || !req.accepts('html')) return next();
        res.sendFile(path.join(frontendDir, 'index.html'));
    });
}

app.use(errorHandler);

module.exports = app;
