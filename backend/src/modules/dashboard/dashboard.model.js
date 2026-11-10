const db = require('../../config/db');
const GradesModel = require('../grades/grades.model');
const FinanceModel = require('../finance/finance.model');
const LibraryModel = require('../library/library.model');

// Each function returns one dashboard section. Numbers come back from MySQL as
// strings for DECIMAL/AVG, so everything is normalised with num().
const num = (value) => (value === null || value === undefined ? null : Math.round(Number(value) * 10) / 10);
const lecturerName = "NULLIF(CONCAT_WS(' ', l.first_name, l.last_name), '')";

/** Today's timetable (optionally one lecturer's), with whether attendance has been taken. */
async function sessionsToday(lecturerId = null) {
    const [rows] = await db.execute(`
        SELECT ts.id, TIME_FORMAT(ts.start_time, '%H:%i') AS start_time, TIME_FORMAT(ts.end_time, '%H:%i') AS end_time,
               c.name AS course_name, sg.id AS student_group_id, sg.name AS student_group_name, r.name AS room_name,
               ${lecturerName} AS lecturer_name, u.email AS lecturer_email,
               EXISTS (SELECT 1 FROM attendance a WHERE a.student_group_id = ts.student_group_id AND a.date = CURDATE()) AS attendance_taken
        FROM timetable_sessions ts
        JOIN courses c ON c.id = ts.course_id
        JOIN student_groups sg ON sg.id = ts.student_group_id
        JOIN rooms r ON r.id = ts.room_id
        JOIN lecturers l ON l.id = ts.lecturer_id
        JOIN users u ON u.id = l.user_id
        WHERE ts.day_of_week = DAYNAME(CURDATE()) ${lecturerId ? 'AND ts.lecturer_id = ?' : ''}
        ORDER BY ts.start_time`, lecturerId ? [lecturerId] : []);
    return rows.map((row) => ({ ...row, attendance_taken: Boolean(Number(row.attendance_taken)) }));
}

const DashboardModel = {
    async overview() {
        const [[row]] = await db.execute(`
            SELECT
                (SELECT COUNT(*) FROM students) AS students,
                (SELECT COUNT(*) FROM lecturers l JOIN users u ON u.id = l.user_id WHERE u.is_active = 1) AS lecturers,
                (SELECT COUNT(*) FROM student_groups) AS classes,
                (SELECT AVG(status <> 'Absent') * 100 FROM attendance WHERE date >= CURDATE() - INTERVAL 30 DAY) AS attendance_30d,
                (SELECT AVG(status <> 'Absent') * 100 FROM attendance) AS attendance_all`);
        return {
            students: Number(row.students), lecturers: Number(row.lecturers), classes: Number(row.classes),
            attendance30d: num(row.attendance_30d), attendanceAllTime: num(row.attendance_all),
        };
    },

    async accounts() {
        const [rows] = await db.execute(`
            SELECT r.name AS role, COUNT(u.id) AS total,
                   COALESCE(SUM(u.is_active = 0), 0) AS inactive,
                   COALESCE(SUM(u.must_change_password = 1), 0) AS temporary_password
            FROM roles r LEFT JOIN users u ON u.role_id = r.id
            GROUP BY r.id, r.name
            ORDER BY r.id`);
        return rows.map((r) => ({ role: r.role, total: Number(r.total), inactive: Number(r.inactive), temporaryPassword: Number(r.temporary_password) }));
    },

    async today() {
        const [[{ day }]] = await db.execute('SELECT DAYNAME(CURDATE()) AS day');
        const [[{ recent }]] = await db.execute(`
            SELECT COUNT(*) AS recent FROM students s JOIN users u ON u.id = s.user_id
            WHERE u.created_at >= CURDATE() - INTERVAL 30 DAY`);
        const sessions = await sessionsToday();
        return { day, sessions, newStudents30d: Number(recent) };
    },

    async staff() {
        const [[row]] = await db.execute(`
            SELECT
                (SELECT COUNT(*) FROM lecturers l JOIN users u ON u.id = l.user_id WHERE u.is_active = 1) AS lecturers,
                (SELECT COUNT(*) FROM lecturer_attendance WHERE date = CURDATE() AND status = 'Present') AS present_today,
                (SELECT COUNT(*) FROM lecturer_attendance WHERE date = CURDATE() AND status = 'On Leave') AS on_leave_today,
                (SELECT AVG(status = 'Present') * 100 FROM lecturer_attendance WHERE date >= CURDATE() - INTERVAL 30 DAY) AS present_rate_30d`);
        return {
            lecturers: Number(row.lecturers), presentToday: Number(row.present_today),
            onLeaveToday: Number(row.on_leave_today), presentRate30d: num(row.present_rate_30d),
        };
    },

    async academic() {
        const analytics = await GradesModel.analytics();
        const shown = analytics.byGroup.filter((g) => !g.suppressed).sort((a, b) => b.average - a.average);
        const pick = ({ student_group_name, average, pass_rate, students }) => ({ student_group_name, average, pass_rate, students });
        return {
            overall: analytics.overall,
            passMark: analytics.passMark,
            strongest: shown.slice(0, 3).map(pick),
            // Only meaningful once there are more classes than the "strongest" list holds.
            needsAttention: shown.length > 3 ? shown.slice(-3).reverse().map(pick) : [],
        };
    },

    async financeTotals() {
        const [[row]] = await db.execute(`
            SELECT
                (SELECT COALESCE(SUM(amount_due), 0) FROM invoices) AS billed,
                (SELECT COALESCE(SUM(amount_paid), 0) FROM payments) AS collected,
                (SELECT COUNT(*) FROM invoices WHERE status <> 'Paid') AS open_invoices`);
        const billed = Number(row.billed);
        const collected = Number(row.collected);
        return {
            billed, collected,
            outstanding: Math.max(billed - collected, 0),
            collectionRate: billed > 0 ? num((collected / billed) * 100) : null,
            openInvoices: Number(row.open_invoices),
        };
    },

    async financeDesk() {
        const [recentPayments] = await db.execute(`
            SELECT p.id, p.amount_paid, p.payment_method, p.payment_date,
                   s.first_name, s.last_name, s.enrollment_number, f.name AS fee_type_name
            FROM payments p
            JOIN invoices i ON i.id = p.invoice_id
            JOIN students s ON s.id = i.student_id
            JOIN fee_types f ON f.id = i.fee_type_id
            ORDER BY p.payment_date DESC, p.id DESC
            LIMIT 5`);
        const [[overdue]] = await db.execute(`
            SELECT COUNT(*) AS invoices, COALESCE(SUM(i.amount_due - COALESCE(pp.paid, 0)), 0) AS amount
            FROM invoices i
            LEFT JOIN (SELECT invoice_id, SUM(amount_paid) AS paid FROM payments GROUP BY invoice_id) pp ON pp.invoice_id = i.id
            WHERE i.status <> 'Paid' AND i.due_date < CURDATE()`);
        const [[week]] = await db.execute(`
            SELECT COUNT(*) AS payments, COALESCE(SUM(amount_paid), 0) AS amount
            FROM payments WHERE payment_date >= CURDATE() - INTERVAL 7 DAY`);
        const defaulters = (await FinanceModel.getDefaulters()).slice(0, 5);
        return {
            overdue: { invoices: Number(overdue.invoices), amount: Number(overdue.amount) },
            lastSevenDays: { payments: Number(week.payments), amount: Number(week.amount) },
            recentPayments: recentPayments.map((p) => ({ ...p, amount_paid: Number(p.amount_paid) })),
            topDefaulters: defaulters.map((d) => ({ ...d, balance: Number(d.balance) })),
        };
    },

    async library() {
        const stats = await LibraryModel.getStats();
        const borrower = "COALESCE(CONCAT(s.first_name, ' ', s.last_name), u.email)";
        const [overdue] = await db.execute(`
            SELECT l.id, b.title, l.due_date, DATEDIFF(CURDATE(), l.due_date) AS days_overdue, ${borrower} AS borrower
            FROM book_loans l
            JOIN books b ON b.id = l.book_id
            JOIN users u ON u.id = l.user_id
            LEFT JOIN students s ON s.user_id = u.id
            WHERE l.status <> 'Returned' AND l.due_date < CURDATE()
            ORDER BY l.due_date
            LIMIT 5`);
        const [recent] = await db.execute(`
            SELECT l.id, b.title, l.issue_date, l.status, ${borrower} AS borrower
            FROM book_loans l
            JOIN books b ON b.id = l.book_id
            JOIN users u ON u.id = l.user_id
            LEFT JOIN students s ON s.user_id = u.id
            ORDER BY l.created_at DESC, l.id DESC
            LIMIT 5`);
        const [[{ unavailable }]] = await db.execute('SELECT COUNT(*) AS unavailable FROM books WHERE available_copies <= 0');
        return {
            totalBooks: Number(stats.totalBooks), onLoan: Number(stats.borrowedBooks), overdueCount: Number(stats.overdueBooks),
            unavailableTitles: Number(unavailable),
            overdue: overdue.map((o) => ({ ...o, days_overdue: Number(o.days_overdue) })),
            recent,
        };
    },

    async teaching(user) {
        const [[lecturer]] = await db.execute('SELECT id FROM lecturers WHERE user_id = ?', [user.id]);
        if (!lecturer) return { today: [], checkIn: null, classes: 0, students: 0 };
        const [[counts]] = await db.execute(`
            SELECT COUNT(DISTINCT ts.student_group_id) AS classes,
                   (SELECT COUNT(*) FROM students s
                     WHERE s.student_group_id IN (SELECT student_group_id FROM timetable_sessions WHERE lecturer_id = ?)) AS students
            FROM timetable_sessions ts WHERE ts.lecturer_id = ?`, [lecturer.id, lecturer.id]);
        const [checkIn] = await db.execute(`
            SELECT status, TIME_FORMAT(check_in_time, '%H:%i') AS check_in_time
            FROM lecturer_attendance WHERE lecturer_id = ? AND date = CURDATE()`, [lecturer.id]);
        return {
            today: await sessionsToday(lecturer.id),
            checkIn: checkIn[0] || null,
            classes: Number(counts.classes), students: Number(counts.students),
        };
    },

    async gate() {
        const [rows] = await db.execute(`
            SELECT ${lecturerName} AS lecturer_name, u.email, TIME_FORMAT(la.check_in_time, '%H:%i') AS check_in_time, la.status
            FROM lecturer_attendance la
            JOIN lecturers l ON l.id = la.lecturer_id
            JOIN users u ON u.id = l.user_id
            WHERE la.date = CURDATE()
            ORDER BY la.check_in_time`);
        const [[{ lecturers }]] = await db.execute(
            'SELECT COUNT(*) AS lecturers FROM lecturers l JOIN users u ON u.id = l.user_id WHERE u.is_active = 1');
        return { checkedIn: rows, lecturers: Number(lecturers) };
    },
};

module.exports = DashboardModel;
