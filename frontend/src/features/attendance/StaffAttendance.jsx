import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const StaffAttendance = () => {
    const { user } = useAuth();
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const isAdmin = user?.role === 'ADMIN';

    // Form state for clock in/out
    const [form, setForm] = useState({
        lecturerId: '', // For admin overriding, or lecturer's own ID
        date: new Date().toISOString().split('T')[0],
        status: 'Present',
        checkInTime: '',
        checkOutTime: ''
    });

    useEffect(() => {
        fetchAttendance();
    }, []);

    const fetchAttendance = async () => {
        try {
            const endpoint = isAdmin ? '/lecturer-attendance' : `/lecturer-attendance/${user.id}`;
            const response = await api.get(endpoint);
            setAttendance(response.data);
            
            // Set default lecturer ID for lecturers
            if (!isAdmin && response.data) {
                // Actually, the lecturer id in the DB might differ from user.id. 
                // Let's rely on the lecturer's profile ID if we have it, or leave it blank to force manual entry for now.
                // A robust app would fetch the profile.
            }
        } catch (error) {
            toast.error('Failed to load staff attendance');
        } finally {
            setLoading(false);
        }
    };

    const handleMark = async (e) => {
        e.preventDefault();
        try {
            await api.post('/lecturer-attendance', form);
            toast.success('Attendance recorded');
            fetchAttendance();
        } catch (error) {
            toast.error('Failed to record attendance');
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-10 w-full overflow-hidden box-border">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Staff Attendance</h1>
                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage lecturer clock-ins and daily presence.</p>
            </div>

            <div className="glass p-6 rounded-2xl md:rounded-3xl shadow-sm mb-8">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">{isAdmin ? 'Log Staff Attendance' : 'Clock In / Out'}</h2>
                <form onSubmit={handleMark} className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <input type="number" placeholder="Lecturer ID" required value={form.lecturerId} onChange={e => setForm({...form, lecturerId: e.target.value})} className="px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200" />
                    
                    <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200" />
                    
                    <select required value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200">
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="On Leave">On Leave</option>
                    </select>

                    <input type="time" placeholder="Check In" value={form.checkInTime} onChange={e => setForm({...form, checkInTime: e.target.value})} className="px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200" title="Check In Time" />
                    
                    <input type="time" placeholder="Check Out" value={form.checkOutTime} onChange={e => setForm({...form, checkOutTime: e.target.value})} className="px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200" title="Check Out Time" />

                    <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 rounded-xl font-bold transition-colors shadow-sm shadow-primary-200">Record</button>
                </form>
            </div>

            <div className="glass rounded-2xl md:rounded-3xl overflow-hidden shadow-sm p-4 md:p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Attendance Log</h2>
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                                <th className="px-6 py-4">Date</th>
                                {isAdmin && <th className="px-6 py-4">Lecturer</th>}
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Check In</th>
                                <th className="px-6 py-4">Check Out</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50 text-sm font-medium text-slate-700 dark:text-slate-200">
                            {loading ? (
                                <tr><td colSpan={isAdmin ? 6 : 5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
                            ) : attendance.length === 0 ? (
                                <tr><td colSpan={isAdmin ? 6 : 5} className="px-6 py-8 text-center text-slate-400">No records found.</td></tr>
                            ) : (
                                attendance.map(rec => (
                                    <tr key={rec.id} className="hover:bg-primary-50/30 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{new Date(rec.date).toLocaleDateString()}</td>
                                        {isAdmin && (
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 dark:text-slate-100">{rec.email?.split('@')[0]}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">{rec.email}</div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400">{rec.department || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                rec.status === 'Present' ? 'bg-emerald-100 text-emerald-700' :
                                                rec.status === 'Absent' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>{rec.status}</span>
                                        </td>
                                        <td className="px-6 py-4 font-mono">{rec.check_in_time || '--:--'}</td>
                                        <td className="px-6 py-4 font-mono">{rec.check_out_time || '--:--'}</td>
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

export default StaffAttendance;
