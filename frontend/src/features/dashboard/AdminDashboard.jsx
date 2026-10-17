import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { IconUsers, IconSchool, IconBooks, IconChartBar, IconPlus, IconSettings, IconCalendarEvent } from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ totalStudents: 0, activeLecturers: 0, totalGroups: 0, avgAttendance: '0%' });
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState([]);

    useEffect(() => {
        const fetchStatsAndActivity = async () => {
            try {
                const [statsRes, notifRes] = await Promise.all([
                    api.get('/stats'),
                    api.get('/notifications')
                ]);
                setStats(statsRes.data);
                
                const mappedActivities = notifRes.data.slice(0, 3).map((n, i) => ({
                    text: n.title,
                    sub: n.message,
                    time: new Date(n.created_at).toLocaleDateString(),
                    color: i === 0 ? 'bg-emerald-100 text-emerald-600' : (i === 1 ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600')
                }));
                setActivities(mappedActivities.length ? mappedActivities : [
                    { text: 'System ready', sub: 'SMS has been deployed successfully.', time: 'Just now', color: 'bg-emerald-100 text-emerald-600' }
                ]);
            } catch (error) {
                toast.error('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };
        fetchStatsAndActivity();
    }, []);

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="page ">
            {/* Greeting */}
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{greeting()}, {user?.name || 'Admin'} 👋</h1>
                <p className="text-sm text-slate-400 mt-1">Here's what's happening at your school today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Students', value: loading ? '—' : stats.totalStudents, icon: <IconSchool size={20} />, color: 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400' },
                    { label: 'Lecturers', value: loading ? '—' : stats.activeLecturers, icon: <IconUsers size={20} />, color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' },
                    { label: 'Groups', value: loading ? '—' : stats.totalGroups, icon: <IconBooks size={20} />, color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' },
                    { label: 'Attendance', value: loading ? '—' : stats.avgAttendance, icon: <IconChartBar size={20} />, color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 min-w-0 overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between mb-3 min-w-0">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">{stat.label}</span>
                            <div className={`p-1.5 rounded-lg shrink-0 ${stat.color}`}>{stat.icon}</div>
                        </div>
                        <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100 truncate">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Activity */}
                <div className="lg:col-span-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 shadow-sm rounded-2xl p-6 md:p-8 min-w-0 overflow-hidden">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-6">Recent Activity</h3>
                    <div className="flex flex-col gap-6">
                        {activities.map((item, i) => (
                            <div key={i} className="flex flex-wrap sm:flex-nowrap gap-3 items-start min-w-0">
                                <div className={`w-11 h-11 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                                    <IconCalendarEvent size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate" title={item.text}>{item.text}</p>
                                    <p className="text-sm text-slate-400 mt-0.5 line-clamp-2" title={item.sub}>{item.sub}</p>
                                </div>
                                <span className="text-sm text-slate-400 font-medium shrink-0 whitespace-nowrap">{item.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Quick Actions */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Quick Actions</h3>
                    <div className="flex flex-col gap-2">
                        {[
                            { label: 'Add Student', icon: <IconPlus size={16} />, path: '/admin/students' },
                            { label: 'Manage Users', icon: <IconUsers size={16} />, path: '/admin/users' },
                            { label: 'Settings', icon: <IconSettings size={16} />, path: '/admin/settings' },
                        ].map((action, i) => (
                            <Link key={i} to={action.path} className="w-full flex items-center gap-2.5 px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:bg-primary-50 hover:text-primary-600 text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-transparent hover:border-primary-200">
                                {action.icon}
                                {action.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
