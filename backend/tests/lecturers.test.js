const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, onQuery, tokenFor, reset, calls } = require('./helpers');

beforeEach(reset);

test('new lecturers need a first and last name', async () => {
    const res = await request(app).post('/api/lecturers').set('Authorization', tokenFor('ADMIN'))
        .send({ email: 'lec@school.test', password: 'a-long-password-1', department: 'Science' });
    assert.strictEqual(res.status, 400);
});

test('lecturer names are stored', async () => {
    onQuery(/SELECT id FROM roles WHERE name = \?/, [[{ id: 6 }]]);
    const res = await request(app).post('/api/lecturers').set('Authorization', tokenFor('ADMIN'))
        .send({ email: 'lec@school.test', password: 'a-long-password-1', department: 'Science', firstName: 'Ama', lastName: 'Owusu' });
    assert.strictEqual(res.status, 201);
    const insert = calls.find(c => /INSERT INTO lecturers/.test(c.sql));
    assert.match(insert.sql, /first_name, last_name/);
    assert.ok(insert.params.includes('Ama') && insert.params.includes('Owusu'));
});

test('editing a lecturer without names keeps the existing ones', async () => {
    onQuery(/SELECT user_id FROM lecturers WHERE id = \?/, [[{ user_id: 50 }]]);
    await request(app).put('/api/lecturers/3').set('Authorization', tokenFor('ADMIN'))
        .send({ email: 'lec@school.test', department: 'Science' });
    const update = calls.find(c => /UPDATE lecturers SET/.test(c.sql));
    assert.match(update.sql, /first_name = COALESCE\(\?, first_name\)/);
});

test('timetable rows carry the lecturer name', async () => {
    onQuery(/FROM timetable_sessions t/, (sql) => [[{ sql }]]);
    const res = await request(app).get('/api/timetable').set('Authorization', tokenFor('STUDENT'));
    assert.match(res.body[0].sql, /AS lecturer_name/);
});

test("a lecturer's display name comes from their profile", async () => {
    onQuery(/SELECT first_name, last_name FROM lecturers WHERE user_id = \?/, [[{ first_name: 'Ama', last_name: 'Owusu' }]]);
    const res = await request(app).get('/api/users/profile').set('Authorization', tokenFor('LECTURER'));
    assert.strictEqual(res.body.user.name, 'Ama Owusu');
});
