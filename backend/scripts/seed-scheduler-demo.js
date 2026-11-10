/**
 * Fills in a demo setup for the timetable generator so it can be tried at once.
 * Works with whatever classes, courses, lecturers and rooms already exist.
 *
 *   npm run seed:scheduler-demo
 *
 * Only empty parts are filled (bell schedule, current term, streams, teacher
 * subjects, allocations). It never publishes a timetable and never deletes data.
 * Refuses to run when NODE_ENV=production.
 */
require('dotenv').config();

if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed demo scheduler data in production.');
    process.exit(1);
}

const db = require('../src/config/db');
const { localDate } = require('../src/utils/dates');

const HEAVY = /math|science|physics|chem|algorithm|machine learning|cryptograph|data structure/i;
const addDays = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return localDate(d); };

async function seed() {
    const log = [];

    // 1. Bell schedule: 8 lessons with a break and lunch.
    const [[{ bells }]] = await db.query('SELECT COUNT(*) AS bells FROM bell_periods');
    if (!bells) {
        const day = [
            ['Period 1', '08:00', '08:45', 'LESSON'], ['Period 2', '08:45', '09:30', 'LESSON'], ['Period 3', '09:30', '10:15', 'LESSON'],
            ['Break', '10:15', '10:45', 'BREAK'],
            ['Period 4', '10:45', '11:30', 'LESSON'], ['Period 5', '11:30', '12:15', 'LESSON'],
            ['Lunch', '12:15', '13:00', 'BREAK'],
            ['Period 6', '13:00', '13:45', 'LESSON'], ['Period 7', '13:45', '14:30', 'LESSON'], ['Period 8', '14:30', '15:15', 'LESSON'],
        ];
        await db.query('INSERT INTO bell_periods (period_no, label, start_time, end_time, kind) VALUES ?', [day.map((p, i) => [i + 1, ...p])]);
        log.push('bell schedule: 8 lessons, a break and lunch');
    }

    // 2. A current term around today, with a mid-term exam in a week.
    let [[term]] = await db.query('SELECT id, name FROM terms WHERE is_current = 1 LIMIT 1');
    if (!term) {
        await db.query('UPDATE terms SET is_current = 0');
        const [r] = await db.query('INSERT INTO terms (name, start_date, end_date, is_current) VALUES (?, ?, ?, 1)', ['Demo Term', addDays(-60), addDays(40)]);
        await db.query('INSERT INTO exam_periods (term_id, name, start_date, end_date, alert_days, audience) VALUES (?, ?, ?, ?, ?, ?)',
            [r.insertId, 'Mid-term exams', addDays(7), addDays(9), '14,7,1', 'ALL']);
        await db.query('INSERT INTO exam_periods (term_id, name, start_date, end_date, alert_days, audience) VALUES (?, ?, ?, ?, ?, ?)',
            [r.insertId, 'End of term exams', addDays(33), addDays(37), '14,7,1', 'ALL']);
        term = { id: r.insertId, name: 'Demo Term' };
        log.push('current term "Demo Term" with mid-term and end-of-term exams');
    }

    // 3. Streams, given to classes that have none (alternating).
    await db.query("INSERT IGNORE INTO streams (name, sort_order) VALUES ('Gold', 0), ('Diamond', 1)");
    const [streams] = await db.query("SELECT id FROM streams WHERE name IN ('Gold', 'Diamond') ORDER BY sort_order");
    const [noStream] = await db.query('SELECT id FROM student_groups WHERE stream_id IS NULL ORDER BY id');
    for (const [i, c] of noStream.entries()) {
        await db.query('UPDATE student_groups SET stream_id = ? WHERE id = ?', [streams[i % streams.length].id, c.id]);
    }
    if (noStream.length) log.push(`streams Gold/Diamond given to ${noStream.length} classes`);

    // 4. Heavy subjects by name.
    const [courses] = await db.query('SELECT id, name FROM courses ORDER BY id');
    const heavy = courses.filter((c) => HEAVY.test(c.name));
    if (heavy.length) await db.query('UPDATE courses SET is_heavy = 1 WHERE id IN (?)', [heavy.map((c) => c.id)]);

    // 5. Teacher skills: what they already teach (specialist), plus cover so every subject has two teachers.
    const [[{ skills }]] = await db.query('SELECT COUNT(*) AS skills FROM lecturer_subjects');
    const [lecturers] = await db.query('SELECT l.id FROM lecturers l JOIN users u ON u.id = l.user_id WHERE u.is_active = 1 ORDER BY l.id');
    if (!skills && lecturers.length && courses.length) {
        await db.query('INSERT IGNORE INTO lecturer_subjects (lecturer_id, course_id, proficiency) SELECT DISTINCT lecturer_id, course_id, 3 FROM timetable_sessions');
        for (const [i, c] of courses.entries()) {
            const extra = lecturers[(i + 1) % lecturers.length];
            await db.query('INSERT IGNORE INTO lecturer_subjects (lecturer_id, course_id, proficiency) VALUES (?, ?, 2)', [extra.id, c.id]);
            const first = lecturers[i % lecturers.length];
            await db.query('INSERT IGNORE INTO lecturer_subjects (lecturer_id, course_id, proficiency) VALUES (?, ?, 1)', [first.id, c.id]);
        }
        log.push('teacher subject skills');
    }

    // 6. Allocations: each class keeps its current subjects and gets a couple more, ~20 periods a week.
    const [[{ allocations }]] = await db.query('SELECT COUNT(*) AS allocations FROM class_subjects WHERE term_id = ?', [term.id]);
    const [classes] = await db.query('SELECT id FROM student_groups ORDER BY id');
    if (!allocations && classes.length && courses.length) {
        const rows = [];
        for (const [i, c] of classes.entries()) {
            const [current] = await db.query('SELECT DISTINCT course_id FROM timetable_sessions WHERE student_group_id = ?', [c.id]);
            const chosen = new Set(current.map((r) => r.course_id));
            for (let k = 0; chosen.size < Math.min(5, courses.length); k += 1) chosen.add(courses[(i * 2 + k) % courses.length].id);
            for (const courseId of chosen) rows.push([term.id, c.id, courseId, heavy.some((h) => h.id === courseId) ? 5 : 4, null]);
        }
        await db.query('INSERT INTO class_subjects (term_id, student_group_id, course_id, periods_per_week, lecturer_id) VALUES ?', [rows]);
        log.push(`${rows.length} class subject allocations for ${term.name}`);
    }

    console.log(log.length ? `Demo scheduler setup added:\n- ${log.join('\n- ')}` : 'Scheduler setup already present; nothing changed.');
    console.log('Open Timetable Generator > 5. Generate to build a timetable. Nothing is published until you choose to.');
}

seed()
    .catch((error) => {
        console.error('Demo seed failed:', error);
        process.exitCode = 1;
    })
    .finally(() => db.end());
