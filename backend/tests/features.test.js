const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, onQuery, tokenFor, reset, calls, teaches } = require('./helpers');
const emailService = require('../src/utils/emailService');

const sentEmails = [];
emailService.sendWelcomeEmail = async (to) => { calls.push({ sql: `EMAIL ${to}` }); sentEmails.push(to); return true; };

beforeEach(() => { reset(); sentEmails.length = 0; });

const csv = (text) => Buffer.from(text.trim() + '\n');

test('students can load their own attendance', async () => {
    onQuery(/SELECT id FROM students WHERE user_id = \?/, [[{ id: 12 }]]);
    onQuery(/WHERE a\.student_id = \?/, (sql, params) => [[{ student_id: params[0] }]]);
    const res = await request(app).get('/api/attendance').set('Authorization', tokenFor('STUDENT'));
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body, [{ student_id: 12 }]);
});

test("students only see materials for their own group", async () => {
    onQuery(/SELECT student_group_id FROM students WHERE user_id = \?/, [[{ student_group_id: 4 }]]);
    onQuery(/FROM materials m/, (sql, params) => [[{ sql, params }]]);
    const res = await request(app).get('/api/materials').set('Authorization', tokenFor('STUDENT'));
    assert.strictEqual(res.status, 200);
    assert.match(res.body[0].sql, /WHERE m\.student_group_id = \?/);
    assert.deepStrictEqual(res.body[0].params, [4]);
});

test('students without a group see no materials', async () => {
    onQuery(/SELECT student_group_id FROM students WHERE user_id = \?/, [[{ student_group_id: null }]]);
    const res = await request(app).get('/api/materials').set('Authorization', tokenFor('STUDENT'));
    assert.deepStrictEqual(res.body, []);
});

test('lecturers always upload materials as themselves', async () => {
    teaches(1);
    onQuery(/SELECT id FROM lecturers WHERE user_id = \?/, [[{ id: 3 }]]);
    await request(app).post('/api/materials').set('Authorization', tokenFor('LECTURER'))
        .send({ studentGroupId: 1, lecturerId: 99, title: 'Notes', fileUrl: 'https://example.test/notes.pdf' });
    const insert = calls.find(c => /INSERT INTO materials/.test(c.sql));
    assert.strictEqual(insert.params[1], 3);
});

test('bulk student import skips duplicate rows inside the file and emails only after commit', async () => {
    onQuery(/SELECT id FROM roles WHERE name = \?/, [[{ id: 7 }]]);
    const file = csv(`firstName,lastName,email,enrollmentNumber
Ama,Mensah,ama@school.test,S-1
Kofi,Owusu,kofi@school.test,S-2
Ama,Again,AMA@school.test,S-3
Esi,Boateng,esi@school.test,S-2`);
    const res = await request(app).post('/api/students/bulk-upload').set('Authorization', tokenFor('ADMIN'))
        .attach('file', file, { filename: 'students.csv', contentType: 'text/csv' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.successful, 2);
    assert.strictEqual(res.body.failed, 2);

    await new Promise(r => setImmediate(r)); // let background emails start
    const commitAt = calls.findIndex(c => c.sql === 'COMMIT');
    const firstEmailAt = calls.findIndex(c => c.sql.startsWith('EMAIL'));
    assert.ok(commitAt >= 0 && firstEmailAt > commitAt, 'emails are sent after the commit');
    assert.deepStrictEqual(sentEmails.sort(), ['ama@school.test', 'kofi@school.test']);
});

test('a failing row is rolled back to its savepoint without aborting the import', async () => {
    onQuery(/SELECT id FROM roles WHERE name = \?/, [[{ id: 7 }]]);
    onQuery(/INSERT INTO students/, (sql, params) => {
        if (params.includes('BAD')) { const e = new Error('dup'); e.code = 'ER_DUP_ENTRY'; throw e; }
        return [{ insertId: 1, affectedRows: 1 }];
    });
    const file = csv(`firstName,lastName,email,enrollmentNumber
Ama,Mensah,ama@school.test,BAD
Kofi,Owusu,kofi@school.test,S-2`);
    const res = await request(app).post('/api/students/bulk-upload').set('Authorization', tokenFor('ADMIN'))
        .attach('file', file, { filename: 'students.csv', contentType: 'text/csv' });
    assert.strictEqual(res.body.successful, 1);
    assert.strictEqual(res.body.failed, 1);
    assert.ok(calls.some(c => /ROLLBACK TO SAVEPOINT/.test(c.sql)));
    assert.ok(calls.some(c => c.sql === 'COMMIT'));
});

test('imported and admin-created accounts must change their password', async () => {
    onQuery(/SELECT id FROM roles WHERE name = \?/, [[{ id: 7 }]]);
    onQuery(/INSERT INTO students/, [{ insertId: 21, affectedRows: 1 }]);
    await request(app).post('/api/students').set('Authorization', tokenFor('ADMIN'))
        .send({ email: 'new@school.test', firstName: 'New', lastName: 'Student' });
    const insertUser = calls.find(c => /INSERT INTO users/.test(c.sql));
    assert.match(insertUser.sql, /must_change_password/);
});

test('generated index numbers come from the new row id, so they cannot collide', async () => {
    onQuery(/SELECT id FROM roles WHERE name = \?/, [[{ id: 7 }]]);
    onQuery(/INSERT INTO students/, [{ insertId: 21, affectedRows: 1 }]);
    const res = await request(app).post('/api/students').set('Authorization', tokenFor('ADMIN'))
        .send({ email: 'new@school.test', firstName: 'New', lastName: 'Student' });
    assert.strictEqual(res.status, 201);
    assert.match(res.body.credentials.enrollmentNumber, /^SMS-\d{4}-0021$/);
    assert.ok(calls.some(c => /UPDATE students SET enrollment_number = \? WHERE id = \?/.test(c.sql)));
});

test('lecturer accounts need a 12+ character password', async () => {
    const res = await request(app).post('/api/lecturers').set('Authorization', tokenFor('ADMIN'))
        .send({ email: 'lec@school.test', password: 'short', department: 'Science' });
    assert.strictEqual(res.status, 400);
});

test('grades above the maximum score are rejected', async () => {
    const res = await request(app).post('/api/grades').set('Authorization', tokenFor('LECTURER'))
        .send({ studentId: 1, studentGroupId: 1, assessmentName: 'Quiz', score: 12, maxScore: 10 });
    assert.strictEqual(res.status, 400);
});

test('attendance status must be a known value', async () => {
    const res = await request(app).post('/api/attendance').set('Authorization', tokenFor('LECTURER'))
        .send({ studentId: 1, studentGroupId: 1, date: '2026-11-10', status: 'Sleeping' });
    assert.strictEqual(res.status, 400);
});

test('partial book updates only touch the fields sent', async () => {
    const res = await request(app).put('/api/library/books/5').set('Authorization', tokenFor('LIBRARIAN'))
        .send({ category: 'Science' });
    assert.strictEqual(res.status, 200);
    const update = calls.find(c => /UPDATE books SET/.test(c.sql));
    assert.match(update.sql, /UPDATE books SET category = \? WHERE id = \?/);
    assert.deepStrictEqual(update.params, ['Science', '5']);
});

test('available copies cannot exceed total copies', async () => {
    const res = await request(app).put('/api/library/books/5').set('Authorization', tokenFor('LIBRARIAN'))
        .send({ total_copies: 2, available_copies: 5 });
    assert.strictEqual(res.status, 400);
});
