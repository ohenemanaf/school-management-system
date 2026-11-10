/**
 * Demo marks for the current term so the Semester Results page can be tried.
 *
 *   npm run seed:results-demo
 *
 * For every class subject allocated in the current term (see
 * seed:scheduler-demo), each student without marks yet gets three pieces of
 * class work and an end-of-semester exam, then the term's results are
 * released. Existing marks are never changed. Refuses to run in production.
 */
require('dotenv').config();

if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed demo results in production.');
    process.exit(1);
}

const db = require('../src/config/db');

// Deterministic "random" numbers, so the same student always gets the same marks.
const noise = (a, b, c) => {
    const x = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
    return x - Math.floor(x);
};

const ASSESSMENTS = [
    ['Quiz 1', 'CLASS', 20],
    ['Assignment', 'CLASS', 30],
    ['Mid-semester test', 'CLASS', 50],
    ['End of semester exam', 'EXAM', 100],
];

async function seed() {
    const [[term]] = await db.query('SELECT id, name FROM terms WHERE is_current = 1 LIMIT 1');
    if (!term) {
        console.log('No current term. Run npm run seed:scheduler-demo first (or set a current term).');
        return;
    }
    const [allocations] = await db.query(
        'SELECT student_group_id, course_id FROM class_subjects WHERE term_id = ? ORDER BY student_group_id, course_id',
        [term.id]
    );
    if (!allocations.length) {
        console.log(`No subjects are allocated in ${term.name}. Run npm run seed:scheduler-demo first.`);
        return;
    }

    const rows = [];
    for (const { student_group_id: groupId, course_id: courseId } of allocations) {
        const [students] = await db.query(
            `SELECT s.id FROM students s
             WHERE s.student_group_id = ?
               AND NOT EXISTS (SELECT 1 FROM grades g WHERE g.student_id = s.id AND g.course_id = ? AND g.term_id = ?)`,
            [groupId, courseId, term.id]
        );
        for (const { id: studentId } of students) {
            // Each student has a steady ability (45-95%) with some variation per assessment.
            const ability = 45 + noise(studentId, 1, 1) * 50;
            for (const [i, [name, component, max]] of ASSESSMENTS.entries()) {
                const pct = Math.min(100, Math.max(15, ability + (noise(studentId, courseId, i + 2) - 0.5) * 24));
                rows.push([studentId, groupId, name, Math.round((pct / 100) * max * 2) / 2, max, courseId, term.id, component]);
            }
        }
    }

    if (rows.length) {
        await db.query(
            'INSERT INTO grades (student_id, student_group_id, assessment_name, score, max_score, course_id, term_id, component) VALUES ?',
            [rows]
        );
    }
    await db.query('UPDATE terms SET results_released = 1 WHERE id = ?', [term.id]);
    console.log(rows.length
        ? `Added ${rows.length} marks (${rows.length / ASSESSMENTS.length} student-subject results) for ${term.name} and released its results.`
        : `Every student already has marks for ${term.name}; results are released.`);
    console.log('Log in as a student and open Semester Results.');
}

seed()
    .catch((error) => {
        console.error('Demo results seed failed:', error);
        process.exitCode = 1;
    })
    .finally(() => db.end());
