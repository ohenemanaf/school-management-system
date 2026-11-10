const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, onQuery, tokenFor, reset, calls, teaches } = require('./helpers');

beforeEach(reset);

test('grades can be filtered by group and are capped', async () => {
    teaches(4);
    onQuery(/FROM grades g/, (sql, params) => [[{ sql, params }]]);
    const res = await request(app).get('/api/grades?student_group_id=4').set('Authorization', tokenFor('LECTURER'));
    assert.match(res.body[0].sql, /WHERE g\.student_group_id = \?/);
    assert.match(res.body[0].sql, /LIMIT 500$/);
    // the requested group, then the lecturer's own-classes limit
    assert.deepStrictEqual(res.body[0].params, ['4', 4]);
});

test('a grade for a student outside the group is rejected', async () => {
    teaches(9);
    onQuery(/SELECT id FROM students WHERE id = \? AND student_group_id = \?/, [[]]);
    const res = await request(app).post('/api/grades').set('Authorization', tokenFor('LECTURER'))
        .send({ studentId: 1, studentGroupId: 9, assessmentName: 'Quiz', score: 5, maxScore: 10 });
    assert.strictEqual(res.status, 400);
    assert.ok(!calls.some(c => /INSERT INTO grades/.test(c.sql)));
});

test('a grade for a student in the group is saved with its subject, term and type', async () => {
    teaches(4);
    onQuery(/SELECT id FROM students WHERE id = \? AND student_group_id = \?/, [[{ id: 1 }]]);
    onQuery(/SELECT DISTINCT c\.id, c\.name, c\.code/, [[{ id: 3, name: 'Maths', code: 'M1' }]]);
    onQuery(/FROM terms WHERE is_current = 1/, [[{ id: 7, name: 'Term 1' }]]);
    const res = await request(app).post('/api/grades').set('Authorization', tokenFor('LECTURER'))
        .send({ studentId: 1, studentGroupId: 4, assessmentName: 'Final exam', score: 55, maxScore: 100, courseId: 3, component: 'EXAM' });
    assert.strictEqual(res.status, 201);
    const insert = calls.find((c) => /INSERT INTO grades/.test(c.sql));
    assert.deepStrictEqual(insert.params.slice(5), [3, 7, 'EXAM']);
});

test('a grade needs a subject and a valid type', async () => {
    teaches(4);
    const lecturer = tokenFor('LECTURER');
    const base = { studentId: 1, studentGroupId: 4, assessmentName: 'Quiz', score: 5, maxScore: 10 };
    assert.strictEqual((await request(app).post('/api/grades').set('Authorization', lecturer).send(base)).status, 400);
    assert.strictEqual((await request(app).post('/api/grades').set('Authorization', lecturer).send({ ...base, courseId: 3, component: 'ORAL' })).status, 400);
});

test('a lecturer cannot grade a subject they do not teach that class', async () => {
    teaches(4);
    onQuery(/SELECT id FROM students WHERE id = \? AND student_group_id = \?/, [[{ id: 1 }]]);
    onQuery(/SELECT DISTINCT c\.id, c\.name, c\.code/, [[{ id: 3, name: 'Maths', code: 'M1' }]]);
    const res = await request(app).post('/api/grades').set('Authorization', tokenFor('LECTURER'))
        .send({ studentId: 1, studentGroupId: 4, assessmentName: 'Quiz', score: 5, maxScore: 10, courseId: 9, component: 'CLASS' });
    assert.strictEqual(res.status, 403);
});

test('grades cannot be filed when there is no current term', async () => {
    teaches(4);
    onQuery(/SELECT id FROM students WHERE id = \? AND student_group_id = \?/, [[{ id: 1 }]]);
    onQuery(/SELECT DISTINCT c\.id, c\.name, c\.code/, [[{ id: 3, name: 'Maths', code: 'M1' }]]);
    const res = await request(app).post('/api/grades').set('Authorization', tokenFor('LECTURER'))
        .send({ studentId: 1, studentGroupId: 4, assessmentName: 'Quiz', score: 5, maxScore: 10, courseId: 3, component: 'CLASS' });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /current term/);
});

test('the grade form lists only subjects the lecturer teaches that class', async () => {
    teaches(4);
    onQuery(/SELECT DISTINCT c\.id, c\.name, c\.code/, [[{ id: 3, name: 'Maths', code: 'M1' }]]);
    const res = await request(app).get('/api/grades/options?student_group_id=4').set('Authorization', tokenFor('LECTURER'));
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body.subjects.map((s) => s.id), [3]);
    assert.strictEqual((await request(app).get('/api/grades/options?student_group_id=9').set('Authorization', tokenFor('LECTURER'))).status, 403);
});
