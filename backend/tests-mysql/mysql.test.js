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
    ids.term = (await admin.query("INSERT INTO terms (name, start_date, end_date, is_current) VALUES ('Semester 1', '2026-01-05', '2026-12-31', 1)"))[0].insertId;
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
const admin_db = async (sql, params) => { await admin.query(`USE ${FRESH}`); return admin.query(sql, params); };
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
    ok(await as('lecturer').post('/api/grades', { studentId: ids.student, studentGroupId: ids.group, assessmentName: 'Quiz', score: 8, maxScore: 10, courseId: ids.course, component: 'CLASS' }), 201);
    assert.strictEqual((await as('lecturer').post('/api/grades', { studentId: ids.student, studentGroupId: ids.otherGroup, assessmentName: 'Quiz', score: 8, maxScore: 10, courseId: ids.course, component: 'CLASS' })).status, 403);
    const analytics = await as('admin').get('/api/grades/analytics');
    ok(analytics);
    assert.strictEqual(analytics.body.overall.grades, 1);
    assert.strictEqual(analytics.body.byGroup[0].suppressed, true, 'one graded student is not broken down');
    assert.strictEqual((await as('admin').get('/api/grades')).status, 403);
    const res = await as('lecturer').get(`/api/grades?student_group_id=${ids.group}&limit=5`);
    ok(res);
    assert.strictEqual(res.body.length, 1);
});

test('semester results: hidden until released, then a full statement', { skip }, async () => {
    // The quiz from the grades test is class work; add the exam.
    ok(await as('lecturer').post('/api/grades', { studentId: ids.student, studentGroupId: ids.group, assessmentName: 'Final exam', score: 72, maxScore: 100, courseId: ids.course, component: 'EXAM' }), 201);
    const terms = await as('student').get('/api/results/terms');
    ok(terms);
    assert.strictEqual(terms.body.find((t) => t.id === ids.term).graded, 2);
    const hidden = await as('student').get(`/api/results/statement?term_id=${ids.term}`);
    assert.strictEqual(hidden.status, 403);
    assert.strictEqual(hidden.body.code, 'NOT_RELEASED');

    ok(await as('admin').post(`/api/terms/${ids.term}/results`, { released: true }));
    const statement = await as('student').get(`/api/results/statement?term_id=${ids.term}`);
    ok(statement);
    const [row] = statement.body.rows;
    // Class work 8/10 = 80% -> 24 of 30; exam 72% -> 50.4 of 70; total 74.4 -> B
    assert.deepStrictEqual([row.caMark, row.examMark, row.total, row.grade], [24, 50.4, 74.4, 'B']);
    assert.strictEqual(statement.body.summary.gpa, 3);
    assert.strictEqual(statement.body.summary.cumulative.cgpa, 3);
    assert.strictEqual(statement.body.student.indexNumber, 'S-1');
    assert.strictEqual(statement.body.scale.length, 8);
    assert.strictEqual((await as('admin').get(`/api/results/statement?term_id=${ids.term}`)).status, 403, 'admins never see named results');
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

test('every role dashboard loads from real data', { skip }, async () => {
    for (const who of ['admin', 'schooladmin', 'accountant', 'librarian', 'lecturer', 'student', 'gate']) {
        const res = await as(who).get('/api/dashboard');
        ok(res);
        assert.ok(Array.isArray(res.body.layout), who);
    }
    const lecturer = await as('lecturer').get('/api/dashboard');
    assert.strictEqual(lecturer.body.sections.teaching.classes, 1);
    assert.strictEqual(lecturer.body.sections.teaching.students, 3);
    const accountant = await as('accountant').get('/api/dashboard');
    assert.ok(accountant.body.sections.financeTotals.billed >= 500);
    assert.ok(Array.isArray(accountant.body.sections.financeDesk.recentPayments));
});

test('timetable generator: set up a term, generate, publish, remind', { skip }, async () => {
    const admin = as('admin');
    const { verifyTimetable } = require('../src/modules/scheduler/engine');
    // A second teacher and two more subjects.
    const hash = await bcrypt.hash(PASSWORD, 10);
    const [lecRole] = await admin_db('SELECT id FROM roles WHERE name = ?', ['LECTURER']);
    const [u2] = await admin_db('INSERT INTO users (role_id, email, password_hash) VALUES (?, ?, ?)', [lecRole[0].id, 'english@it.test', hash]);
    const [l2] = await admin_db("INSERT INTO lecturers (user_id, first_name, last_name, department) VALUES (?, 'Yaw', 'Mensah', 'Languages')", [u2.insertId]);
    const [sci] = await admin_db("INSERT INTO courses (name, code) VALUES ('Science', 'SC1')");
    const [eng] = await admin_db("INSERT INTO courses (name, code) VALUES ('English', 'EN1')");

    ok(await admin.put('/api/scheduler/bell', { periods: [
        { label: 'P1', start_time: '08:00', end_time: '08:45', kind: 'LESSON' },
        { label: 'P2', start_time: '08:45', end_time: '09:30', kind: 'LESSON' },
        { label: 'Break', start_time: '09:30', end_time: '10:00', kind: 'BREAK' },
        { label: 'P3', start_time: '10:00', end_time: '10:45', kind: 'LESSON' },
        { label: 'P4', start_time: '10:45', end_time: '11:30', kind: 'LESSON' },
        { label: 'P5', start_time: '12:15', end_time: '13:00', kind: 'LESSON' },
        { label: 'P6', start_time: '13:00', end_time: '13:45', kind: 'LESSON' },
    ] }));
    const term = await admin.post('/api/terms', { name: 'Term 1', start_date: '2026-09-07', end_date: '2026-12-18', is_current: true });
    ok(term, 201);
    const termId = term.body.id;
    ok(await admin.post(`/api/terms/${termId}/exams`, { name: 'Mid-term exams', start_date: '2026-11-17', end_date: '2026-11-19', alert_days: '7,1', audience: 'ALL' }), 201);

    const gold = await admin.post('/api/scheduler/streams', { name: 'Gold' });
    const diamond = await admin.post('/api/scheduler/streams', { name: 'Diamond' });
    ok(await admin.put(`/api/scheduler/classes/${ids.group}/stream`, { stream_id: gold.body.id }));
    ok(await admin.put(`/api/scheduler/classes/${ids.otherGroup}/stream`, { stream_id: diamond.body.id }));
    ok(await admin.put(`/api/scheduler/subjects/${ids.course}`, { is_heavy: true }));
    ok(await admin.put(`/api/scheduler/teachers/${ids.lecturer}`, { maxPerWeek: 20, maxPerDay: 5, subjects: [{ courseId: ids.course, proficiency: 3 }, { courseId: sci.insertId, proficiency: 2 }] }));
    ok(await admin.put(`/api/scheduler/teachers/${l2.insertId}`, { maxPerWeek: 20, maxPerDay: 5, subjects: [{ courseId: eng.insertId, proficiency: 3 }] }));
    ok(await admin.put(`/api/scheduler/allocations/${ids.group}`, { termId, items: [
        { courseId: ids.course, periodsPerWeek: 4 }, { courseId: sci.insertId, periodsPerWeek: 3 }, { courseId: eng.insertId, periodsPerWeek: 3 },
    ] }));
    ok(await admin.post('/api/scheduler/allocations/copy', { termId, fromGroupId: ids.group, toGroupIds: [ids.otherGroup] }));

    const setup = await admin.get(`/api/scheduler/setup?term_id=${termId}`);
    ok(setup);
    assert.strictEqual(setup.body.allocations.length, 6);
    assert.strictEqual(setup.body.bell.length, 7);

    const run = await admin.post('/api/scheduler/generate', { termId, seed: 5 });
    ok(run, 201);
    assert.strictEqual(run.body.status, 'DRAFT');
    assert.strictEqual(run.body.required, 20);
    assert.strictEqual(run.body.placed, 20);
    assert.deepStrictEqual(run.body.report.unplaced, []);
    const lessons = run.body.lessons.map((l) => ({ classId: l.student_group_id, teacherId: l.lecturer_id, roomId: l.room_id, day: l.day_of_week, period: l.period_no }));
    assert.deepStrictEqual(verifyTimetable(lessons), []);
    assert.ok(run.body.lessons.every((l) => l.start_time && l.lecturer_name));

    const published = await admin.post(`/api/scheduler/runs/${run.body.id}/publish`);
    ok(published);
    assert.strictEqual(published.body.published, 20);
    assert.strictEqual((await admin.post(`/api/scheduler/runs/${run.body.id}/publish`)).status, 409, 'cannot publish twice');
    const [[live]] = await admin_db('SELECT COUNT(*) AS n FROM timetable_sessions WHERE student_group_id IN (?, ?)', [ids.group, ids.otherGroup]);
    assert.strictEqual(live.n, 20);
    const studentView = await as('student').get('/api/timetable');
    assert.strictEqual(studentView.body.length, 10, 'a student sees their own class timetable');

    // Reminders for Tuesday 10 November 2026: preview, send, never twice.
    const preview = await admin.post('/api/reminders/run', { date: '2026-11-10', preview: true });
    ok(preview);
    assert.strictEqual(preview.body.timetable.preview, true);
    const sent = await admin.post('/api/reminders/run', { date: '2026-11-10' });
    ok(sent);
    assert.ok(sent.body.timetable.notified > 0, JSON.stringify(sent.body));
    assert.strictEqual(sent.body.exams.sent.length, 1, 'the 7-day exam alert');
    const again = await admin.post('/api/reminders/run', { date: '2026-11-10' });
    assert.strictEqual(again.body.timetable.skipped, 'already sent today');
    assert.deepStrictEqual(again.body.exams.sent, []);
    const weekend = await admin.post('/api/reminders/run', { date: '2026-11-14', preview: true });
    assert.strictEqual(weekend.body.timetable.skipped, 'weekend');

    const inbox = await as('student').get('/api/notifications');
    assert.ok(inbox.body.some((n) => n.title.startsWith("Today's timetable")));
    assert.ok(inbox.body.some((n) => n.title.startsWith('Exams start in 7 days')));
    const current = await as('student').get('/api/terms/current');
    assert.strictEqual(current.body.exams.length, 1);
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
