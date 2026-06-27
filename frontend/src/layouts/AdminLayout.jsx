import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import { 
    IconDashboard, 
    IconUsers, 
    IconSchool, 
    IconSettings, 
    IconLogout,
    IconMenu2,
    IconX,
    IconBell,
    IconChalkboard,
    IconBooks,
    IconChecklist,
    IconTrophy,
    IconFileText,
    IconCalendarEvent,
    IconSpeakerphone,
    IconReportAnalytics,
    IconCash,
    IconBook,
    IconUsersGroup,
    IconBuilding,
    IconCertificate
} from '@tabler/icons-react';

const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const { user, logout } = useAuth();
    const { preferences } = useTheme();
    const dropdownRef = useRef(null);

    const isCollapsed = preferences?.sidebarType === 'collapse';
    const isBoxed = preferences?.containerOption === 'boxed';

    useEffect(() => {
        if (user) {
            fetchNotifications();
            // Polling for notifications every 30s
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    const markAsRead = async (id, currentIsRead) => {
        if (currentIsRead) return;
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const navItems = [
        { path: '/admin', label: 'Dashboard', icon: <IconDashboard size={20} />, roles: ['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER', 'STUDENT'] },
        { path: '/admin/timetable', label: 'Master Timetable', icon: <IconCalendarEvent size={20} />, roles: ['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER', 'STUDENT'] },
        { path: '/admin/courses', label: 'Courses', icon: <IconBook size={20} />, roles: ['SUPER_ADMIN', 'HEADMASTER', 'ADMIN'] },
        { path: '/admin/programs', label: 'Programs', icon: <IconCertificate size={20} />, roles: ['SUPER_ADMIN', 'HEADMASTER', 'ADMIN'] },
        { path: '/admin/student-groups', label: 'Student Groups', icon: <IconUsersGroup size={20} />, roles: ['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER'] },
        { path: '/admin/rooms', label: 'Rooms', icon: <IconBuilding size={20} />, roles: ['SUPER_ADMIN', 'HEADMASTER', 'ADMIN'] },
        { path: '/admin/students', label: 'Students', icon: <IconSchool size={20} />, roles: ['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER', 'ACCOUNTANT'] },
        { path: '/admin/attendance', label: 'Student Attendance', icon: <IconChecklist size={20} />, roles: ['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER'] },
        { path: '/admin/staff-attendance', label: 'Staff Attendance', icon: <IconUsers size={20} />, roles: ['SUPER_ADMIN', 'HEADMASTER', 'ADMIN'] },
        { path: '/admin/grades', label: 'Gradebook', icon: <IconTrophy size={20} />, roles: ['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER'] },
        { path: '/admin/results', label: 'My Results', icon: <IconReportAnalytics size={20} />, roles: ['STUDENT'] },
        { path: '/admin/finance', label: 'Finance', icon: <IconCash size={20} />, roles: ['SUPER_ADMIN', 'HEADMASTER', 'ACCOUNTANT', 'STUDENT'] },
        { path: '/admin/library', label: 'Library', icon: <IconBooks size={20} />, roles: ['SUPER_ADMIN', 'HEADMASTER', 'LIBRARIAN', 'STUDENT', 'LECTURER'] },
        { path: '/admin/materials', label: 'Materials', icon: <IconFileText size={20} />, roles: ['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER', 'STUDENT'] },
        { path: '/admin/lecturers', label: 'Lecturers', icon: <IconSchool size={20} />, roles: ['SUPER_ADMIN', 'HEADMASTER', 'ADMIN'] },
        { path: '/admin/users', label: 'System Users', icon: <IconUsers size={20} />, roles: ['SUPER_ADMIN'] },
        { path: '/admin/broadcast', label: 'Broadcast', icon: <IconSpeakerphone size={20} />, roles: ['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'ACCOUNTANT'] },
        { path: '/admin/settings', label: 'Settings', icon: <IconSettings size={20} />, roles: ['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'ACCOUNTANT', 'LIBRARIAN', 'LECTURER', 'STUDENT', 'GATEKEEPER'] },
    ];
    const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role));

    const location = useLocation();
    const currentNavItem = navItems.find(item => {
        if (item.path === '/admin') return location.pathname === '/admin' || location.pathname === '/admin/';
        return location.pathname.startsWith(item.path);
    });
    const pageTitle = currentNavItem ? currentNavItem.label : 'Dashboard';

    return (
        <div className="min-h-screen bg-[#F0F4F8] dark:bg-slate-900 flex relative overflow-hidden">
            {/* Sidebar overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:sticky top-0 left-0 h-screen bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/60 z-50 transform transition-all duration-300 ease-in-out flex flex-col
                ${isCollapsed ? 'w-20' : 'w-64'}
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo */}
                <div className={`h-16 flex items-center border-b border-slate-100 dark:border-slate-700/50 px-5 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shrink-0">
                            <IconSchool className="text-white" size={18} />
                        </div>
                        {!isCollapsed && <span className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight whitespace-nowrap">SMS</span>}
                    </div>
                    {!isCollapsed && (
                        <button className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:bg-slate-800 transition-colors" onClick={() => setSidebarOpen(false)}>
                            <IconX size={20} />
                        </button>
                    )}
                </div>

                {/* Nav */}
                <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-0.5">
                    {!isCollapsed && <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3 mb-2">Menu</p>}
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/admin'}
                            onClick={() => setSidebarOpen(false)}
                            title={isCollapsed ? item.label : undefined}
                            className={({ isActive }) => `
                                flex items-center gap-2.5 py-2.5 rounded-lg transition-all duration-150 text-[13px] font-medium
                                ${isCollapsed ? 'justify-center px-0' : 'px-3'}
                                ${isActive 
                                    ? 'bg-primary-50 text-primary-600' 
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-900/50 hover:text-slate-800 dark:text-slate-100'
                                }
                            `}
                        >
                            <span className="shrink-0">{item.icon}</span>
                            {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                        </NavLink>
                    ))}
                </div>

                {/* Logout */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-700/50">
                    <button 
                        onClick={logout}
                        title={isCollapsed ? "Logout" : undefined}
                        className={`flex items-center gap-2.5 py-2.5 rounded-lg w-full text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors text-[13px] font-medium cursor-pointer ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
                    >
                        <span className="shrink-0"><IconLogout size={20} /></span>
                        {!isCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-y-auto relative w-full">
                {/* Topbar */}
                <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/60 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8">
                    <div className="flex items-center gap-3">
                        <button 
                            className="lg:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <IconMenu2 size={20} />
                        </button>
                        <div className="hidden sm:block">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{pageTitle}</h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative" ref={dropdownRef}>
                            <button 
                                onClick={() => setNotificationsOpen(!notificationsOpen)}
                                className={`p-2 rounded-lg transition-colors relative cursor-pointer ${notificationsOpen ? 'bg-primary-50 text-primary-600' : 'text-slate-400 hover:bg-slate-100 dark:bg-slate-800'}`}
                            >
                                <IconBell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-700/50 animate-pulse"></span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {notificationsOpen && (
                                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700/50 overflow-hidden z-50">
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <button onClick={markAllAsRead} className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors cursor-pointer">
                                                Mark all as read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 font-medium text-sm">
                                                No notifications yet
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-50">
                                                {notifications.map(notification => (
                                                    <div 
                                                        key={notification.id} 
                                                        onClick={() => markAsRead(notification.id, notification.is_read)}
                                                        className={`p-4 hover:bg-slate-50 dark:bg-slate-900/50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-primary-50/30' : ''}`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!notification.is_read ? 'bg-primary-500' : 'bg-transparent'}`}></div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-bold truncate ${!notification.is_read ? 'text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>
                                                                    {notification.title}
                                                                </p>
                                                                <p className={`text-xs mt-1 line-clamp-2 ${!notification.is_read ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                    {notification.message}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 mt-2 font-semibold tracking-wider uppercase">
                                                                    {new Date(notification.created_at).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                            <img 
                                src={`https://ui-avatars.com/api/?name=${user?.name || user?.email}&background=7C3AED&color=fff&bold=true&size=80`} 
                                alt="Profile" 
                                className="w-8 h-8 rounded-lg"
                            />
                            <div className="hidden md:block">
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-none mb-0.5">{user?.name || user?.email?.split('@')[0]}</p>
                                <p className="text-[11px] text-slate-400 font-medium leading-none capitalize">{user?.role?.toLowerCase()}</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-x-hidden overflow-y-auto">
                    <div className={`w-full ${isBoxed ? 'max-w-7xl mx-auto' : 'px-4 lg:px-8'}`}>
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
