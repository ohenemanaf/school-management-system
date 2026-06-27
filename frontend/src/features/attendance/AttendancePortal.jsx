import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const AttendancePortal = () => {
    const { user } = useAuth();
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [form, setForm] = useState({ studentGroupId: '', date: new Date().toISOString().split('T')[0] });
    const [studentsList, setStudentsList] = useState([]);
    const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
    const [studentGroupsList, setStudentGroupsList] = useState([]);

    useEffect(() => {
        fetchAttendance();
        fetchStudentGroups();
    }, []);

    const fetchStudentGroups = async () => {
        try {
            const response = await api.get('/student-groups');
            setStudentGroupsList(response.data);
            if (response.data.length > 0) {
                setForm(prev => ({ ...prev, studentGroupId: response.data[0].id.toString() }));
            }
        } catch (error) {
            console.error('Failed to load groups', error);
        }
    };

    const fetchAttendance = async () => {
        try {
            const response = await api.get('/attendance');
            setAttendance(response.data);
        } catch (error) {
            toast.error('Failed to load attendance');
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentsForClass = async () => {
        if (!form.studentGroupId) return;
        try {
            const response = await api.get('/students'); 
            const filtered = response.data.filter(s => s.student_group_id === parseInt(form.studentGroupId));
            const defaultList = filtered.map(s => ({ ...s, status: 'Present' }));
            setStudentsList(defaultList);
            toast.success(`Loaded ${defaultList.length} students`);
        } catch (error) {
            toast.error('Failed to load students');
        }
    };

    const toggleStudentStatus = (id) => {
        setStudentsList(prev => prev.map(s => {
            if (s.id === id) {
                return { ...s, status: s.status === 'Present' ? 'Absent' : 'Present' };
            }
            return s;
        }));
    };

    const submitBulkAttendance = async () => {
        setIsSubmittingBulk(true);
        try {
            let errorCount = 0;
            await Promise.all(studentsList.map(s => 
                api.post('/attendance', {
                    studentId: s.id,
                    studentGroupId: parseInt(form.studentGroupId),
                    date: form.date,
                    status: s.status
                }).catch(e => { errorCount++; return null; })
            ));
            
            if (errorCount > 0) {
                toast.error(`Failed to save ${errorCount} records. Ensure the Group exists.`);
            } else {
                toast.success('Bulk attendance saved successfully!');
            }
            setStudentsList([]);
            fetchAttendance();
        } catch (error) {
            toast.error('Failed to save bulk attendance');
        } finally {
            setIsSubmittingBulk(false);
        }
    };

    const isStudent = user?.role === 'STUDENT';

    return (
        <div className="p-4 md:p-6 lg:p-10 w-full overflow-hidden box-border">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Attendance</h1>
                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Track and manage student presence via Fast-Tap Bulk mode.</p>
            </div>

            {!isStudent && (
                <div className="glass p-6 rounded-2xl md:rounded-3xl shadow-sm mb-8">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center justify-between">
                        Fast-Tap Bulk Attendance
                    </h2>
                    
                    {/* Class & Date Selector */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <select 
                            value={form.studentGroupId} 
                            onChange={e => setForm({...form, studentGroupId: e.target.value})} 
                            className="px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200"
                        >
                            {studentGroupsList.length === 0 && <option value="">No groups available</option>}
                            {studentGroupsList.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200" />
                        <button onClick={() => fetchStudentsForClass()} disabled={!form.studentGroupId || !form.date} className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 cursor-pointer">
                            Load Students
                        </button>
                    </div>

                    {studentsList.length > 0 && (
                        <div className="border border-slate-100 dark:border-slate-700/50 rounded-2xl bg-white dark:bg-slate-800 overflow-hidden">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Loaded {studentsList.length} Students</span>
                                <button onClick={submitBulkAttendance} disabled={isSubmittingBulk} className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-bold transition-colors cursor-pointer shadow-sm shadow-primary-200">
                                    {isSubmittingBulk ? 'Saving...' : 'Submit Bulk Attendance'}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                                {studentsList.map((student, idx) => (
                                    <div key={student.id} 
                                        onClick={() => toggleStudentStatus(student.id)}
                                        className={`p-4 flex items-center justify-between cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-700/50 ${
                                            student.status === 'Present' ? 'hover:bg-slate-50 dark:bg-slate-900/50 bg-white dark:bg-slate-800' : 'bg-red-50 hover:bg-red-100'
                                        }`}
                                    >
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{student.first_name} {student.last_name}</p>
                                            <p className="text-xs text-slate-400 font-medium">{student.enrollment_number}</p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                                            student.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-500 text-white shadow-md shadow-red-500/20'
                                        }`}>
                                            {student.status}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="glass rounded-2xl md:rounded-3xl overflow-hidden shadow-sm p-4 md:p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Attendance Records</h2>
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Group</th>
                                {!isStudent && <th className="px-6 py-4">Student</th>}
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50 text-sm font-medium text-slate-700 dark:text-slate-200">
                            {loading ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
                            ) : attendance.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">No records found.</td></tr>
                            ) : (
                                attendance.map(rec => (
                                    <tr key={rec.id} className="hover:bg-primary-50/30 transition-colors">
                                        <td className="px-6 py-4">{new Date(rec.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-bold">{rec.student_group_name}</td>
                                        {!isStudent && <td className="px-6 py-4">{rec.first_name} {rec.last_name}</td>}
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                rec.status === 'Present' ? 'bg-emerald-100 text-emerald-700' :
                                                rec.status === 'Absent' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>{rec.status}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
export default AttendancePortal;
