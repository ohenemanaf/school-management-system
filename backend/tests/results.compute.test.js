const { test } = require('node:test');
const assert = require('node:assert');
const { computeTermResults, cumulative, gradeFor } = require('../src/modules/results/results.compute');

const SCALE = [
    { min_score: 80, grade: 'A', grade_point: 4.0, remark: 'Excellent' },
    { min_score: 75, grade: 'B+', grade_point: 3.5, remark: 'Very good' },
    { min_score: 70, grade: 'B', grade_point: 3.0, remark: 'Good' },
    { min_score: 65, grade: 'C+', grade_point: 2.5, remark: 'Fairly good' },
    { min_score: 60, grade: 'C', grade_point: 2.0, remark: 'Average' },
    { min_score: 55, grade: 'D+', grade_point: 1.5, remark: 'Below average' },
    { min_score: 50, grade: 'D', grade_point: 1.0, remark: 'Marginal pass' },
    { min_score: 0, grade: 'F', grade_point: 0, remark: 'Fail' },
];
const COURSES = new Map([
    [1, { code: 'MTH101', name: 'Mathematics', credit_hours: 3 }],
    [2, { code: 'ENG101', name: 'English', credit_hours: 2 }],
    [3, { code: 'SCI101', name: 'Science', credit_hours: 3 }],
]);
const g = (course_id, component, score, max_score, name = 'x') => ({ course_id, component, score, max_score, assessment_name: name });

test('class work and exam are weighted 30/70 into a total out of 100', () => {
    const { rows } = computeTermResults({
        grades: [g(1, 'CLASS', 18, 20), g(1, 'CLASS', 24, 30), g(1, 'EXAM', 70, 100)],
        courses: COURSES, scale: SCALE, caWeight: 30,
    });
    // class work 42/50 = 84% -> 25.2 of 30; exam 70% -> 49 of 70; total 74.2
    assert.deepStrictEqual([rows[0].caMark, rows[0].examMark, rows[0].total], [25.2, 49, 74.2]);
    assert.strictEqual(rows[0].grade, 'B');
    assert.strictEqual(rows[0].gradePoint, 3);
});

test('grade boundaries include their minimum', () => {
    assert.strictEqual(gradeFor(80, SCALE).grade, 'A');
    assert.strictEqual(gradeFor(79.9, SCALE).grade, 'B+');
    assert.strictEqual(gradeFor(50, SCALE).grade, 'D');
    assert.strictEqual(gradeFor(49.9, SCALE).grade, 'F');
});

test('a subject without an exam mark is incomplete and left out of the GPA', () => {
    const { rows, summary } = computeTermResults({
        grades: [g(1, 'CLASS', 20, 20), g(1, 'EXAM', 90, 100), g(2, 'CLASS', 10, 20)],
        courses: COURSES, scale: SCALE,
    });
    const english = rows.find((r) => r.courseId === 2);
    assert.strictEqual(english.grade, 'IC');
    assert.strictEqual(english.total, null);
    assert.strictEqual(summary.incomplete, 1);
    assert.strictEqual(summary.creditsAttempted, 3);
    assert.strictEqual(summary.gpa, 4);
});

test('GPA and average are weighted by credit hours', () => {
    const { summary } = computeTermResults({
        grades: [
            g(1, 'CLASS', 30, 30), g(1, 'EXAM', 100, 100), // 100 -> A (4.0), 3 credits
            g(2, 'CLASS', 15, 30), g(2, 'EXAM', 50, 100), //  50 -> D (1.0), 2 credits
        ],
        courses: COURSES, scale: SCALE,
    });
    assert.strictEqual(summary.gpa, 2.8); // (12 + 2) / 5
    assert.strictEqual(summary.weightedAverage, 80); // (300 + 100) / 5
    assert.strictEqual(summary.creditsEarned, 5);
});

test('failed subjects count as attempted but not earned', () => {
    const { summary, rows } = computeTermResults({
        grades: [g(3, 'CLASS', 5, 30), g(3, 'EXAM', 20, 100)],
        courses: COURSES, scale: SCALE,
    });
    assert.strictEqual(rows[0].grade, 'F');
    assert.strictEqual(rows[0].passed, false);
    assert.deepStrictEqual([summary.creditsAttempted, summary.creditsEarned, summary.gpa], [3, 0, 0]);
});

test('a different class-work weighting is respected', () => {
    const { rows } = computeTermResults({
        grades: [g(1, 'CLASS', 20, 20), g(1, 'EXAM', 50, 100)],
        courses: COURSES, scale: SCALE, caWeight: 40,
    });
    assert.deepStrictEqual([rows[0].caMark, rows[0].examMark, rows[0].total], [40, 30, 70]);
});

test('grades not linked to a subject are ignored', () => {
    const { rows } = computeTermResults({ grades: [g(null, 'CLASS', 5, 10)], courses: COURSES, scale: SCALE });
    assert.deepStrictEqual(rows, []);
});

test('cumulative GPA spans terms by credits', () => {
    assert.deepStrictEqual(cumulative([
        { creditsAttempted: 6, qualityPoints: 24 },
        { creditsAttempted: 4, qualityPoints: 8 },
    ]), { credits: 10, cgpa: 3.2 });
});
