// Integration tests against a real MySQL 8 server. They prove what the fake-DB
// tests cannot: that every query is valid MySQL and returns the right numbers.
//
// Run:  MYSQL_TEST_HOST=127.0.0.1 MYSQL_TEST_PORT=3307 MYSQL_TEST_USER=root MYSQL_TEST_PASSWORD= npm run test:mysql
//
// The suite DROPS and recreates two throwaway databases, sms_it_fresh and
// sms_it_upgrade, on that server. Point it at a disposable server only.

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const host = process.env.MYSQL_TEST_HOST;
const skip = host ? false : 'set MYSQL_TEST_HOST (and port/user/password) to run against MySQL';

const conn = {
    host,
    port: Number(process.env.MYSQL_TEST_PORT || 3306),
    user: process.env.MYSQL_TEST_USER || 'root',
    password: process.env.MYSQL_TEST_PASSWORD || '',
    multipleStatements: true,
};
const FRESH = 'sms_it_fresh';
const UPGRADE = 'sms_it_upgrade';
const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const PASSWORD = 'integration-pass-1';

let admin;      // mysql2 connection with multipleStatements, for setup and assertions
let app;
let request;
const ids = {};
const auth = {};

before(async () => {
    if (skip) return;
    admin = await mysql.createConnection(conn);
    for (const db of [FRESH, UPGRADE]) {
        await admin.query(`DROP DATABASE IF EXISTS ${db}; CREATE DATABASE ${db}`);
    }
    await admin.query(`USE ${FRESH}`);
    await admin.query(read('schema.sql'));

    // Minimal school: one group, two students, a lecturer, a room, a course, fees.
    const hash = await bcrypt.hash(PASSWORD, 10);
    const role = async (name) => (await admin.query('SELECT id FROM roles WHERE name = ?', [name]))[0][0].id;
    const user = async (email, roleName) => (await admin.query(
        'INSERT INTO users (role_id, email, password_hash) VALUES (?, ?, ?)', [await role(roleName), email, hash]))[0].insertId;

    ids.adminUser = await user('admin@it.test', 'SUPER_ADMIN');
    ids.lecturerUser = await user('lecturer@it.test', 'LECTURER');
    ids.studentUser = await user('student@it.test', 'STUDENT');
    await user('gate@it.test', 'GATEKEEPER');
    await user('accountant@it.test', 'ACCOUNTANT');
    await user('schooladmin@it.test', 'ADMIN');
    await user('librarian@it.test', 'LIBRARIAN');
    ids.program = (await admin.query("INSERT INTO programs (name, code) VALUES ('Science', 'SCI')"))[0].insertId;
    ids.group = (await admin.query('INSERT INTO student_groups (name, level, program_id) VALUES (?, ?, ?)', ['Form 1A', '100', ids.program]))[0].insertId;
    ids.otherGroup = (await admin.query("INSERT INTO student_groups (name, level) VALUES ('Form 1B', '100')"))[0].insertId;
    ids.student = (await admin.query(
        "INSERT INTO students (user_id, first_name, last_name, enrollment_number, student_group_id) VALUES (?, 'Ama', 'Mensah', 'S-1', ?)",
        [ids.studentUser, ids.group]))[0].insertId;
    ids.student2 = (await admin.query(
        "INSERT INTO students (user_id, first_name, last_name, enrollment_number, student_group_id) VALUES (?, 'Kofi', 'Owusu', 'S-2', ?)",
        [await user('student2@it.test', 'STUDENT'), ids.group]))[0].insertId;
    ids.lecturer = (await admin.query(
        "INSERT INTO lecturers (user_id, first_name, last_name, department) VALUES (?, 'Esi', 'Boateng', 'Science')", [ids.lecturerUser]))[0].insertId;
    ids.room = (await admin.query("INSERT INTO rooms (name) VALUES ('Room 1')"))[0].insertId;
    ids.course = (await admin.query("INSERT INTO courses (name, code) VALUES ('Maths', 'M1')"))[0].insertId;
    ids.fee = (await admin.query("INSERT INTO fee_types (name, amount) VALUES ('Tuition', 500)"))[0].insertId;
    // The lecturer teaches Form 1A, which is what scopes their classes.
    await admin.query(
        "INSERT INTO timetable_sessions (course_id, student_group_id, lecturer_id, room_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, 'Monday', '08:00', '09:00')",
        [ids.course, ids.group, ids.lecturer, ids.room]);

    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'integration-secret-'.padEnd(48, 'x');
    Object.assign(process.env, {
        DB_HOST: conn.host, DB_PORT: String(conn.port), DB_USER: conn.user,
        DB_PASSWORD: conn.password, DB_NAME: FRESH,
    });
    app = require('../src/app');
    request = require('supertest');

    for (const [key, email] of [['admin', 'admin@it.test'], ['lecturer', 'lecturer@it.test'], ['student', 'student@it.test'], ['gate', 'gate@it.test'], ['accountant', 'accountant@it.test'], ['librarian', 'librarian@it.test'], ['schooladmin', 'schooladmin@it.test']]) {
        const res = await request(app).post('/api/users/login').send({ email, password: PASSWORD });
        assert.strictEqual(res.status, 200, `login ${email}: ${JSON.stringify(res.body)}`);
        auth[key] = `Bearer ${res.body.token}`;
    }
});

after(async () => {
    if (skip) return;
    await require('../src/config/db').end();
    await admin.end();
});

const as = (who) => ({
    get: (url) => request(app).get(url).set('Authorization', auth[who]),
    post: (url, body) => request(app).post(url).set('Authorization', auth[who]).send(body),
    put: (url, body) => request(app).put(url).set('Authorization', auth[who]).send(body),
});
const ok = (res, status = 200) => assert.strictEqual(res.status, status, JSON.stringify(res.body));

test('profiles resolve role-specific ids and names', { skip }, async () => {
    const lecturer = await as('lecturer').get('/api/users/profile');
    ok(lecturer);
    assert.strictEqual(lecturer.body.user.lecturerId, ids.lecturer);
    assert.strictEqual(lecturer.body.user.name, 'Esi Boateng');
    const student = await as('student').get('/api/users/profile');
    assert.strictEqual(student.body.user.studentGroupId, ids.group);
});

test('bulk attendance writes one register and the filtered history reads it back', { skip }, async () => {
    const save = await as('lecturer').post('/api/attendance/bulk', {
        studentGroupId: ids.group, date: '2026-11-10',
        records: [{ studentId: ids.student, status: 'Present' }, { studentId: ids.student2, status: 'Absent' }, { studentId: 999999, status: 'Present' }],
    });
    ok(save);
    assert.strictEqual(save.body.saved, 2);
    assert.deepStrictEqual(save.body.skipped, [999999]);

    // Re-saving updates in place instead of duplicating.
    ok(await as('lecturer').post('/api/attendance/bulk', {
        studentGroupId: ids.group, date: '2026-11-10', records: [{ studentId: ids.student2, status: 'Late' }],
    }));
    const history = await as('admin').get(`/api/attendance?student_group_id=${ids.group}&limit=10`);
    ok(history);
    assert.strictEqual(history.body.length, 2);
    assert.ok(history.body.some(r => r.status === 'Late'));

    const mine = await as('student').get('/api/attendance');
    ok(mine);
    assert.strictEqual(mine.body.length, 1);
});

test('dashboard stats run as one valid query', { skip }, async () => {
    const res = await as('admin').get('/api/stats');
    ok(res);
    assert.strictEqual(res.body.totalStudents, 2);
    assert.strictEqual(res.body.activeLecturers, 1);
    assert.strictEqual(res.body.avgAttendance, '50%');
});

test('finance: payments update status, stats and defaulters add up', { skip }, async () => {
    const invoice = await as('accountant').post('/api/finance/invoices', { studentId: ids.student, feeTypeId: ids.fee, amountDue: 500, dueDate: '2026-12-01' });
    ok(invoice, 201);
    ok(await as('accountant').post('/api/finance/payments', { invoiceId: invoice.body.id, amountPaid: 200, paymentMethod: 'Cash' }), 201);
    assert.strictEqual((await as('accountant').post('/api/finance/payments', { invoiceId: 999999, amountPaid: 5 })).status, 404);
    // Admin can see who has paid but cannot record anything.
    assert.strictEqual((await as('schooladmin').post('/api/finance/payments', { invoiceId: invoice.body.id, amountPaid: 1 })).status, 403);
    ok(await as('schooladmin').get('/api/finance/defaulters'));

    const [[row]] = await admin.query(`SELECT status FROM ${FRESH}.invoices WHERE id = ?`, [invoice.body.id]);
    assert.strictEqual(row.status, 'Partial');

    const stats = await as('admin').get('/api/finance/stats');
    ok(stats);
    assert.strictEqual(stats.body.totalCollected, 200);
    assert.strictEqual(stats.body.pendingDues, 300);

    const defaulters = await as('admin').get('/api/finance/defaulters');
    ok(defaulters);
    assert.strictEqual(defaulters.body.length, 1);
    assert.strictEqual(Number(defaulters.body[0].balance), 300);

    const invoices = await as('student').get('/api/finance/invoices');
    assert.strictEqual(Number(invoices.body[0].amount_paid), 200);
    ok(await as('student').get(`/api/finance/payments/${invoice.body.id}`));
});

test('notifications: role broadcast, global read receipts, read-all', { skip }, async () => {
    ok(await as('admin').post('/api/notifications/broadcast', { title: 'Exams', message: 'Monday', audience: 'STUDENT' }), 201);
    ok(await as('admin').post('/api/notifications/broadcast', { title: 'Holiday', message: 'Friday', audience: 'ALL' }), 201);
    const [[count]] = await admin.query(`SELECT COUNT(*) AS n FROM ${FRESH}.notifications WHERE title = 'Exams'`);
    assert.strictEqual(count.n, 2, 'one row per active student');

    let list = await as('student').get('/api/notifications');
    ok(list);
    assert.strictEqual(list.body.length, 2);
    const holiday = list.body.find(n => n.title === 'Holiday');
    assert.strictEqual(Number(holiday.is_read), 0);

    ok(await as('student').put(`/api/notifications/${holiday.id}/read`));
    list = await as('student').get('/api/notifications');
    assert.strictEqual(Number(list.body.find(n => n.title === 'Holiday').is_read), 1);
    // Another user's view of the same school-wide notification is unaffected.
    const lecturerView = await as('lecturer').get('/api/notifications');
    assert.strictEqual(Number(lecturerView.body.find(n => n.title === 'Holiday').is_read), 0);

    ok(await as('lecturer').put('/api/notifications/read-all'));
    const after = await as('lecturer').get('/api/notifications');
    assert.ok(after.body.every(n => Number(n.is_read) === 1));
});

test('grades: membership check, group filter and cap', { skip }, async () => {
    ok(await as('lecturer').post('/api/grades', { studentId: ids.student, studentGroupId: ids.group, assessmentName: 'Quiz', score: 8, maxScore: 10 }), 201);
    assert.strictEqual((await as('lecturer').post('/api/grades', { studentId: ids.student, studentGroupId: ids.otherGroup, assessmentName: 'Quiz', score: 8, maxScore: 10 })).status, 403);
    const analytics = await as('admin').get('/api/grades/analytics');
    ok(analytics);
    assert.strictEqual(analytics.body.overall.grades, 1);
    assert.strictEqual(analytics.body.byGroup[0].suppressed, true, 'one graded student is not broken down');
    assert.strictEqual((await as('admin').get('/api/grades')).status, 403);
    const res = await as('lecturer').get(`/api/grades?student_group_id=${ids.group}&limit=5`);
    ok(res);
    assert.strictEqual(res.body.length, 1);
});

test('students filter by group; created students get a generated index number', { skip }, async () => {
    const res = await as('lecturer').get(`/api/students?student_group_id=${ids.group}`);
    ok(res);
    assert.strictEqual(res.body.length, 2);

    const created = await as('admin').post('/api/students', { email: 'new@it.test', firstName: 'New', lastName: 'Student', studentGroupId: ids.group });
    ok(created, 201);
    assert.match(created.body.credentials.enrollmentNumber, /^SMS-\d{4}-\d{4,}$/);
    const [[user]] = await admin.query(`SELECT must_change_password FROM ${FRESH}.users WHERE email = 'new@it.test'`);
    assert.strictEqual(user.must_change_password, 1);
});

test('CSV import uses savepoints: a clash undoes only its own row', { skip }, async () => {
    const csv = 'firstName,lastName,email,enrollmentNumber\nA,One,a1@it.test,IMP-1\nB,Two,b2@it.test,S-1\nC,Three,c3@it.test,IMP-3\n';
    const res = await request(app).post('/api/students/bulk-upload').set('Authorization', auth.admin)
        .attach('file', Buffer.from(csv), { filename: 'import.csv', contentType: 'text/csv' });
    ok(res);
    assert.strictEqual(res.body.successful, 2);
    assert.strictEqual(res.body.failed, 1); // S-1 already belongs to Ama
    const [[orphans]] = await admin.query(`SELECT COUNT(*) AS n FROM ${FRESH}.users WHERE email = 'b2@it.test'`);
    assert.strictEqual(orphans.n, 0, 'the failed row left no user behind');
});

test('timetable rows carry lecturer names', { skip }, async () => {
    ok(await as('admin').post('/api/timetable', {
        course_id: ids.course, student_group_id: ids.group, lecturer_id: ids.lecturer, room_id: ids.room,
        day_of_week: 'Tuesday', start_time: '08:00', end_time: '09:00',
    }), 201);
    const res = await as('student').get(`/api/timetable?student_group_id=${ids.group}`);
    ok(res);
    assert.strictEqual(res.body[0].lecturer_name, 'Esi Boateng');
});

test('gate token check-in is single use', { skip }, async () => {
    const token = await as('gate').get('/api/attendance/gate-token');
    ok(token);
    ok(await as('lecturer').post('/api/attendance/lecturer-checkin', { token: token.body.token }));
    assert.strictEqual((await as('lecturer').post('/api/attendance/lecturer-checkin', { token: token.body.token })).status, 400);
    const mine = await as('lecturer').get('/api/lecturer-attendance/me');
    assert.strictEqual(mine.body.length, 1);
});

test('library stats and partial book updates', { skip }, async () => {
    const [book] = await admin.query(`INSERT INTO ${FRESH}.books (title, author, total_copies, available_copies) VALUES ('Atlas', 'X', 3, 3)`);
    assert.strictEqual((await as('schooladmin').put(`/api/library/books/${book.insertId}`, { category: 'Geography' })).status, 403);
    ok(await as('librarian').put(`/api/library/books/${book.insertId}`, { category: 'Geography' }));
    const [[row]] = await admin.query(`SELECT title, category FROM ${FRESH}.books WHERE id = ?`, [book.insertId]);
    assert.deepStrictEqual({ ...row }, { title: 'Atlas', category: 'Geography' });
    const stats = await as('admin').get('/api/library/stats');
    ok(stats);
    assert.strictEqual(stats.body.totalBooks, 1);
});

test('upgrade scripts apply cleanly to a database made from the old schema', { skip }, async () => {
    await admin.query(`USE ${UPGRADE}`);
    await admin.query(read('tests-mysql/fixtures/schema-before-upgrades.sql'));
    for (const file of fs.readdirSync(path.join(root, 'upgrades')).sort()) {
        await admin.query(read(`upgrades/${file}`));
    }
    // The upgraded database must match a fresh install, column for column and index for index.
    const shape = async (db) => {
        const [cols] = await admin.query(
            'SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, COLUMN_NAME', [db]);
        const [idx] = await admin.query(
            'SELECT TABLE_NAME, INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? GROUP BY TABLE_NAME, INDEX_NAME ORDER BY TABLE_NAME, INDEX_NAME', [db]);
        return { cols: cols.map(c => ({ ...c })), idx: idx.map(i => ({ ...i })) };
    };
    const [fresh, upgraded] = [await shape(FRESH), await shape(UPGRADE)];
    assert.deepStrictEqual(upgraded.cols, fresh.cols);
    // Older databases keep MySQL's automatic foreign-key indexes, which a fresh
    // install folds into the new composite ones, so require a superset here.
    const key = (i) => `${i.TABLE_NAME}.${i.INDEX_NAME}(${i.cols})`;
    const have = new Set(upgraded.idx.map(key));
    const missing = fresh.idx.map(key).filter(k => !have.has(k));
    assert.deepStrictEqual(missing, [], 'indexes missing after upgrade');
});
