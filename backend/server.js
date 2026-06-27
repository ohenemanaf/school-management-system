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
app.use(cors());
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


// Global Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
