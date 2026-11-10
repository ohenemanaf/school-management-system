const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, tokenFor, reset, users, onQuery, calls } = require('./helpers');

beforeEach(reset);

test('requests without a token are rejected', async () => {
    assert.strictEqual((await request(app).get('/api/users/profile')).status, 401);
});

test('invalid tokens are rejected with 401 so the client logs out', async () => {
    const res = await request(app).get('/api/users/profile').set('Authorization', 'Bearer not-a-token');
    assert.strictEqual(res.status, 401);
});

test('deactivated accounts lose access immediately', async () => {
    const auth = tokenFor('ADMIN', { id: 5, isActive: false });
    assert.strictEqual((await request(app).get('/api/users').set('Authorization', auth)).status, 401);
});

test('deleted accounts lose access immediately', async () => {
    const auth = tokenFor('ADMIN', { id: 5 });
    users.delete(5);
    assert.strictEqual((await request(app).get('/api/users').set('Authorization', auth)).status, 401);
});

test('role changes apply immediately, not when the token expires', async () => {
    const auth = tokenFor('ADMIN', { id: 5 });
    users.get(5).role = 'STUDENT';
    assert.strictEqual((await request(app).get('/api/users').set('Authorization', auth)).status, 403);
});

test('accounts that must change password are blocked from other routes', async () => {
    const auth = tokenFor('ADMIN', { id: 6, mustChangePassword: true });
    const res = await request(app).get('/api/users').set('Authorization', auth);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'PASSWORD_CHANGE_REQUIRED');
});

test('accounts that must change password can still load their profile', async () => {
    const auth = tokenFor('ADMIN', { id: 6, mustChangePassword: true });
    const res = await request(app).get('/api/users/profile').set('Authorization', auth);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.mustChangePassword, true);
});

test('new passwords shorter than 12 characters are rejected', async () => {
    const res = await request(app).put('/api/users/security/password').set('Authorization', tokenFor('STUDENT'))
        .send({ currentPassword: 'whatever-current', newPassword: 'short' });
    assert.strictEqual(res.status, 400);
});

test('super admins cannot deactivate or demote themselves', async () => {
    const auth = tokenFor('SUPER_ADMIN', { id: 1 });
    assert.strictEqual((await request(app).put('/api/users/1').set('Authorization', auth).send({ is_active: false })).status, 400);
    assert.strictEqual((await request(app).put('/api/users/1').set('Authorization', auth).send({ role: 'STUDENT' })).status, 400);
});

test('unknown roles are rejected instead of silently ignored', async () => {
    const res = await request(app).put('/api/users/2').set('Authorization', tokenFor('SUPER_ADMIN', { id: 1 })).send({ role: 'WIZARD' });
    assert.strictEqual(res.status, 400);
});

test('saving some preferences keeps the others (e.g. tour progress)', async () => {
    onQuery(/SELECT preferences FROM users WHERE id = \?/, [[{ preferences: JSON.stringify({ themeOption: 'dark', workshop: { status: 'completed' } }) }]]);
    const res = await request(app).put('/api/users/preferences').set('Authorization', tokenFor('STUDENT'))
        .send({ themeOption: 'light' });
    assert.strictEqual(res.status, 200);
    const saved = JSON.parse(calls.find((c) => /UPDATE users SET preferences/.test(c.sql)).params[0]);
    assert.deepStrictEqual(saved, { themeOption: 'light', workshop: { status: 'completed' } });
});
