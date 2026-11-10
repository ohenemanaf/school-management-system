const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, onQuery, tokenFor, reset, calls } = require('./helpers');

beforeEach(reset);

test('grades can be filtered by group and are capped', async () => {
    onQuery(/FROM grades g/, (sql, params) => [[{ sql, params }]]);
    const res = await request(app).get('/api/grades?student_group_id=4').set('Authorization', tokenFor('LECTURER'));
    assert.match(res.body[0].sql, /WHERE g\.student_group_id = \?/);
    assert.match(res.body[0].sql, /LIMIT 500$/);
    assert.deepStrictEqual(res.body[0].params, ['4']);
});

test('a grade for a student outside the group is rejected', async () => {
    onQuery(/SELECT id FROM students WHERE id = \? AND student_group_id = \?/, [[]]);
    const res = await request(app).post('/api/grades').set('Authorization', tokenFor('LECTURER'))
        .send({ studentId: 1, studentGroupId: 9, assessmentName: 'Quiz', score: 5, maxScore: 10 });
    assert.strictEqual(res.status, 400);
    assert.ok(!calls.some(c => /INSERT INTO grades/.test(c.sql)));
});

test('a grade for a student in the group is saved', async () => {
    onQuery(/SELECT id FROM students WHERE id = \? AND student_group_id = \?/, [[{ id: 1 }]]);
    const res = await request(app).post('/api/grades').set('Authorization', tokenFor('LECTURER'))
        .send({ studentId: 1, studentGroupId: 4, assessmentName: 'Quiz', score: 5, maxScore: 10 });
    assert.strictEqual(res.status, 201);
});
