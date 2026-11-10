// Test harness: replaces the MySQL pool with a scriptable fake so route-level
// behaviour (auth, roles, validation) can be tested without a database.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-'.padEnd(48, 'x');

const jwt = require('jsonwebtoken');

const handlers = [];
const calls = [];
const users = new Map();

function respond(sql, params) {
    calls.push({ sql, params });
    for (const { pattern, reply } of handlers) {
        if (pattern.test(sql)) return typeof reply === 'function' ? reply(sql, params) : reply;
    }
    if (/FROM users u\s+JOIN roles r ON u\.role_id = r\.id\s+WHERE u\.id = \?/i.test(sql)) {
        const user = users.get(Number(params[0]));
        return [user ? [user] : []];
    }
    if (/^\s*(INSERT|UPDATE|DELETE)/i.test(sql)) return [{ affectedRows: 1, insertId: 1 }];
    return [[]];
}

const connection = {
    execute: async (sql, params = []) => respond(sql, params),
    query: async (sql, params = []) => respond(sql, params),
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
};

const fakePool = {
    execute: connection.execute,
    query: connection.query,
    getConnection: async () => connection,
    end: async () => {},
};

const dbPath = require.resolve('../src/config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakePool };

/** Reply to any SQL matching `pattern` with `reply` (a value or (sql, params) => value). */
function onQuery(pattern, reply) {
    handlers.unshift({ pattern, reply });
}

/** Register an account and return a bearer token for it. */
function tokenFor(role, { id = 100, isActive = true, mustChangePassword = false, email } = {}) {
    const user = {
        id,
        email: email || `${role.toLowerCase()}${id}@school.test`,
        role,
        is_active: isActive ? 1 : 0,
        must_change_password: mustChangePassword ? 1 : 0,
    };
    users.set(id, user);
    return `Bearer ${jwt.sign({ id, role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
}

function reset() {
    handlers.length = 0;
    calls.length = 0;
    users.clear();
}

const app = require('../src/app');

module.exports = { app, onQuery, tokenFor, reset, calls, users };
