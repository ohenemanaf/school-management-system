const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, onQuery, tokenFor, reset, calls, teaches } = require('./helpers');

beforeEach(reset);

test('a whole class is saved with one attendance insert', async () => {
    teaches(4);
    onQuery(/SELECT id FROM students WHERE student_group_id = \? AND id IN \(\?\)/, [[{ id: 1 }, { id: 2 }, { id: 3 }]]);
    const res = await request(app).post('/api/attendance/bulk').set('Authorization', tokenFor('LECTURER'))
        .send({
            studentGroupId: 4, date: '2026-11-10',
            records: [{ studentId: 1, status: 'Present' }, { studentId: 2, status: 'Absent' }, { studentId: 3, status: 'Late' }],
        });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.saved, 3);
    const inserts = calls.filter(c => /INSERT INTO attendance/.test(c.sql));
    assert.strictEqual(inserts.length, 1);
    assert.deepStrictEqual(inserts[0].params[0], [[1, 4, '2026-11-10', 'Present'], [2, 4, '2026-11-10', 'Absent'], [3, 4, '2026-11-10', 'Late']]);
});

test('bulk attendance ignores students who are not in the group', async () => {
    teaches(4);
    onQuery(/SELECT id FROM students WHERE student_group_id = \? AND id IN \(\?\)/, [[{ id: 1 }]]);
    const res = await request(app).post('/api/attendance/bulk').set('Authorization', tokenFor('LECTURER'))
        .send({ studentGroupId: 4, date: '2026-11-10', records: [{ studentId: 1, status: 'Present' }, { studentId: 99, status: 'Present' }] });
    assert.strictEqual(res.body.saved, 1);
    assert.deepStrictEqual(res.body.skipped, [99]);
});

test('bulk attendance validates its input', async () => {
    const auth = tokenFor('LECTURER');
    const bad = [
        { studentGroupId: 4, date: 'yesterday', records: [{ studentId: 1, status: 'Present' }] },
        { studentGroupId: 4, date: '2026-11-10', records: [] },
        { studentGroupId: 4, date: '2026-11-10', records: [{ studentId: 1, status: 'Asleep' }] },
    ];
    for (const body of bad) {
        assert.strictEqual((await request(app).post('/api/attendance/bulk').set('Authorization', auth).send(body)).status, 400);
    }
});

test('students can be filtered by group on the server', async () => {
    teaches(4);
    const res = await request(app).get('/api/students?student_group_id=4').set('Authorization', tokenFor('LECTURER'));
    assert.strictEqual(res.status, 200);
    const query = calls.find(c => /FROM students s/.test(c.sql));
    assert.match(query.sql, /WHERE s\.student_group_id = \?/);
    // the requested group, then the lecturer's own-classes limit
    assert.deepStrictEqual(query.params, ['4', 4]);
});

test('attendance history is capped and filterable', async () => {
    onQuery(/FROM attendance a/, (sql, params) => [[{ sql, params }]]);
    const res = await request(app).get('/api/attendance?student_group_id=4&limit=50').set('Authorization', tokenFor('ADMIN'));
    assert.match(res.body[0].sql, /WHERE a\.student_group_id = \?/);
    assert.match(res.body[0].sql, /LIMIT 50$/);
});

test('a role broadcast is one INSERT ... SELECT, whatever the number of users', async () => {
    onQuery(/SELECT id FROM roles WHERE name = \?/, [[{ id: 7 }]]);
    const res = await request(app).post('/api/notifications/broadcast').set('Authorization', tokenFor('ADMIN'))
        .send({ title: 'Exams', message: 'Start Monday', audience: 'STUDENT' });
    assert.strictEqual(res.status, 201);
    const insert = calls.find(c => /INSERT INTO notifications/.test(c.sql));
    assert.match(insert.sql, /INSERT INTO notifications \(user_id, title, message, type\)\s+SELECT id, \?, \?, \? FROM users/);
    assert.deepStrictEqual(insert.params, ['Exams', 'Start Monday', 'INFO', 7]);
});

test('school-wide notifications are marked read per user', async () => {
    onQuery(/UPDATE notifications SET is_read = TRUE WHERE id = \? AND user_id = \?/, [{ affectedRows: 0 }]);
    const res = await request(app).put('/api/notifications/8/read').set('Authorization', tokenFor('STUDENT', { id: 30 }));
    assert.strictEqual(res.status, 200);
    const read = calls.find(c => /INSERT IGNORE INTO notification_reads/.test(c.sql));
    assert.ok(read, 'records a per-user read receipt');
    assert.deepStrictEqual(read.params, [30, '8']);
});

test('notification list reports read state from the per-user receipts', async () => {
    onQuery(/FROM notifications/, (sql) => [[{ sql }]]);
    const res = await request(app).get('/api/notifications').set('Authorization', tokenFor('STUDENT', { id: 30 }));
    assert.match(res.body[0].sql, /LEFT JOIN notification_reads/);
});
