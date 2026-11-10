const db = require('../config/db');
const emailService = require('../utils/emailService');
const { localDate } = require('../utils/dates');

// Morning messages: each student gets their class's lessons for the day, each
// lecturer their own; exam periods are announced ahead of time. Every send is
// recorded in job_runs first, so a restart or a second server cannot repeat it.

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMETABLE_TITLE = "Today's timetable";
const KEEP_REMINDERS_DAYS = 14;

const fmtDate = (value) => new Date(value).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const toDateOnly = (value) => (typeof value === 'string' ? value.slice(0, 10) : localDate(value));
const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

/** Records that a job ran for a key. False when it already ran (nothing should be sent). */
async function claim(job, runKey) {
    const [result] = await db.execute('INSERT IGNORE INTO job_runs (job, run_key) VALUES (?, ?)', [job, runKey]);
    return result.affectedRows === 1;
}

async function currentTermOn(dateStr) {
    const [rows] = await db.execute(
        'SELECT id, name FROM terms WHERE is_current = 1 AND start_date <= ? AND end_date >= ? LIMIT 1',
        [dateStr, dateStr]
    );
    return rows[0] || null;
}

async function notifyUsers(sqlSelectingUserIds, params, title, message, type) {
    const [result] = await db.execute(
        `INSERT INTO notifications (user_id, title, message, type) SELECT x.user_id, ?, ?, ? FROM (${sqlSelectingUserIds}) x`,
        [title, message, type, ...params]
    );
    return result.affectedRows;
}

async function emailUsers(sqlSelectingEmails, params, subject, message) {
    if (process.env.REMINDER_EMAILS !== 'true') return;
    const [rows] = await db.execute(sqlSelectingEmails, params);
    if (rows.length) emailService.sendBulkNotification(rows.map((r) => r.email), subject, message).catch(() => {});
}

/**
 * Daily "today's timetable" reminder.
 * @param {{ date?: Date|string, preview?: boolean }} options  preview builds the messages without sending
 */
async function dailyTimetable({ date = new Date(), preview = false } = {}) {
    const dateStr = toDateOnly(date);
    const day = DAY_NAMES[new Date(`${dateStr}T12:00:00`).getDay()];
    if (day === 'Saturday' || day === 'Sunday') return { date: dateStr, day, skipped: 'weekend' };

    const term = await currentTermOn(dateStr);
    if (!term) return { date: dateStr, day, skipped: 'no current term covers this date' };

    const [exams] = await db.execute(
        'SELECT name FROM exam_periods WHERE term_id = ? AND start_date <= ? AND end_date >= ?',
        [term.id, dateStr, dateStr]
    );
    const examLine = exams.length ? `Exam period: ${exams.map((e) => e.name).join(', ')}.\n` : '';

    const [sessions] = await db.execute(`
        SELECT ts.student_group_id, sg.name AS class_name, ts.lecturer_id,
               TIME_FORMAT(ts.start_time, '%H:%i') AS start_time, TIME_FORMAT(ts.end_time, '%H:%i') AS end_time,
               c.name AS course_name, r.name AS room_name,
               COALESCE(NULLIF(CONCAT_WS(' ', l.first_name, l.last_name), ''), u.email) AS lecturer_name
        FROM timetable_sessions ts
        JOIN student_groups sg ON sg.id = ts.student_group_id
        JOIN courses c ON c.id = ts.course_id
        JOIN rooms r ON r.id = ts.room_id
        JOIN lecturers l ON l.id = ts.lecturer_id
        JOIN users u ON u.id = l.user_id
        WHERE ts.day_of_week = ?
        ORDER BY ts.start_time`, [day]);

    const byClass = new Map();
    const byLecturer = new Map();
    for (const s of sessions) {
        if (!byClass.has(s.student_group_id)) byClass.set(s.student_group_id, []);
        byClass.get(s.student_group_id).push(`${s.start_time}–${s.end_time} ${s.course_name} (${s.room_name}, ${s.lecturer_name})`);
        if (!byLecturer.has(s.lecturer_id)) byLecturer.set(s.lecturer_id, []);
        byLecturer.get(s.lecturer_id).push(`${s.start_time}–${s.end_time} ${s.course_name}, ${s.class_name} (${s.room_name})`);
    }
    const title = `${TIMETABLE_TITLE} – ${day}`;
    const classMessages = [...byClass].map(([groupId, lines]) => ({ groupId, message: `${examLine}${lines.join('\n')}` }));
    const lecturerMessages = [...byLecturer].map(([lecturerId, lines]) => ({ lecturerId, message: `${examLine}${lines.join('\n')}` }));

    const summary = { date: dateStr, day, term: term.name, classes: classMessages.length, lecturers: lecturerMessages.length };
    if (preview) return { ...summary, preview: true, title, sample: classMessages[0]?.message || null };
    if (!(await claim('daily-timetable', dateStr))) return { ...summary, skipped: 'already sent today' };

    let notified = 0;
    for (const { groupId, message } of classMessages) {
        const who = 'SELECT s.user_id FROM students s JOIN users u ON u.id = s.user_id WHERE s.student_group_id = ? AND u.is_active = 1';
        notified += await notifyUsers(who, [groupId], title, message, 'INFO');
        await emailUsers('SELECT u.email FROM students s JOIN users u ON u.id = s.user_id WHERE s.student_group_id = ? AND u.is_active = 1', [groupId], title, message);
    }
    for (const { lecturerId, message } of lecturerMessages) {
        const who = 'SELECT l.user_id FROM lecturers l JOIN users u ON u.id = l.user_id WHERE l.id = ? AND u.is_active = 1';
        notified += await notifyUsers(who, [lecturerId], title, message, 'INFO');
        await emailUsers('SELECT u.email FROM lecturers l JOIN users u ON u.id = l.user_id WHERE l.id = ? AND u.is_active = 1', [lecturerId], title, message);
    }
    // Daily reminders are only useful for a short time.
    await db.execute(
        `DELETE FROM notifications WHERE title LIKE ? AND created_at < ? - INTERVAL ${KEEP_REMINDERS_DAYS} DAY`,
        [`${TIMETABLE_TITLE}%`, dateStr]
    );
    return { ...summary, notified };
}

/** Advance alerts for exam periods, on each day listed in alert_days before the start. */
async function examAlerts({ date = new Date(), preview = false } = {}) {
    const dateStr = toDateOnly(date);
    const [exams] = await db.execute(
        'SELECT id, name, start_date, end_date, alert_days, audience FROM exam_periods WHERE start_date >= ? ORDER BY start_date',
        [dateStr]
    );
    const due = [];
    for (const exam of exams) {
        const start = toDateOnly(exam.start_date);
        const daysAway = daysBetween(dateStr, start);
        const alertDays = String(exam.alert_days).split(',').map(Number);
        if (!alertDays.includes(daysAway)) continue;
        const when = daysAway === 0 ? 'start today' : daysAway === 1 ? 'start tomorrow' : `start in ${daysAway} days`;
        due.push({
            exam,
            daysAway,
            title: `Exams ${when}: ${exam.name}`,
            message: `${exam.name} run from ${fmtDate(exam.start_date)} to ${fmtDate(exam.end_date)}. Check your timetable and prepare early.`,
        });
    }
    if (preview) return { date: dateStr, preview: true, alerts: due.map(({ exam, daysAway, title }) => ({ examId: exam.id, daysAway, title, audience: exam.audience })) };

    const sent = [];
    for (const alert of due) {
        if (!(await claim('exam-alert', `${alert.exam.id}:${alert.daysAway}`))) continue;
        const roles = alert.exam.audience === 'ALL' ? ['STUDENT', 'LECTURER'] : [alert.exam.audience];
        const placeholders = roles.map(() => '?').join(', ');
        const who = `SELECT u.id AS user_id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.is_active = 1 AND r.name IN (${placeholders})`;
        const notified = await notifyUsers(who, roles, alert.title, alert.message, 'WARNING');
        await emailUsers(`SELECT u.email FROM users u JOIN roles r ON r.id = u.role_id WHERE u.is_active = 1 AND r.name IN (${placeholders})`, roles, alert.title, alert.message);
        sent.push({ examId: alert.exam.id, daysAway: alert.daysAway, notified });
    }
    return { date: dateStr, sent };
}

async function runMorningJobs(options = {}) {
    const timetable = await dailyTimetable(options);
    const exams = await examAlerts(options);
    return { timetable, exams };
}

module.exports = { dailyTimetable, examAlerts, runMorningJobs, claim, TIMETABLE_TITLE };
