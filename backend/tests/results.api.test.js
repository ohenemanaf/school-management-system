const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, onQuery, tokenFor, reset } = require('./helpers');

beforeEach(reset);

const student = () => onQuery(/FROM students s\s+JOIN users u ON u\.id = s\.user_id\s+LEFT JOIN student_groups/, [[{ id: 5, first_name: 'Ama', last_name: 'Mensah', enrollment_number: 'S-1' }]]);

test('only students can open a results statement', async () => {
    for (const role of ['SUPER_ADMIN', 'ADMIN', 'HEADMASTER', 'LECTURER', 'ACCOUNTANT']) {
        assert.strictEqual((await request(app).get('/api/results/statement?term_id=1').set('Authorization', tokenFor(role))).status, 403, role);
    }
});

test('results stay hidden until the term is released', async () => {
    student();
    onQuery(/SELECT \* FROM terms WHERE id = \?/, [[{ id: 1, name: 'Term 1', results_released: 0, ca_weight: 30 }]]);
    const res = await request(app).get('/api/results/statement?term_id=1').set('Authorization', tokenFor('STUDENT'));
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'NOT_RELEASED');
});

test('a released statement is computed from the signed-in student own grades', async () => {
    student();
    onQuery(/SELECT \* FROM terms WHERE id = \?/, [[{ id: 1, name: 'Term 1', start_date: '2026-09-01', end_date: '2026-12-18', results_released: 1, ca_weight: 30 }]]);
    onQuery(/FROM grading_scale/, [[{ min_score: 70, grade: 'B', grade_point: 3, remark: 'Good' }, { min_score: 0, grade: 'F', grade_point: 0, remark: 'Fail' }]]);
    onQuery(/SELECT id, code, name, credit_hours FROM courses/, [[{ id: 3, code: 'M1', name: 'Maths', credit_hours: 3 }]]);
    onQuery(/FROM grades WHERE student_id = \? AND term_id = \?/, (sql, params) => {
        assert.strictEqual(params[0], 5, 'grades of the signed-in student only');
        return [[{ course_id: 3, component: 'CLASS', assessment_name: 'Quiz', score: 25, max_score: 30 }, { course_id: 3, component: 'EXAM', assessment_name: 'Exam', score: 70, max_score: 100 }]];
    });
    onQuery(/SELECT id, ca_weight FROM terms WHERE results_released = 1/, [[{ id: 1, ca_weight: 30 }]]);
    onQuery(/FROM attendance WHERE student_id = \?/, [[{ days: 20, present: 18 }]]);
    const res = await request(app).get('/api/results/statement?term_id=1').set('Authorization', tokenFor('STUDENT'));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.rows[0].total, 74);
    assert.strictEqual(res.body.rows[0].grade, 'B');
    assert.strictEqual(res.body.summary.gpa, 3);
    assert.strictEqual(res.body.summary.cumulative.cgpa, 3);
    assert.strictEqual(res.body.attendance.rate, 90);
});

test('only super admin and admin can release results', async () => {
    for (const role of ['HEADMASTER', 'LECTURER', 'ACCOUNTANT', 'STUDENT']) {
        assert.strictEqual((await request(app).post('/api/terms/1/results').set('Authorization', tokenFor(role)).send({ released: true })).status, 403, role);
    }
    const ok = await request(app).post('/api/terms/1/results').set('Authorization', tokenFor('ADMIN')).send({ released: true, caWeight: 40 });
    assert.strictEqual(ok.status, 200);
    const bad = await request(app).post('/api/terms/1/results').set('Authorization', tokenFor('ADMIN')).send({ released: true, caWeight: 120 });
    assert.strictEqual(bad.status, 400);
});
