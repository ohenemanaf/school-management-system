const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, onQuery, tokenFor, reset, calls } = require('./helpers');
const { escapeHtml } = require('../src/utils/emailService');

beforeEach(reset);

test('gate token check-in consumes the token in one atomic statement', async () => {
    onQuery(/SELECT id FROM lecturers WHERE user_id = \?/, [[{ id: 3 }]]);
    onQuery(/UPDATE gate_tokens SET is_used = TRUE/, [{ affectedRows: 1 }]);
    const res = await request(app).post('/api/attendance/lecturer-checkin')
        .set('Authorization', tokenFor('LECTURER', { id: 40 })).send({ token: 'abc234' });
    assert.strictEqual(res.status, 200);
    const consume = calls.find(c => /UPDATE gate_tokens SET is_used = TRUE/.test(c.sql));
    assert.match(consume.sql, /is_used = FALSE AND expires_at > NOW\(\)/);
    assert.strictEqual(consume.params[0], 'ABC234');
    assert.ok(!calls.some(c => /SELECT id FROM gate_tokens/.test(c.sql)), 'no separate read-then-write');
});

test('a token already used by someone else is rejected', async () => {
    onQuery(/SELECT id FROM lecturers WHERE user_id = \?/, [[{ id: 3 }]]);
    onQuery(/UPDATE gate_tokens SET is_used = TRUE/, [{ affectedRows: 0 }]);
    const res = await request(app).post('/api/attendance/lecturer-checkin')
        .set('Authorization', tokenFor('LECTURER', { id: 41 })).send({ token: 'ABC234' });
    assert.strictEqual(res.status, 400);
    assert.ok(!calls.some(c => /INSERT INTO lecturer_attendance/.test(c.sql)));
});

test('a lecturer without a profile does not burn the token', async () => {
    const res = await request(app).post('/api/attendance/lecturer-checkin')
        .set('Authorization', tokenFor('LECTURER', { id: 42 })).send({ token: 'ABC234' });
    assert.strictEqual(res.status, 404);
    assert.ok(!calls.some(c => /UPDATE gate_tokens/.test(c.sql)));
});

test('generated gate tokens are 6 unambiguous characters', async () => {
    onQuery(/INSERT INTO gate_tokens/, (sql, params) => [{ affectedRows: 1, insertId: 1, token: params[0] }]);
    const res = await request(app).get('/api/attendance/gate-token').set('Authorization', tokenFor('GATEKEEPER'));
    assert.strictEqual(res.status, 200);
    assert.match(res.body.token, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
});

test('repeated failed logins from one address are throttled', async () => {
    let last;
    for (let i = 0; i < 11; i++) {
        last = await request(app).post('/api/users/login').send({ email: 'nobody@school.test', password: 'wrong-password' });
    }
    assert.strictEqual(last.status, 429);
});

test('oversized CSV uploads are rejected with 400, not buffered', async () => {
    const big = Buffer.alloc(3 * 1024 * 1024, 'a');
    const res = await request(app).post('/api/students/bulk-upload').set('Authorization', tokenFor('ADMIN'))
        .attach('file', big, { filename: 'students.csv', contentType: 'text/csv' });
    assert.strictEqual(res.status, 400);
});

test('database errors do not leak SQL details to clients', async () => {
    const auth = tokenFor('ADMIN');
    onQuery(/FROM users u\s+JOIN roles r/, () => { const e = new Error('boom'); e.code = 'ER_PARSE_ERROR'; e.sqlMessage = 'secret table detail'; throw e; });
    const res = await request(app).get('/api/rooms').set('Authorization', auth);
    assert.strictEqual(res.status, 500);
    assert.ok(!JSON.stringify(res.body).includes('secret table detail'));
});

test('email content is HTML-escaped', () => {
    assert.strictEqual(escapeHtml('<b>"Tom" & \'Jerry\'</b>'), '&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;');
});
