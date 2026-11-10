const db = require('../../config/db');
const { generateTimetable, verifyTimetable, DEFAULT_DAYS } = require('./engine');

const fail = (status, message) => Object.assign(new Error(message), { status });
const hhmm = (time) => String(time).slice(0, 5);
const teacherName = "COALESCE(NULLIF(CONCAT_WS(' ', l.first_name, l.last_name), ''), u.email)";

async function lessonPeriods(conn = db) {
    const [rows] = await conn.execute(
        "SELECT period_no, label, start_time, end_time FROM bell_periods WHERE kind = 'LESSON' ORDER BY period_no"
    );
    return rows;
}

async function requireTerm(termId, conn = db) {
    const [rows] = await conn.execute('SELECT * FROM terms WHERE id = ?', [termId]);
    if (!rows.length) throw fail(404, 'Term not found');
    return rows[0];
}

/** Everything the scheduler page needs in one request. */
async function getSetup(termId) {
    const [terms] = await db.execute('SELECT id, name, start_date, end_date, is_current FROM terms ORDER BY start_date DESC');
    const selected = termId ? Number(termId) : (terms.find((t) => t.is_current) || terms[0])?.id || null;
    const [bell] = await db.execute('SELECT id, period_no, label, start_time, end_time, kind FROM bell_periods ORDER BY period_no');
    const [streams] = await db.execute('SELECT id, name, sort_order FROM streams ORDER BY sort_order, name');
    const [classes] = await db.execute(`
        SELECT sg.id, sg.name, sg.level, sg.stream_id, p.name AS program_name, COUNT(s.id) AS size
        FROM student_groups sg
        LEFT JOIN programs p ON p.id = sg.program_id
        LEFT JOIN students s ON s.student_group_id = sg.id
        GROUP BY sg.id, sg.name, sg.level, sg.stream_id, p.name
        ORDER BY sg.level, sg.name`);
    const [subjects] = await db.execute('SELECT id, name, code, is_heavy FROM courses ORDER BY name');
    const [teachers] = await db.execute(`
        SELECT l.id, ${teacherName} AS name, u.email, l.department,
               l.max_periods_per_week AS maxPerWeek, l.max_periods_per_day AS maxPerDay
        FROM lecturers l JOIN users u ON u.id = l.user_id
        WHERE u.is_active = 1
        ORDER BY name`);
    const [skills] = await db.execute('SELECT lecturer_id, course_id, proficiency FROM lecturer_subjects');
    const [rooms] = await db.execute('SELECT id, name, capacity FROM rooms ORDER BY name');
    const [allocations] = selected
        ? await db.execute('SELECT id, student_group_id, course_id, periods_per_week, lecturer_id FROM class_subjects WHERE term_id = ?', [selected])
        : [[]];

    return {
        terms,
        termId: selected,
        bell,
        streams,
        classes: classes.map((c) => ({ ...c, size: Number(c.size) })),
        subjects: subjects.map((s) => ({ ...s, is_heavy: Boolean(s.is_heavy) })),
        teachers: teachers.map((t) => ({
            ...t,
            subjects: skills.filter((s) => s.lecturer_id === t.id).map((s) => ({ courseId: s.course_id, proficiency: s.proficiency })),
        })),
        rooms,
        allocations,
    };
}

/** Builds the engine input for a term from the database. */
async function buildInput(termId) {
    const periods = await lessonPeriods();
    if (!periods.length) throw fail(400, 'Set up the bell schedule (lesson periods) first.');

    const [allocations] = await db.execute(
        'SELECT student_group_id, course_id, periods_per_week, lecturer_id FROM class_subjects WHERE term_id = ? AND periods_per_week > 0',
        [termId]
    );
    if (!allocations.length) throw fail(400, 'Add subject allocations for this term first.');
    const classIds = new Set(allocations.map((a) => a.student_group_id));

    const [classes] = await db.execute(`
        SELECT sg.id, sg.name, sg.level, COUNT(s.id) AS size
        FROM student_groups sg LEFT JOIN students s ON s.student_group_id = sg.id
        GROUP BY sg.id, sg.name, sg.level`);
    const [teachers] = await db.execute(`
        SELECT l.id, ${teacherName} AS name, l.max_periods_per_week, l.max_periods_per_day
        FROM lecturers l JOIN users u ON u.id = l.user_id WHERE u.is_active = 1`);
    const [skills] = await db.execute('SELECT lecturer_id, course_id, proficiency FROM lecturer_subjects');
    const [subjects] = await db.execute('SELECT id, name, is_heavy FROM courses');
    const [rooms] = await db.execute('SELECT id, name, capacity FROM rooms');
    if (!rooms.length) throw fail(400, 'Add at least one room first.');

    // Lessons of classes that are not being generated stay where they are: block their periods.
    const [fixed] = await db.execute('SELECT student_group_id, lecturer_id, room_id, day_of_week, start_time, end_time FROM timetable_sessions');
    const blocked = [];
    for (const s of fixed) {
        if (classIds.has(s.student_group_id)) continue;
        for (const p of periods) {
            if (String(s.start_time) < String(p.end_time) && String(p.start_time) < String(s.end_time)) {
                blocked.push({ classId: s.student_group_id, teacherId: s.lecturer_id, roomId: s.room_id, day: s.day_of_week, period: p.period_no });
            }
        }
    }

    return {
        days: DEFAULT_DAYS,
        periods: periods.map((p) => ({ no: p.period_no, start: hhmm(p.start_time), end: hhmm(p.end_time) })),
        rooms: rooms.map((r) => ({ id: r.id, name: r.name, capacity: Number(r.capacity) || 0 })),
        classes: classes.map((c) => ({ id: c.id, name: c.name, level: c.level, size: Number(c.size) })),
        teachers: teachers.map((t) => ({ id: t.id, name: t.name, maxPerWeek: t.max_periods_per_week, maxPerDay: t.max_periods_per_day })),
        proficiencies: skills.map((s) => ({ teacherId: s.lecturer_id, subjectId: s.course_id, level: s.proficiency })),
        subjects: subjects.map((s) => ({ id: s.id, name: s.name, heavy: Boolean(s.is_heavy) })),
        requirements: allocations.map((a) => ({
            classId: a.student_group_id, subjectId: a.course_id, periodsPerWeek: a.periods_per_week, teacherId: a.lecturer_id || null,
        })),
        blocked,
    };
}

/** Runs the engine for a term and stores the result as a draft. */
async function generate({ termId, seed, userId, options = {} }) {
    await requireTerm(termId);
    const input = await buildInput(termId);
    input.options = { ...options, seed: Number.isInteger(seed) ? seed : Math.floor(Math.random() * 1e6) };
    const result = generateTimetable(input);

    const problems = verifyTimetable(result.lessons, input.blocked);
    if (problems.length) throw fail(500, `Scheduler produced an invalid timetable: ${problems[0]}`);

    const report = {
        unassigned: result.unassigned,
        unplaced: result.unplaced,
        warnings: result.warnings,
        breakdown: result.breakdown,
        teacherLoads: result.teacherLoads,
        teacherAssignments: result.teacherAssignments,
        stats: result.stats,
        fixedLessons: input.blocked.length,
    };

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        // Only the newest draft per term is kept; published history stays.
        await conn.execute("DELETE FROM timetable_runs WHERE term_id = ? AND status = 'DRAFT'", [termId]);
        const [run] = await conn.execute(
            `INSERT INTO timetable_runs (term_id, status, seed, penalty, placed, required, report, created_by)
             VALUES (?, 'DRAFT', ?, ?, ?, ?, ?, ?)`,
            [termId, input.options.seed, result.penalty, result.stats.placedPeriods, result.stats.requiredPeriods, JSON.stringify(report), userId || null]
        );
        if (result.lessons.length) {
            await conn.query(
                'INSERT INTO timetable_run_lessons (run_id, student_group_id, course_id, lecturer_id, room_id, day_of_week, period_no) VALUES ?',
                [result.lessons.map((l) => [run.insertId, l.classId, l.subjectId, l.teacherId, l.roomId, l.day, l.period])]
            );
        }
        await conn.commit();
        return getRun(run.insertId);
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

async function listRuns(termId) {
    const [rows] = await db.execute(
        `SELECT id, term_id, status, seed, penalty, placed, required, created_at, published_at
         FROM timetable_runs WHERE term_id = ? ORDER BY created_at DESC, id DESC LIMIT 20`,
        [termId]
    );
    return rows;
}

async function getRun(runId) {
    const [runs] = await db.execute('SELECT * FROM timetable_runs WHERE id = ?', [runId]);
    if (!runs.length) throw fail(404, 'Timetable run not found');
    const run = runs[0];
    const [lessons] = await db.execute(`
        SELECT rl.id, rl.student_group_id, sg.name AS student_group_name, rl.course_id, c.name AS course_name,
               rl.lecturer_id, ${teacherName} AS lecturer_name, rl.room_id, r.name AS room_name,
               rl.day_of_week, rl.period_no,
               TIME_FORMAT(bp.start_time, '%H:%i') AS start_time, TIME_FORMAT(bp.end_time, '%H:%i') AS end_time
        FROM timetable_run_lessons rl
        JOIN student_groups sg ON sg.id = rl.student_group_id
        JOIN courses c ON c.id = rl.course_id
        JOIN lecturers l ON l.id = rl.lecturer_id
        JOIN users u ON u.id = l.user_id
        JOIN rooms r ON r.id = rl.room_id
        LEFT JOIN bell_periods bp ON bp.period_no = rl.period_no
        WHERE rl.run_id = ?
        ORDER BY sg.name, FIELD(rl.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'), rl.period_no`,
        [runId]
    );
    let report = {};
    try { report = run.report ? JSON.parse(run.report) : {}; } catch { report = {}; }
    return { ...run, report, lessons };
}

/**
 * Makes a draft the live timetable: replaces timetable_sessions for every class
 * allocated in the term, leaving other classes' lessons untouched.
 */
async function publish(runId) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [runs] = await conn.execute('SELECT * FROM timetable_runs WHERE id = ? FOR UPDATE', [runId]);
        if (!runs.length) throw fail(404, 'Timetable run not found');
        const run = runs[0];
        if (run.status !== 'DRAFT') throw fail(409, 'Only a draft can be published. Generate a new timetable first.');

        const periods = new Map((await lessonPeriods(conn)).map((p) => [p.period_no, p]));
        const [lessons] = await conn.execute(
            'SELECT student_group_id, course_id, lecturer_id, room_id, day_of_week, period_no FROM timetable_run_lessons WHERE run_id = ?',
            [runId]
        );
        if (lessons.some((l) => !periods.has(l.period_no))) {
            throw fail(409, 'The bell schedule changed after this draft was made. Generate again.');
        }
        const [allocated] = await conn.execute('SELECT DISTINCT student_group_id FROM class_subjects WHERE term_id = ?', [run.term_id]);
        const classIds = [...new Set([...allocated.map((a) => a.student_group_id), ...lessons.map((l) => l.student_group_id)])];

        if (classIds.length) await conn.query('DELETE FROM timetable_sessions WHERE student_group_id IN (?)', [classIds]);
        if (lessons.length) {
            await conn.query(
                'INSERT INTO timetable_sessions (course_id, student_group_id, lecturer_id, room_id, day_of_week, start_time, end_time) VALUES ?',
                [lessons.map((l) => [l.course_id, l.student_group_id, l.lecturer_id, l.room_id, l.day_of_week,
                    periods.get(l.period_no).start_time, periods.get(l.period_no).end_time])]
            );
        }
        await conn.execute("UPDATE timetable_runs SET status = 'SUPERSEDED' WHERE term_id = ? AND status = 'PUBLISHED'", [run.term_id]);
        await conn.execute("UPDATE timetable_runs SET status = 'PUBLISHED', published_at = NOW() WHERE id = ?", [runId]);
        await conn.commit();
        return { published: lessons.length, classes: classIds.length };
    } catch (error) {
        await conn.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            throw fail(409, 'Other timetable entries changed since this draft was made. Generate again.');
        }
        throw error;
    } finally {
        conn.release();
    }
}

module.exports = { getSetup, buildInput, generate, listRuns, getRun, publish, requireTerm, lessonPeriods, fail };
