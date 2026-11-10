const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, onQuery, tokenFor, reset } = require('./helpers');
const { signUploadUrl } = require('../src/utils/signedUploads');

beforeEach(reset);

test('uploaded files cannot be fetched without a signature', async () => {
    const res = await request(app).get('/uploads/profiles/profile-1.png');
    assert.strictEqual(res.status, 403);
});

test('a tampered signature is rejected', async () => {
    const url = signUploadUrl('/uploads/profiles/profile-1.png').replace(/sig=.{4}/, 'sig=AAAA');
    assert.strictEqual((await request(app).get(url)).status, 403);
});

test('a signature for one file does not open another', async () => {
    const signed = signUploadUrl('/uploads/profiles/profile-1.png');
    const other = signed.replace('profile-1.png', 'profile-2.png');
    assert.strictEqual((await request(app).get(other)).status, 403);
});

test('expired links are rejected', async () => {
    const old = signUploadUrl('/uploads/profiles/profile-1.png', Date.now() - 3 * 24 * 3600 * 1000);
    assert.strictEqual((await request(app).get(old)).status, 403);
});

test('a valid signature reaches the file server', async () => {
    const res = await request(app).get(signUploadUrl('/uploads/profiles/does-not-exist.png'));
    assert.strictEqual(res.status, 404); // passed the check; the file simply is not there
});

test('signed links are stable within the hour so browsers can cache images', () => {
    const now = Date.UTC(2026, 10, 10, 9, 5);
    assert.strictEqual(signUploadUrl('/uploads/a.png', now), signUploadUrl('/uploads/a.png', now + 20 * 60 * 1000));
});

test('external links are left untouched', () => {
    assert.strictEqual(signUploadUrl('https://example.test/notes.pdf'), 'https://example.test/notes.pdf');
    assert.strictEqual(signUploadUrl(null), null);
});

test('student lists return signed photo links', async () => {
    onQuery(/FROM students s/, [[{ id: 1, profile_image_url: '/uploads/profiles/p.png' }]]);
    const res = await request(app).get('/api/students').set('Authorization', tokenFor('ADMIN'));
    assert.match(res.body[0].profile_image_url, /^\/uploads\/profiles\/p\.png\?exp=\d+&sig=[\w-]+$/);
});

test('library books return signed PDF links', async () => {
    onQuery(/SELECT \* FROM books/, [[{ id: 1, pdf_url: '/uploads/library/b.pdf' }]]);
    const res = await request(app).get('/api/library/books').set('Authorization', tokenFor('STUDENT'));
    assert.match(res.body[0].pdf_url, /\?exp=\d+&sig=/);
});
