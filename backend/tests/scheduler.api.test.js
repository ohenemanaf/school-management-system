const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, onQuery, tokenFor, reset, calls } = require('./helpers');
const { parseAlertDays } = require('../src/modules/scheduler/terms.controller');
const { msUntil } = require('../src/jobs/scheduler');

beforeEach(reset);

const as = (role) => {
    const auth = tokenFor(role);
    return {
        get: (url) => request(app).get(url).set('Authorization', auth),
        post: (url, body) => request(app).post(url).set('Authorization', auth).send(body),
        put: (url, body) => request(app).put(url).set('Authorization', auth).send(body),
    };
};

test('only super admin and admin can use the timetable generator', async () => {
    for (const role of ['HEADMASTER', 'LECTURER', 'STUDENT', 'ACCOUNTANT']) {
        assert.strictEqual((await as(role).post('/api/scheduler/generate', { termId: 1 })).status, 403, role);
        assert.strictEqual((await as(role).get('/api/scheduler/setup')).status, 403, role);
    }
    assert.strictEqual((await as('ADMIN').get('/api/scheduler/setup')).status, 200);
});

test('everyone except the gatekeeper can see the current term and exam dates', async () => {
    assert.strictEqual((await as('STUDENT').get('/api/terms/current')).status, 200);
    assert.strictEqual((await as('GATEKEEPER').get('/api/terms/current')).status, 403);
    assert.strictEqual((await as('STUDENT').post('/api/terms', { name: 'T', start_date: '2026-01-01', end_date: '2026-03-01' })).status, 403);
});

test('only super admin and admin can run reminders by hand', async () => {
    assert.strictEqual((await as('LECTURER').post('/api/reminders/run', { preview: true })).status, 403);
    assert.strictEqual((await as('ADMIN').post('/api/reminders/run', { date: 'tomorrow' })).status, 400);
});

test('the bell schedule rejects overlapping periods', async () => {
    const res = await as('ADMIN').put('/api/scheduler/bell', { periods: [
        { label: 'P1', start_time: '08:00', end_time: '08:45', kind: 'LESSON' },
        { label: 'P2', start_time: '08:30', end_time: '09:15', kind: 'LESSON' },
    ] });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /overlaps/);
});

test('the bell schedule needs at least one lesson', async () => {
    const res = await as('ADMIN').put('/api/scheduler/bell', { periods: [{ label: 'Break', start_time: '10:00', end_time: '10:30', kind: 'BREAK' }] });
    assert.strictEqual(res.status, 400);
});

test('a class cannot be given more periods than the week has', async () => {
    onQuery(/COUNT\(\*\) AS lessons FROM bell_periods/, [[{ lessons: 8 }]]);
    const items = [{ courseId: 1, periodsPerWeek: 15 }, { courseId: 2, periodsPerWeek: 15 }, { courseId: 3, periodsPerWeek: 15 }];
    const res = await as('ADMIN').put('/api/scheduler/allocations/4', { termId: 1, items });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /45 periods a week, but the week only has 40/);
});

test('a subject cannot be listed twice for one class', async () => {
    const res = await as('ADMIN').put('/api/scheduler/allocations/4', { termId: 1, items: [{ courseId: 1, periodsPerWeek: 2 }, { courseId: 1, periodsPerWeek: 3 }] });
    assert.strictEqual(res.status, 400);
});

test('teacher limits and skill levels are validated', async () => {
    const admin = as('ADMIN');
    assert.strictEqual((await admin.put('/api/scheduler/teachers/3', { maxPerWeek: 0, maxPerDay: 5, subjects: [] })).status, 400);
    assert.strictEqual((await admin.put('/api/scheduler/teachers/3', { maxPerWeek: 20, maxPerDay: 5, subjects: [{ courseId: 1, proficiency: 7 }] })).status, 400);
    const ok = await admin.put('/api/scheduler/teachers/3', { maxPerWeek: 20, maxPerDay: 5, subjects: [{ courseId: 1, proficiency: 3 }] });
    assert.strictEqual(ok.status, 200);
    assert.ok(calls.some((c) => /INSERT INTO lecturer_subjects/.test(c.sql)));
});

test('copying allocations never copies a fixed teacher', async () => {
    onQuery(/SELECT course_id, periods_per_week FROM class_subjects/, [[{ course_id: 1, periods_per_week: 5 }]]);
    const res = await as('ADMIN').post('/api/scheduler/allocations/copy', { termId: 1, fromGroupId: 2, toGroupIds: [3, 4] });
    assert.strictEqual(res.status, 200);
    const insert = calls.find((c) => /INSERT INTO class_subjects/.test(c.sql));
    assert.deepStrictEqual(insert.params[0], [[1, 3, 1, 5, null], [1, 4, 1, 5, null]]);
});

test('exam alert days are parsed and validated', () => {
    assert.strictEqual(parseAlertDays(undefined), '14,7,1');
    assert.strictEqual(parseAlertDays('1, 7,14,7'), '14,7,1');
    assert.strictEqual(parseAlertDays('soon'), null);
    assert.strictEqual(parseAlertDays('120'), null);
});

test('the daily job waits until the next 07:00', () => {
    const at = (h, m) => new Date(2026, 10, 10, h, m, 0);
    assert.strictEqual(msUntil(7, 0, at(6, 0)), 60 * 60 * 1000);
    assert.strictEqual(msUntil(7, 0, at(7, 0)), 24 * 60 * 60 * 1000);
    assert.strictEqual(msUntil(7, 0, at(8, 0)), 23 * 60 * 60 * 1000);
});
