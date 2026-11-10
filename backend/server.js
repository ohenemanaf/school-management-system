require('dotenv').config();
const app = require('./src/app');
const db = require('./src/config/db');
const { startScheduledJobs } = require('./src/jobs/scheduler');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
const stopJobs = startScheduledJobs(); // 07:00 timetable reminders and exam alerts
const shutdown = () => {
    stopJobs();
    server.close(async () => {
        await db.end();
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
