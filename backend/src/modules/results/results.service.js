const db = require('../../config/db');
const { computeTermResults, cumulative } = require('./results.compute');

const fail = (status, message, code) => Object.assign(new Error(message), { status, code });

async function studentForUser(userId) {
    const [rows] = await db.execute(`
        SELECT s.id, s.first_name, s.last_name, s.enrollment_number, s.gender, u.email,
               sg.name AS class_name, sg.level, p.name AS program_name, st.name AS stream_name
        FROM students s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN student_groups sg ON sg.id = s.student_group_id
        LEFT JOIN programs p ON p.id = sg.program_id
        LEFT JOIN streams st ON st.id = sg.stream_id
        WHERE s.user_id = ?`, [userId]);
    if (!rows.length) throw fail(404, 'Student profile not found');
    return rows[0];
}

async function referenceData() {
    const [scale] = await db.execute('SELECT min_score, grade, grade_point, remark FROM grading_scale ORDER BY min_score DESC');
    const [courses] = await db.execute('SELECT id, code, name, credit_hours FROM courses');
    return { scale, courses: new Map(courses.map((c) => [c.id, c])) };
}

async function gradesFor(studentId, termId) {
    const [rows] = await db.execute(
        `SELECT course_id, component, assessment_name, score, max_score
         FROM grades WHERE student_id = ? AND term_id = ? AND course_id IS NOT NULL
         ORDER BY created_at, id`,
        [studentId, termId]
    );
    return rows;
}

/** Terms with whether results are released and whether this student has any. */
async function termsForUser(userId) {
    const student = await studentForUser(userId);
    const [terms] = await db.execute(`
        SELECT t.id, t.name, t.start_date, t.end_date, t.results_released,
               (SELECT COUNT(*) FROM grades g WHERE g.student_id = ? AND g.term_id = t.id AND g.course_id IS NOT NULL) AS graded
        FROM terms t
        ORDER BY t.start_date DESC`, [student.id]);
    return terms.map((t) => ({ ...t, results_released: Boolean(t.results_released), graded: Number(t.graded) }));
}

/** The full semester statement for the signed-in student and one released term. */
async function statementForUser(userId, termId) {
    const student = await studentForUser(userId);
    const [terms] = await db.execute('SELECT * FROM terms WHERE id = ?', [termId]);
    if (!terms.length) throw fail(404, 'Term not found');
    const term = terms[0];
    if (!term.results_released) {
        throw fail(403, 'Results for this term have not been released yet.', 'NOT_RELEASED');
    }

    const { scale, courses } = await referenceData();
    const current = computeTermResults({ grades: await gradesFor(student.id, term.id), courses, scale, caWeight: term.ca_weight });

    // Cumulative GPA: every released term up to and including this one.
    const [released] = await db.execute(
        'SELECT id, ca_weight FROM terms WHERE results_released = 1 AND start_date <= ? ORDER BY start_date',
        [term.start_date]
    );
    const summaries = [];
    for (const t of released) {
        const result = t.id === term.id ? current : computeTermResults({ grades: await gradesFor(student.id, t.id), courses, scale, caWeight: t.ca_weight });
        summaries.push(result.summary);
    }

    const [[attendance]] = await db.execute(
        `SELECT COUNT(*) AS days, COALESCE(SUM(status <> 'Absent'), 0) AS present
         FROM attendance WHERE student_id = ? AND date BETWEEN ? AND ?`,
        [student.id, term.start_date, term.end_date]
    );
    const days = Number(attendance.days);
    const present = Number(attendance.present);

    return {
        student: {
            name: `${student.first_name} ${student.last_name}`,
            indexNumber: student.enrollment_number,
            email: student.email,
            className: student.class_name,
            level: student.level,
            program: student.program_name,
            stream: student.stream_name,
        },
        term: { id: term.id, name: term.name, startDate: term.start_date, endDate: term.end_date },
        weights: { classWork: term.ca_weight, exam: 100 - term.ca_weight },
        rows: current.rows,
        summary: { ...current.summary, cumulative: cumulative(summaries) },
        attendance: { days, present, rate: days ? Math.round((present / days) * 1000) / 10 : null },
        scale: scale.map((s) => ({ minScore: Number(s.min_score), grade: s.grade, gradePoint: Number(s.grade_point), remark: s.remark })),
        generatedAt: new Date().toISOString(),
    };
}

module.exports = { termsForUser, statementForUser, studentForUser };
