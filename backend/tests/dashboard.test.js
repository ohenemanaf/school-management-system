const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, tokenFor, reset, onQuery } = require('./helpers');
const { SECTIONS, LAYOUTS } = require('../src/modules/dashboard/dashboard.controller');
const { can } = require('../src/config/permissions');

beforeEach(reset);

test('no dashboard shows a section its role is not allowed to see', () => {
    for (const [role, layout] of Object.entries(LAYOUTS)) {
        for (const section of layout) {
            assert.ok(SECTIONS[section], `${role}: unknown section ${section}`);
            assert.ok(can(role, SECTIONS[section]), `${role} would see ${section} without ${SECTIONS[section]}`);
        }
    }
});

test('every role has a dashboard layout', () => {
    const roles = ['SUPER_ADMIN', 'ADMIN', 'HEADMASTER', 'ACCOUNTANT', 'LIBRARIAN', 'LECTURER', 'STUDENT', 'GATEKEEPER'];
    assert.deepStrictEqual(Object.keys(LAYOUTS).sort(), roles.sort());
});

test('each role receives only its own sections', async () => {
    const expected = {
        SUPER_ADMIN: ['overview', 'accounts', 'academic', 'financeTotals'],
        ADMIN: ['today', 'overview', 'staff', 'financeTotals'],
        HEADMASTER: ['overview', 'academic', 'staff', 'financeTotals'],
        ACCOUNTANT: ['financeTotals', 'financeDesk'],
        LIBRARIAN: ['library'],
        GATEKEEPER: ['gate'],
        STUDENT: [],
    };
    for (const [role, sections] of Object.entries(expected)) {
        reset();
        // Blank rows for every dashboard query (the login lookup is left to the helper).
        onQuery(/^(?![\s\S]*JOIN roles r ON u\.role_id = r\.id\s+WHERE u\.id)\s*SELECT/i, [[{}]]);
        const res = await request(app).get('/api/dashboard').set('Authorization', tokenFor(role));
        assert.strictEqual(res.status, 200, role);
        assert.deepStrictEqual(res.body.layout, sections, role);
    }
});

test('only the super admin dashboard includes system accounts', () => {
    for (const [role, layout] of Object.entries(LAYOUTS)) {
        assert.strictEqual(layout.includes('accounts'), role === 'SUPER_ADMIN', role);
    }
});

test('the dashboard needs a signed-in user', async () => {
    assert.strictEqual((await request(app).get('/api/dashboard')).status, 401);
});
