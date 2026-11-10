import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { IconBooks, IconUsers, IconCalendarEvent, IconShieldCheck, IconCircleCheck } from '@tabler/icons-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { greeting, Tile, TileRow, Card, CardLink, Empty, AttendanceChip, List, ListRow } from './DashboardParts';

// A lecturer's day: check in at the gate, today's classes, and whether each
// class's attendance has been taken.
const LecturerDashboard = () => {
    const { user } = useAuth();
    const [teaching, setTeaching] = useState(null);
    const [token, setToken] = useState('');
    const [checkingIn, setCheckingIn] = useState(false);

    const load = useCallback(() => {
        api.get('/dashboard')
            .then((res) => setTeaching(res.data.sections.teaching))
            .catch(() => toast.error('Failed to load your dashboard'));
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCheckIn = async (e) => {
        e.preventDefault();
        setCheckingIn(true);
        try {
            await api.post('/attendance/lecturer-checkin', { token });
            toast.success('Checked in');
            setToken('');
            load();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Check-in failed');
        } finally {
            setCheckingIn(false);
        }
    };

    const today = teaching?.today || [];
    const pending = today.filter((s) => !s.attendance_taken).length;

    return (
        <div className="page">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{greeting()}, {user?.name || 'Lecturer'} 👋</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your classes and today&apos;s teaching.</p>
            </div>

            <div className="flex flex-col gap-6">
                <TileRow>
                    <Tile label="My classes" value={teaching ? teaching.classes : '—'} icon={<IconBooks size={20} />} />
                    <Tile label="My students" value={teaching ? teaching.students : '—'} icon={<IconUsers size={20} />} />
                    <Tile label="Classes today" value={teaching ? today.length : '—'} icon={<IconCalendarEvent size={20} />} />
                    <Tile label="Attendance to take" value={teaching ? pending : '—'} hint="Today's classes" icon={<IconCalendarEvent size={20} />} tone="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" />
                </TileRow>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <Card title="Today's classes" action={<CardLink to="/admin/timetable">My timetable</CardLink>} className="lg:col-span-3">
                        {!teaching ? <Empty>Loading…</Empty> : today.length === 0 ? (
                            <Empty>You have no classes scheduled today.</Empty>
                        ) : (
                            <List>
                                {today.map((s) => (
                                    <ListRow key={s.id}
                                        primary={`${s.start_time}–${s.end_time} · ${s.course_name}`}
                                        secondary={`${s.student_group_name} · ${s.room_name}`}
                                        right={s.attendance_taken ? <AttendanceChip taken /> : (
                                            <Link to="/admin/attendance" className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">Take attendance</Link>
                                        )} />
                                ))}
                            </List>
                        )}
                    </Card>

                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <section className="bg-primary-600 rounded-xl p-5 text-white shadow-lg shadow-primary-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><IconShieldCheck size={100} /></div>
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary-100 mb-3 relative z-10">Gate check-in</h3>
                            {teaching?.checkIn ? (
                                <p className="relative z-10 flex items-center gap-2 text-sm font-semibold">
                                    <IconCircleCheck size={20} /> Checked in today{teaching.checkIn.check_in_time ? ` at ${teaching.checkIn.check_in_time}` : ''}
                                </p>
                            ) : (
                                <>
                                    <p className="text-xs text-primary-100 mb-4 relative z-10">Enter the code shown at the security gate to record that you are in today.</p>
                                    <form onSubmit={handleCheckIn} className="flex gap-2 relative z-10">
                                        <input
                                            type="text"
                                            value={token}
                                            onChange={(e) => setToken(e.target.value.toUpperCase())}
                                            placeholder="e.g. A7X9Z2"
                                            aria-label="Gate code"
                                            className="flex-1 min-w-0 bg-white/10 border border-white/30 rounded-lg px-4 py-2 outline-none focus:bg-white/20 text-white font-mono uppercase font-semibold placeholder-primary-200"
                                            maxLength={6}
                                            required
                                        />
                                        <button disabled={checkingIn} type="submit" className="bg-white text-primary-700 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-primary-50 transition-colors disabled:opacity-70 cursor-pointer">
                                            {checkingIn ? '…' : 'Check in'}
                                        </button>
                                    </form>
                                </>
                            )}
                        </section>

                        <Card title="Shortcuts">
                            <div className="flex flex-col gap-2">
                                {[
                                    { label: 'Take attendance', path: '/admin/attendance' },
                                    { label: 'Enter grades', path: '/admin/grades' },
                                    { label: 'Share learning material', path: '/admin/materials' },
                                ].map((l) => (
                                    <Link key={l.path} to={l.path} className="px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-transparent hover:border-primary-200 hover:text-primary-600 text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors">
                                        {l.label}
                                    </Link>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LecturerDashboard;
