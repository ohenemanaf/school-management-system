// The role policy, one rule per test. See src/config/permissions.json.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { app, onQuery, tokenFor, reset, calls, teaches } = require('./helpers');

beforeEach(reset);

const as = (role, opts) => {
    const auth = tokenFor(role, opts);
    return {
        get: (url) => request(app).get(url).set('Authorization', auth),
        post: (url, body) => request(app).post(url).set('Authorization', auth).send(body),
    };
};

const FULL_STUDENT = {
    id: 1, user_id: 10, first_name: 'Ama', last_name: 'Mensah', enrollment_number: 'S-1', gender: 'Female',
    student_group_id: 4, student_group_name: 'Form 1A', email: 'ama@school.test', is_active: 1,
    date_of_birth: '2010-01-01', address: '12 Ring Road', guardian_name: 'Kofi', guardian_phone: '0240000000',
    medical_conditions: 'Asthma', blood_group: 'O+', profile_image_url: null,
};
const studentsReturn = () => onQuery(/FROM students s/, [[FULL_STUDENT]]);

// --- Finance -----------------------------------------------------------------

test('admin can see who has paid but cannot change finance records', async () => {
    const admin = as('ADMIN');
    assert.strictEqual((await admin.get('/api/finance/defaulters')).status, 200);
    assert.strictEqual((await admin.get('/api/finance/invoices')).status, 200);
    assert.strictEqual((await admin.post('/api/finance/payments', { invoiceId: 1, amountPaid: 10 })).status, 403);
    assert.strictEqual((await admin.post('/api/finance/invoices', { studentId: 1, feeTypeId: 1, amountDue: 10, dueDate: '2026-12-01' })).status, 403);
    assert.strictEqual((await admin.post('/api/finance/fee-types', { name: 'X', amount: 1 })).status, 403);
});

test('the accountant records payments', async () => {
    onQuery(/SELECT id FROM invoices WHERE id = \? FOR UPDATE/, [[{ id: 1 }]]);
    onQuery(/SELECT amount_due FROM invoices/, [[{ amount_due: 100 }]]);
    onQuery(/SUM\(amount_paid\) as total_paid/, [[{ total_paid: 10 }]]);
    assert.strictEqual((await as('ACCOUNTANT').post('/api/finance/payments', { invoiceId: 1, amountPaid: 10 })).status, 201);
});

test('a payment without a method defaults to Cash; unknown methods are refused', async () => {
    onQuery(/SELECT id FROM invoices WHERE id = \? FOR UPDATE/, [[{ id: 1 }]]);
    onQuery(/SELECT amount_due FROM invoices/, [[{ amount_due: 100 }]]);
    onQuery(/SUM\(amount_paid\) as total_paid/, [[{ total_paid: 10 }]]);
    const accountant = as('ACCOUNTANT');
    assert.strictEqual((await accountant.post('/api/finance/payments', { invoiceId: 1, amountPaid: 10, paymentMethod: 'Gold' })).status, 400);
    assert.strictEqual((await accountant.post('/api/finance/payments', { invoiceId: 1, amountPaid: 10 })).status, 201);
    const insert = calls.filter(c => /INSERT INTO payments/.test(c.sql)).pop();
    assert.strictEqual(insert.params[2], 'Cash');
});

test('the headmaster sees finance totals only, not individual records', async () => {
    const head = as('HEADMASTER');
    onQuery(/total_collected/, [[{ total_collected: 0, total_due: 0, partially_paid: 0, total_invoices: 0, total_payments: 0 }]]);
    assert.strictEqual((await head.get('/api/finance/stats')).status, 200);
    assert.strictEqual((await head.get('/api/finance/defaulters')).status, 403);
    assert.strictEqual((await head.get('/api/finance/invoices')).status, 403);
});

// --- Grades ------------------------------------------------------------------

test('super admin, admin and headmaster cannot read named grades', async () => {
    for (const role of ['SUPER_ADMIN', 'ADMIN', 'HEADMASTER']) {
        assert.strictEqual((await as(role).get('/api/grades')).status, 403, role);
    }
});

test('only lecturers enter grades', async () => {
    for (const role of ['SUPER_ADMIN', 'ADMIN', 'HEADMASTER']) {
        const res = await as(role).post('/api/grades', { studentId: 1, studentGroupId: 4, assessmentName: 'Quiz', score: 5, maxScore: 10 });
        assert.strictEqual(res.status, 403, role);
    }
});

test("a lecturer cannot grade a class they don't teach", async () => {
    teaches(4);
    const res = await as('LECTURER').post('/api/grades', { studentId: 1, studentGroupId: 9, assessmentName: 'Quiz', score: 5, maxScore: 10, courseId: 1, component: 'CLASS' });
    assert.strictEqual(res.status, 403);
});

test('leaders get grade analytics without names, and small groups are hidden', async () => {
    onQuery(/COUNT\(DISTINCT g\.assessment_name\)/, [[{ grades: 9, students: 4, assessments: 2, average: 61.25, pass_rate: 75 }]]);
    onQuery(/GROUP BY sg\.id, sg\.name/, [[
        { student_group_id: 4, student_group_name: 'Form 1A', students: 3, grades: 6, average: 70, pass_rate: 100 },
        { student_group_id: 5, student_group_name: 'Form 1B', students: 1, grades: 3, average: 33, pass_rate: 0 },
    ]]);
    onQuery(/GROUP BY g\.assessment_name/, [[{ assessment_name: 'Quiz', students: 4, average: 61.25, pass_rate: 75 }]]);
    onQuery(/AS b0/, [[{ b0: 1, b40: 2, b50: 2, b60: 2, b70: 1, b80: 1 }]]);
    const res = await as('ADMIN').get('/api/grades/analytics');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.overall.average, 61.3);
    const [shown, hidden] = res.body.byGroup;
    assert.strictEqual(shown.average, 70);
    assert.strictEqual(hidden.suppressed, true);
    assert.strictEqual(hidden.average, null, 'one student: the average would reveal their mark');
    assert.ok(!JSON.stringify(res.body).includes('first_name'));
});

test('lecturers and students do not get school-wide analytics', async () => {
    for (const role of ['LECTURER', 'STUDENT', 'ACCOUNTANT']) {
        assert.strictEqual((await as(role).get('/api/grades/analytics')).status, 403, role);
    }
});

// --- Student records ---------------------------------------------------------

test('medical details reach admin and super admin only', async () => {
    for (const [role, sees] of [['SUPER_ADMIN', true], ['ADMIN', true], ['HEADMASTER', false], ['ACCOUNTANT', false], ['LIBRARIAN', false]]) {
        reset();
        studentsReturn();
        const [student] = (await as(role).get('/api/students')).body;
        assert.strictEqual('medical_conditions' in student, sees, role);
        assert.strictEqual('blood_group' in student, sees, role);
    }
});

test('lecturers see basic details of their own classes only', async () => {
    teaches(4);
    studentsReturn();
    const res = await as('LECTURER').get('/api/students');
    const [student] = res.body;
    assert.strictEqual(student.first_name, 'Ama');
    for (const hidden of ['medical_conditions', 'address', 'date_of_birth', 'guardian_phone']) {
        assert.ok(!(hidden in student), hidden);
    }
    const query = calls.find(c => /FROM students s/.test(c.sql));
    assert.match(query.sql, /s\.student_group_id IN \(\?\)/);
    assert.strictEqual((await as('LECTURER').get('/api/students?student_group_id=9')).status, 403);
});

test("a lecturer who teaches no classes sees no students", async () => {
    teaches();
    await as('LECTURER').get('/api/students');
    assert.match(calls.find(c => /FROM students s/.test(c.sql)).sql, /1 = 0/);
});

test('the accountant gets guardian contact for fee follow-up, not home or health details', async () => {
    studentsReturn();
    const [student] = (await as('ACCOUNTANT').get('/api/students')).body;
    assert.strictEqual(student.guardian_phone, '0240000000');
    assert.ok(!('address' in student) && !('medical_conditions' in student));
});

test('the librarian can look up borrowers (names and index numbers only)', async () => {
    studentsReturn();
    const res = await as('LIBRARIAN').get('/api/students');
    assert.strictEqual(res.status, 200);
    assert.ok(!('guardian_phone' in res.body[0]));
});

test('students see their own medical details on their profile', async () => {
    onQuery(/FROM students WHERE user_id = \?/, [[{ id: 1, student_group_id: 4, medical_conditions: 'Asthma', blood_group: 'O+' }]]);
    const res = await as('STUDENT').get('/api/users/profile');
    assert.strictEqual(res.body.user.medicalConditions, 'Asthma');
});

test('only admins change student records', async () => {
    for (const role of ['HEADMASTER', 'LECTURER', 'ACCOUNTANT', 'LIBRARIAN']) {
        assert.strictEqual((await as(role).post('/api/students', { email: 'x@y.z', firstName: 'A', lastName: 'B' })).status, 403, role);
    }
});

// --- Accounts ----------------------------------------------------------------

test('only the super admin sees and manages system accounts', async () => {
    assert.strictEqual((await as('ADMIN').get('/api/users')).status, 403);
    assert.strictEqual((await as('HEADMASTER').get('/api/users')).status, 403);
    assert.strictEqual((await as('SUPER_ADMIN').get('/api/users')).status, 200);
});

// --- Classes, attendance, materials ------------------------------------------

test('lecturers only take attendance for their own classes', async () => {
    teaches(4);
    const res = await as('LECTURER').post('/api/attendance/bulk', { studentGroupId: 9, date: '2026-11-10', records: [{ studentId: 1, status: 'Present' }] });
    assert.strictEqual(res.status, 403);
});

test("lecturers only see their own classes' attendance", async () => {
    teaches(4, 5);
    await as('LECTURER').get('/api/attendance');
    const query = calls.find(c => /FROM attendance a/.test(c.sql));
    assert.match(query.sql, /a\.student_group_id IN \(\?, \?\)/);
});

test('the class list for a lecturer contains only the classes they teach', async () => {
    teaches(4);
    onQuery(/FROM student_groups sg/, [[{ id: 4, name: 'Form 1A' }, { id: 5, name: 'Form 1B' }]]);
    const res = await as('LECTURER').get('/api/student-groups');
    assert.deepStrictEqual(res.body.map(g => g.id), [4]);
});

test("a student's timetable is always their own class", async () => {
    onQuery(/SELECT student_group_id FROM students WHERE user_id = \?/, [[{ student_group_id: 4 }]]);
    await as('STUDENT').get('/api/timetable?student_group_id=9');
    const query = calls.find(c => /FROM timetable_sessions t/.test(c.sql));
    assert.deepStrictEqual(query.params, [4]);
});

test('only lecturers share learning materials', async () => {
    for (const role of ['SUPER_ADMIN', 'ADMIN', 'LIBRARIAN']) {
        const res = await as(role).post('/api/materials', { studentGroupId: 1, lecturerId: 1, title: 'T', fileUrl: 'https://x.test/a.pdf' });
        assert.strictEqual(res.status, 403, role);
    }
});

test('the headmaster views staff attendance but cannot record it', async () => {
    const head = as('HEADMASTER');
    assert.strictEqual((await head.get('/api/lecturer-attendance')).status, 200);
    assert.strictEqual((await head.post('/api/lecturer-attendance', { lecturerId: 1, date: '2026-11-10', status: 'Present' })).status, 403);
});

test('the gate code is for the gatekeeper (and super admin), not admin', async () => {
    assert.strictEqual((await as('ADMIN').get('/api/attendance/gate-token')).status, 403);
    onQuery(/SELECT token FROM gate_tokens/, [[{ token: 'ABC234' }]]);
    assert.strictEqual((await as('GATEKEEPER').get('/api/attendance/gate-token')).status, 200);
});

// --- Library and announcements -----------------------------------------------

test('admin can browse the library but only the librarian runs it', async () => {
    assert.strictEqual((await as('ADMIN').get('/api/library/books')).status, 200);
    assert.strictEqual((await as('ADMIN').post('/api/library/loans/issue', { bookId: 1, userId: 2, dueDate: '2026-12-01' })).status, 403);
});

test('the accountant can only send announcements to students', async () => {
    const accountant = as('ACCOUNTANT');
    assert.strictEqual((await accountant.post('/api/notifications/broadcast', { title: 'T', message: 'M', audience: 'ALL' })).status, 403);
    onQuery(/SELECT id FROM roles WHERE name = \?/, [[{ id: 7 }]]);
    assert.strictEqual((await accountant.post('/api/notifications/broadcast', { title: 'Fees', message: 'Due Friday', audience: 'STUDENT' })).status, 201);
});

// --- One policy for both sides -----------------------------------------------

test('the frontend uses exactly the same permission list as the backend', () => {
    const backend = require('../src/config/permissions.json');
    const frontendPath = path.join(__dirname, '../../frontend/src/config/permissions.json');
    const frontend = JSON.parse(fs.readFileSync(frontendPath, 'utf8'));
    assert.deepStrictEqual(frontend, backend);
});
