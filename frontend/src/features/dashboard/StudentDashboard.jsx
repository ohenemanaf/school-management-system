import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { IconSchool, IconBooks, IconChartBar, IconCalendarTime, IconReportAnalytics, IconArrowRight, IconId, IconMail, IconFileInvoice, IconDownload, IconCash } from '@tabler/icons-react';

const StudentDashboard = () => {
    const { user } = useAuth();
    
    const [invoices, setInvoices] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [timetable, setTimetable] = useState([]);
    const [grades, setGrades] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudentData = async () => {
            try {
                const [invoicesRes, assignmentsRes, timetableRes, gradesRes, attendanceRes] = await Promise.all([
                    api.get('/finance/invoices'),
                    api.get('/library/assignments'),
                    api.get('/timetable'),
                    api.get('/grades'),
                    api.get('/attendance')
                ]);
                setInvoices(invoicesRes.data);
                setAssignments(assignmentsRes.data);
                setTimetable(timetableRes.data);
                setGrades(gradesRes.data);
                setAttendance(attendanceRes.data);
            } catch (error) {
                console.error('Error fetching student data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudentData();
    }, []);

    const totalDue = invoices.reduce((sum, inv) => sum + Number(inv.amount_due), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.amount_paid), 0);
    const balance = totalDue - totalPaid;

    const calculateAttendance = () => {
        if (!attendance || attendance.length === 0) return '—';
        const present = attendance.filter(a => a.status === 'Present').length;
        return `${Math.round((present / attendance.length) * 100)}%`;
    };

    const overallAttendance = calculateAttendance();
    const todayClasses = timetable.filter(t => t.day_of_week === new Date().toLocaleDateString('en-US', { weekday: 'long' }));
    
    const calculateAverageGrade = () => {
        if (!grades || grades.length === 0) return 'No Data';
        const totalPercentage = grades.reduce((acc, curr) => acc + ((Number(curr.score) / Number(curr.max_score)) * 100), 0);
        return `${(totalPercentage / grades.length).toFixed(1)}%`;
    };
    
    const averageGrade = calculateAverageGrade();

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount);
    };

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    // Calculate avatar URL fallback if not uploaded
    const getAvatarUrl = () => {
        if (user?.profileImageUrl) {
            return user.profileImageUrl.startsWith('http') ? user.profileImageUrl : `http://localhost:5000${user.profileImageUrl}`;
        }
        const gender = user?.gender?.toLowerCase() === 'female' ? 'girl' : 'boy';
        const nameParam = user?.name ? user.name.replace(' ', '+') : 'Student';
        return `https://avatar.iran.liara.run/public/${gender}?username=${nameParam}`;
    };

    return (
        <div className="page space-y-8">
            {/* Header section with Glassmorphism Profile Card */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Profile Card */}
                <div className="w-full lg:w-1/3 shrink-0">
                    <div className="glass bg-white dark:bg-slate-800/70 backdrop-blur-xl border border-white dark:border-slate-700/50 shadow-xl shadow-slate-200/50 rounded-3xl p-8 flex flex-col items-center text-center relative overflow-hidden">
                        {/* Decorative background blob */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-400/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl -ml-10 -mb-10"></div>
                        
                        <div className="relative z-10 w-full min-w-0">
                            <div className="w-32 h-32 rounded-full p-2 bg-white dark:bg-slate-800/80 backdrop-blur-md shadow-lg mb-6 mx-auto">
                                <img 
                                    src={getAvatarUrl()} 
                                    alt="Profile" 
                                    className="w-full h-full rounded-full object-cover bg-slate-100 dark:bg-slate-800"
                                />
                            </div>
                            <h2 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight break-words px-2" title={user?.name || 'Student'}>{user?.name || 'Student'}</h2>
                            <p className="text-primary-600 font-semibold tracking-wide text-sm mt-1 mb-6 flex items-center justify-center gap-2">
                                <IconSchool size={16} />
                                {user?.role || 'STUDENT'}
                            </p>

                            <div className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 text-left space-y-3 border border-slate-200/60 dark:border-slate-700/60">
                                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                                        <IconId size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Index Number</p>
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">{user?.enrollmentNumber || 'Pending'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                        <IconMail size={16} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Email Address</p>
                                        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{user?.email}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="w-full lg:w-2/3 space-y-8">
                    <div>
                        <h1 className="text-3xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">{greeting()} 👋</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Here is your daily academic overview. Your account is currently in <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md font-semibold text-xs">Read-Only</span> mode.</p>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'Enrolled Courses', value: timetable.length > 0 ? new Set(timetable.map(t => t.subject_name)).size : '0', icon: <IconBooks size={24} />, color: 'from-blue-500 to-cyan-400' },
                            { label: 'Overall Attendance', value: overallAttendance, icon: <IconChartBar size={24} />, color: 'from-emerald-500 to-teal-400' },
                        ].map((stat, i) => (
                            <div key={i} className="glass bg-white dark:bg-slate-800/70 border border-white dark:border-slate-700/50 shadow-sm rounded-3xl p-6 relative overflow-hidden group">
                                <div className={`absolute right-0 top-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-10 rounded-bl-full transition-transform group-hover:scale-110`}></div>
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} text-white flex items-center justify-center mb-4 shadow-lg`}>
                                    {stat.icon}
                                </div>
                                <p className="text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-1">{stat.value}</p>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Placeholders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* My Timetable Link */}
                        <Link to="/admin/timetable" className="glass bg-white dark:bg-slate-800/70 border border-white dark:border-slate-700/50 shadow-sm rounded-3xl p-8 flex flex-col items-center justify-center text-center min-h-[250px] hover:shadow-md transition-all group cursor-pointer relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-primary-400 to-indigo-400 opacity-5 rounded-bl-full transition-transform group-hover:scale-110"></div>
                            <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-indigo-500 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:-translate-y-1 transition-transform">
                                <IconCalendarTime size={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">My Timetable</h3>
                            {todayClasses.length > 0 ? (
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[200px]">You have <span className="font-semibold text-primary-600">{todayClasses.length} classes</span> scheduled for today.</p>
                            ) : (
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[200px]">View your full weekly class schedule.</p>
                            )}
                            <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                View Schedule <IconArrowRight size={16} />
                            </div>
                        </Link>

                        {/* My Results Link */}
                        <Link to="/admin/results" className="glass bg-white dark:bg-slate-800/70 border border-white dark:border-slate-700/50 shadow-sm rounded-3xl p-8 flex flex-col items-center justify-center text-center min-h-[250px] hover:shadow-md transition-all group cursor-pointer relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-amber-400 to-orange-400 opacity-5 rounded-bl-full transition-transform group-hover:scale-110"></div>
                            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:-translate-y-1 transition-transform">
                                <IconReportAnalytics size={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">My Results</h3>
                            {grades.length > 0 ? (
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[200px]">Current Average: <span className="font-semibold text-amber-600">{averageGrade}</span></p>
                            ) : (
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[200px]">View your academic analysis, proficiency graphs, and transcripts.</p>
                            )}
                            <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                View Analysis <IconArrowRight size={16} />
                            </div>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Outstanding Fees */}
                        <div className="glass bg-white dark:bg-slate-800/70 border border-white dark:border-slate-700/50 shadow-sm rounded-3xl p-8 flex flex-col min-h-[250px]">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                                    <IconCash size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Fee Balance</h3>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Outstanding</p>
                                </div>
                            </div>
                            <div className="flex-grow flex flex-col justify-center items-center">
                                {balance > 0 ? (
                                    <>
                                        <h2 className="text-4xl font-semibold text-red-600 mb-2">{formatCurrency(balance)}</h2>
                                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 bg-red-50 px-3 py-1 rounded-full text-red-600">Action Required</p>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="text-4xl font-semibold text-green-600 mb-2">{formatCurrency(balance)}</h2>
                                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 bg-green-50 px-3 py-1 rounded-full text-green-700">All Cleared 🎉</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Digital Library Materials */}
                        <div className="glass bg-white dark:bg-slate-800/70 border border-white dark:border-slate-700/50 shadow-sm rounded-3xl p-6 flex flex-col min-h-[250px]">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                                    <IconBooks size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Library Materials</h3>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Assigned by Lecturers</p>
                                </div>
                            </div>
                            <div className="flex-grow overflow-y-auto pr-2 space-y-3 max-h-[160px]">
                                {assignments.length === 0 ? (
                                    <p className="text-center text-slate-400 font-medium text-sm mt-8">No materials assigned.</p>
                                ) : (
                                    assignments.map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-blue-200 hover:bg-blue-50/50 transition-colors">
                                            <div>
                                                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate max-w-[150px]">{item.book_title}</p>
                                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{item.author}</p>
                                            </div>
                                            {item.pdf_url ? (
                                                <a 
                                                    href={`http://localhost:5000${item.pdf_url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors shrink-0"
                                                    title="Download/Read PDF"
                                                >
                                                    <IconDownload size={16} />
                                                </a>
                                            ) : (
                                                <span className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Physical</span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
