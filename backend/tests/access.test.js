const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, onQuery, tokenFor, reset } = require('./helpers');

beforeEach(reset);

test('students cannot create or delete programs', async () => {
    const auth = tokenFor('STUDENT');
    assert.strictEqual((await request(app).post('/api/programs').set('Authorization', auth).send({ name: 'X', code: 'X' })).status, 403);
    assert.strictEqual((await request(app).delete('/api/programs/1').set('Authorization', auth)).status, 403);
});

test('admins can create programs', async () => {
    const res = await request(app).post('/api/programs').set('Authorization', tokenFor('ADMIN')).send({ name: 'Science', code: 'SCI' });
    assert.strictEqual(res.status, 201);
});

test('super admins can manage courses', async () => {
    const res = await request(app).post('/api/courses').set('Authorization', tokenFor('SUPER_ADMIN')).send({ name: 'Maths', code: 'M1' });
    assert.strictEqual(res.status, 201);
});

test('lecturers cannot write staff attendance directly', async () => {
    const res = await request(app).post('/api/lecturer-attendance').set('Authorization', tokenFor('LECTURER'))
        .send({ lecturerId: 7, date: '2026-01-05', status: 'Present' });
    assert.strictEqual(res.status, 403);
});

test("lecturers cannot read another lecturer's attendance", async () => {
    const res = await request(app).get('/api/lecturer-attendance/7').set('Authorization', tokenFor('LECTURER'));
    assert.strictEqual(res.status, 403);
});

test('lecturers can read their own attendance', async () => {
    onQuery(/SELECT id FROM lecturers WHERE user_id = \?/, [[{ id: 3 }]]);
    onQuery(/FROM lecturer_attendance\s+WHERE lecturer_id = \?/, (sql, params) => [[{ lecturer_id: params[0] }]]);
    const res = await request(app).get('/api/lecturer-attendance/me').set('Authorization', tokenFor('LECTURER'));
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body, [{ lecturer_id: 3 }]);
});

test("students cannot read payments on another student's invoice", async () => {
    onQuery(/SELECT id FROM students WHERE user_id = \?/, [[{ id: 1 }]]);
    onQuery(/SELECT student_id FROM invoices WHERE id = \?/, [[{ student_id: 2 }]]);
    const res = await request(app).get('/api/finance/payments/55').set('Authorization', tokenFor('STUDENT'));
    assert.strictEqual(res.status, 404);
});

test('students can read payments on their own invoice', async () => {
    onQuery(/SELECT id FROM students WHERE user_id = \?/, [[{ id: 1 }]]);
    onQuery(/SELECT student_id FROM invoices WHERE id = \?/, [[{ student_id: 1 }]]);
    const res = await request(app).get('/api/finance/payments/55').set('Authorization', tokenFor('STUDENT'));
    assert.strictEqual(res.status, 200);
});

test('school-wide stats are not visible to students', async () => {
    const res = await request(app).get('/api/stats').set('Authorization', tokenFor('STUDENT'));
    assert.strictEqual(res.status, 403);
});

test('non-library staff only see their own loans', async () => {
    onQuery(/WHERE l\.user_id = \?/, (sql, params) => [[{ user_id: params[0] }]]);
    const res = await request(app).get('/api/library/loans').set('Authorization', tokenFor('GATEKEEPER', { id: 9 }));
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body, [{ user_id: 9 }]);
});
