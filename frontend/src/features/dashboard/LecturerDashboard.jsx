import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { IconSchool, IconChecklist, IconBooks, IconChartLine, IconUsers, IconCalendarEvent, IconShieldCheck } from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const LecturerDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ myClasses: 0, totalStudents: 0 });
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState('');
    const [checkingIn, setCheckingIn] = useState(false);

    const handleCheckIn = async (e) => {
        e.preventDefault();
        setCheckingIn(true);
        try {
            await api.post('/attendance/lecturer-checkin', { token });
            toast.success('Check-in successful!');
            setToken('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Check-in failed');
        } finally {
            setCheckingIn(false);
        }
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const lecturersRes = await api.get('/lecturers');
                const me = lecturersRes.data.find(t => t.email === user?.email);
                if (me) {
                    const response = await api.get(`/timetable?lecturer_id=${me.id}`);
                    const uniqueGroups = new Set(response.data.map(t => t.student_group_id)).size;
                    setStats({ myClasses: uniqueGroups, totalStudents: 0 });
                } else {
                    setStats({ myClasses: 0, totalStudents: 0 });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        if (user) {
            fetchStats();
        }
    }, [user]);

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{greeting()}, {user?.name || 'Lecturer'} 👋</h1>
                <p className="text-sm text-slate-400 mt-1">Manage your classes and student performance.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'My Classes', value: loading ? '—' : stats.myClasses, icon: <IconBooks size={20} />, color: 'bg-primary-50 text-primary-600' },
                    { label: 'Students', value: '—', icon: <IconUsers size={20} />, color: 'bg-blue-50 text-blue-600' },
                    { label: 'Pending Grades', value: '0', icon: <IconChecklist size={20} />, color: 'bg-amber-50 text-amber-600' },
                    { label: 'Upcoming', value: '0', icon: <IconCalendarEvent size={20} />, color: 'bg-emerald-50 text-emerald-600' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                            <div className={`p-1.5 rounded-lg ${stat.color}`}>{stat.icon}</div>
                        </div>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Today's Schedule</h3>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between border border-slate-100 dark:border-slate-700/50 p-3 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg"><IconSchool size={18} /></div>
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">No classes scheduled</h4>
                                    <p className="text-xs text-slate-400">Create classes and assign them to start.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="bg-primary-600 rounded-xl p-5 text-white shadow-lg shadow-primary-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><IconShieldCheck size={100} /></div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-primary-100 mb-3 relative z-10">Gatekeeper Check-In</h3>
                        <p className="text-xs text-primary-200 mb-4 relative z-10">Enter the token displayed at the security gate to record your attendance for today.</p>
                        <form onSubmit={handleCheckIn} className="flex gap-2 relative z-10">
                            <input 
                                type="text" 
                                value={token}
                                onChange={e => setToken(e.target.value.toUpperCase())}
                                placeholder="e.g. A7X9Z" 
                                className="flex-1 bg-white dark:bg-slate-800/10 border border-white dark:border-slate-700/50/20 rounded-lg px-4 py-2 outline-none focus:bg-white dark:bg-slate-800/20 text-white font-mono uppercase font-bold placeholder-primary-300"
                                maxLength={6}
                                required
                            />
                            <button disabled={checkingIn} type="submit" className="bg-white dark:bg-slate-800 text-primary-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary-50 transition-colors disabled:opacity-70 cursor-pointer">
                                {checkingIn ? '...' : 'Check In'}
                            </button>
                        </form>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Quick Tasks</h3>
                        <div className="flex flex-col gap-2">
                            <button className="w-full flex items-center gap-2.5 px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:bg-primary-50 hover:text-primary-600 text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-transparent hover:border-primary-200">
                                <IconChecklist size={16} /> Grade Assignments
                            </button>
                            <button className="w-full flex items-center gap-2.5 px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:bg-primary-50 hover:text-primary-600 text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-transparent hover:border-primary-200">
                                <IconChartLine size={16} /> Mark Attendance
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LecturerDashboard;
