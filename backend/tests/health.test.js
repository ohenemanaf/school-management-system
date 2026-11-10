const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app } = require('./helpers');

test('health endpoint responds without a database', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
});

test('unknown API routes return JSON 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    assert.strictEqual(res.status, 404);
});
