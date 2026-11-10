import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    IconSchool, IconUsers, IconUsersGroup, IconChartBar, IconCash, IconAlertTriangle, IconReceipt,
    IconBooks, IconBook2, IconTrophy, IconUserPlus,
} from '@tabler/icons-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/permissions';
import { formatCurrency, formatPercent, formatDate } from '../../utils/format';
import { greeting, Tile, TileRow, Card, CardLink, Empty, AttendanceChip, List, ListRow, Meter } from './DashboardParts';

// Home screen for super admin, admin, headmaster, accountant and librarian.
// The API decides which sections each role gets (see dashboard.controller.js);
// this file only knows how to draw each section.

const SUBTITLES = {
    SUPER_ADMIN: 'Whole-school overview and system accounts.',
    ADMIN: "Today's classes and how the school is running.",
    HEADMASTER: 'How the school is doing. Everything here is view only.',
    ACCOUNTANT: 'Fees and payments at a glance.',
    LIBRARIAN: 'The library at a glance.',
};

const ROLE_LABELS = {
    SUPER_ADMIN: 'Super admins', ADMIN: 'Admins', HEADMASTER: 'Headmasters', ACCOUNTANT: 'Accountants',
    LIBRARIAN: 'Librarians', LECTURER: 'Lecturers', STUDENT: 'Students', GATEKEEPER: 'Gatekeepers',
};

const QUICK_LINKS = [
    { label: 'Add or edit students', path: '/admin/students', perm: 'students.manage' },
    { label: 'Build the timetable', path: '/admin/timetable', perm: 'timetable.manage' },
    { label: 'Manage system accounts', path: '/admin/users', perm: 'users.manage' },
    { label: 'Record a payment', path: '/admin/finance', perm: 'finance.manage' },
    { label: 'Issue or return a book', path: '/admin/library', perm: 'library.manage' },
    { label: 'Academic performance', path: '/admin/performance', perm: 'grades.analytics' },
    { label: 'Send an announcement', path: '/admin/broadcast', perm: 'broadcast.send' },
];

const Overview = ({ data }) => (
    <TileRow>
        <Tile label="Students" value={data.students} icon={<IconSchool size={20} />} />
        <Tile label="Active lecturers" value={data.lecturers} icon={<IconUsers size={20} />} />
        <Tile label="Classes" value={data.classes} icon={<IconUsersGroup size={20} />} />
        <Tile
            label="Attendance"
            value={formatPercent(data.attendance30d ?? data.attendanceAllTime)}
            hint={data.attendance30d !== null ? 'Present or late, last 30 days' : 'Present or late, all records'}
            icon={<IconChartBar size={20} />}
        />
    </TileRow>
);

const Accounts = ({ data }) => {
    const temporary = data.reduce((sum, r) => sum + r.temporaryPassword, 0);
    const inactive = data.reduce((sum, r) => sum + r.inactive, 0);
    return (
        <Card title="System accounts" action={<CardLink to="/admin/users">Manage accounts</CardLink>}>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="text-xs uppercase tracking-wide whitespace-nowrap text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                            <th className="py-2 pr-4 font-semibold">Role</th>
                            <th className="py-2 pr-4 font-semibold text-right">Accounts</th>
                            <th className="py-2 pr-4 font-semibold text-right">Deactivated</th>
                            <th className="py-2 font-semibold text-right">Temporary password</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
                        {data.map((r) => (
                            <tr key={r.role}>
                                <td className="py-2 pr-4 font-medium">{ROLE_LABELS[r.role] || r.role}</td>
                                <td className="py-2 pr-4 text-right tabular-nums">{r.total}</td>
                                <td className="py-2 pr-4 text-right tabular-nums">{r.inactive}</td>
                                <td className="py-2 text-right tabular-nums">{r.temporaryPassword}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                {inactive} deactivated · {temporary} still on a temporary password
            </p>
        </Card>
    );
};

const Today = ({ data }) => (
    <Card title={`Today's classes (${data.day})`} action={<CardLink to="/admin/attendance">Attendance</CardLink>}>
        {data.sessions.length === 0 ? (
            <Empty>No classes are scheduled today.</Empty>
        ) : (
            <List>
                {data.sessions.map((s) => (
                    <ListRow
                        key={s.id}
                        primary={`${s.start_time}–${s.end_time} · ${s.course_name}`}
                        secondary={`${s.student_group_name} · ${s.room_name} · ${s.lecturer_name || s.lecturer_email}`}
                        right={<AttendanceChip taken={s.attendance_taken} />}
                    />
                ))}
            </List>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 flex items-center gap-1.5">
            <IconUserPlus size={14} /> {data.newStudents30d} new students in the last 30 days
        </p>
    </Card>
);

const Staff = ({ data }) => (
    <Card title="Staff attendance" action={<CardLink to="/admin/staff-attendance">View register</CardLink>}>
        <div className="grid grid-cols-3 gap-4">
            <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Present today</p>
                <p className="text-xl font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{data.presentToday} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">of {data.lecturers}</span></p>
            </div>
            <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">On leave today</p>
                <p className="text-xl font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{data.onLeaveToday}</p>
            </div>
            <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Present, last 30 days</p>
                <p className="text-xl font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{formatPercent(data.presentRate30d)}</p>
            </div>
        </div>
    </Card>
);

const Academic = ({ data }) => (
    <Card title="Academic performance" action={<CardLink to="/admin/performance">Full report</CardLink>}>
        {data.overall.grades === 0 ? (
            <Empty>No grades have been recorded yet.</Empty>
        ) : (
            <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Average score</p>
                        <p className="text-xl font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{formatPercent(data.overall.average)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Pass rate ({data.passMark}%+)</p>
                        <p className="text-xl font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{formatPercent(data.overall.pass_rate)}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1"><IconTrophy size={14} /> Strongest classes</p>
                        {data.strongest.length === 0 ? <Empty>Not enough graded students yet.</Empty> : (
                            <List>{data.strongest.map((c) => <ListRow key={c.student_group_name} primary={c.student_group_name} right={<span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">{formatPercent(c.average)}</span>} />)}</List>
                        )}
                    </div>
                    {data.needsAttention.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1"><IconAlertTriangle size={14} /> Needs attention</p>
                            <List>{data.needsAttention.map((c) => <ListRow key={c.student_group_name} primary={c.student_group_name} right={<span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">{formatPercent(c.average)}</span>} />)}</List>
                        </div>
                    )}
                </div>
            </>
        )}
    </Card>
);

const FinanceTotals = ({ data, canSeeRecords }) => (
    <Card title="School fees" action={canSeeRecords ? <CardLink to="/admin/finance">Open finance</CardLink> : null}>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Billed</p>
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{formatCurrency(data.billed)}</p>
            </div>
            <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Collected</p>
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{formatCurrency(data.collected)}</p>
            </div>
            <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Outstanding</p>
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{formatCurrency(data.outstanding)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{data.openInvoices} open invoices</p>
            </div>
        </div>
        <Meter value={data.collectionRate} label="Collected so far" />
    </Card>
);

const FinanceDesk = ({ data }) => (
    <>
        <div className="grid grid-cols-2 gap-4">
            <Tile label="Overdue" value={formatCurrency(data.overdue.amount)} hint={`${data.overdue.invoices} invoices past due`} icon={<IconAlertTriangle size={20} />} tone="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" />
            <Tile label="Last 7 days" value={formatCurrency(data.lastSevenDays.amount)} hint={`${data.lastSevenDays.payments} payments`} icon={<IconCash size={20} />} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent payments" action={<CardLink to="/admin/finance">All invoices</CardLink>}>
            {data.recentPayments.length === 0 ? <Empty>No payments recorded yet.</Empty> : (
                <List>
                    {data.recentPayments.map((p) => (
                        <ListRow key={p.id}
                            primary={`${p.first_name} ${p.last_name}`}
                            secondary={`${p.fee_type_name} · ${p.payment_method} · ${formatDate(p.payment_date)}`}
                            right={<span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">{formatCurrency(p.amount_paid)}</span>} />
                    ))}
                </List>
            )}
        </Card>
        <Card title="Largest balances" action={<CardLink to="/admin/finance">Defaulters</CardLink>}>
            {data.topDefaulters.length === 0 ? <Empty>Every student is paid up.</Empty> : (
                <List>
                    {data.topDefaulters.map((d) => (
                        <ListRow key={d.student_id}
                            primary={`${d.first_name} ${d.last_name}`}
                            secondary={`${d.enrollment_number}${d.student_group_name ? ` · ${d.student_group_name}` : ''}`}
                            right={<span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">{formatCurrency(d.balance)}</span>} />
                    ))}
                </List>
            )}
        </Card>
        </div>
    </>
);

const Library = ({ data }) => (
    <>
        <TileRow>
            <Tile label="Books" value={data.totalBooks} icon={<IconBooks size={20} />} />
            <Tile label="On loan" value={data.onLoan} icon={<IconBook2 size={20} />} />
            <Tile label="Overdue" value={data.overdueCount} icon={<IconAlertTriangle size={20} />} tone="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" />
            <Tile label="No copies left" value={data.unavailableTitles} hint="Titles fully on loan" icon={<IconReceipt size={20} />} />
        </TileRow>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card title="Overdue loans" action={<CardLink to="/admin/library">Circulation</CardLink>}>
                {data.overdue.length === 0 ? <Empty>Nothing is overdue.</Empty> : (
                    <List>
                        {data.overdue.map((o) => (
                            <ListRow key={o.id} primary={o.title} secondary={o.borrower}
                                right={<span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400"><IconAlertTriangle size={14} />{o.days_overdue} days late</span>} />
                        ))}
                    </List>
                )}
            </Card>
            <Card title="Latest loans">
                {data.recent.length === 0 ? <Empty>No books have been issued yet.</Empty> : (
                    <List>
                        {data.recent.map((r) => (
                            <ListRow key={r.id} primary={r.title} secondary={`${r.borrower} · ${formatDate(r.issue_date)}`}
                                right={<span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{r.status}</span>} />
                        ))}
                    </List>
                )}
            </Card>
        </div>
    </>
);

const RoleDashboard = () => {
    const { user } = useAuth();
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get('/dashboard')
            .then((res) => setData(res.data))
            .catch(() => toast.error('Failed to load dashboard'));
    }, []);

    const links = QUICK_LINKS.filter((l) => can(user, l.perm));
    const s = data?.sections || {};
    const canSeeRecords = can(user, 'finance.records');
    const cards = [
        s.accounts && <Accounts data={s.accounts} />,
        s.academic && <Academic data={s.academic} />,
        s.staff && <Staff data={s.staff} />,
        s.financeTotals && <FinanceTotals data={s.financeTotals} canSeeRecords={canSeeRecords} />,
    ].filter(Boolean);

    return (
        <div className="page">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{greeting()}, {user?.name || 'there'} 👋</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{SUBTITLES[user?.role]}</p>
            </div>

            {!data ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
            ) : (
                <div className="flex flex-col gap-6">
                    {s.overview && <Overview data={s.overview} />}
                    {s.today && <Today data={s.today} />}

                    {cards.length > 0 && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {cards.map((card, i) => (
                                // A card left alone on the last row spans the full width.
                                <div key={i} className={`grid ${cards.length % 2 === 1 && i === cards.length - 1 ? 'xl:col-span-2' : ''}`}>{card}</div>
                            ))}
                        </div>
                    )}

                    {s.financeDesk && <FinanceDesk data={s.financeDesk} />}
                    {s.library && <Library data={s.library} />}

                    {links.length > 0 && (
                        <Card title="Shortcuts">
                            <div className="flex flex-wrap gap-2">
                                {links.map((l) => (
                                    <Link key={l.path + l.label} to={l.path} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-primary-300 hover:text-primary-600 transition-colors">
                                        {l.label}
                                    </Link>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
};

export default RoleDashboard;
