import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Gradebook = () => {
    const { user } = useAuth();
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [form, setForm] = useState({ studentId: '', studentGroupId: '', assessmentName: '', score: '', maxScore: '' });
    const [studentGroupsList, setStudentGroupsList] = useState([]);
    const [studentsList, setStudentsList] = useState([]);

    useEffect(() => {
        fetchGrades();
        fetchStudentGroups();
        fetchStudents();
    }, []);

    const fetchStudentGroups = async () => {
        try {
            const response = await api.get('/student-groups');
            setStudentGroupsList(response.data);
        } catch (error) {
            console.error('Failed to load groups', error);
        }
    };

    const fetchStudents = async () => {
        try {
            const response = await api.get('/students');
            setStudentsList(response.data);
        } catch (error) {
            console.error('Failed to load students', error);
        }
    };

    const fetchGrades = async () => {
        try {
            const response = await api.get('/grades');
            setGrades(response.data);
        } catch (error) {
            toast.error('Failed to load grades');
        } finally {
            setLoading(false);
        }
    };

    const handleMark = async (e) => {
        e.preventDefault();
        try {
            await api.post('/grades', form);
            toast.success('Grade saved');
            fetchGrades();
            setForm({ studentId: '', studentGroupId: '', assessmentName: '', score: '', maxScore: '' });
        } catch (error) {
            toast.error('Failed to save grade');
        }
    };

    const isStudent = user?.role === 'STUDENT';

    return (
        <div className="p-4 md:p-6 lg:p-10 w-full overflow-hidden box-border">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Gradebook</h1>
                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Record and view academic performance.</p>
            </div>

            {!isStudent && (
                <div className="glass p-6 rounded-2xl md:rounded-3xl shadow-sm mb-8">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Input Grade</h2>
                    <form onSubmit={handleMark} className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <select required value={form.studentGroupId} onChange={e => setForm({...form, studentGroupId: e.target.value})} className="px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200">
                            <option value="">Select Group</option>
                            {studentGroupsList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        <select required value={form.studentId} onChange={e => setForm({...form, studentId: e.target.value})} className="px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200">
                            <option value="">Select Student</option>
                            {studentsList.filter(s => !form.studentGroupId || s.student_group_id === parseInt(form.studentGroupId)).map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.enrollment_number})</option>)}
                        </select>
                        <input type="text" placeholder="Assessment Name" required value={form.assessmentName} onChange={e => setForm({...form, assessmentName: e.target.value})} className="col-span-2 px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200" />
                        <div className="flex gap-2 items-center">
                            <input type="number" step="0.01" placeholder="Score" required value={form.score} onChange={e => setForm({...form, score: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200" />
                            <span className="font-bold text-slate-400">/</span>
                            <input type="number" step="0.01" placeholder="Max" required value={form.maxScore} onChange={e => setForm({...form, maxScore: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200" />
                        </div>
                        <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 rounded-xl font-bold transition-colors">Save</button>
                    </form>
                </div>
            )}

            <div className="glass rounded-2xl md:rounded-3xl overflow-hidden shadow-sm p-4 md:p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Grade Records</h2>
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                                <th className="px-6 py-4">Assessment</th>
                                <th className="px-6 py-4">Group</th>
                                {!isStudent && <th className="px-6 py-4">Student</th>}
                                <th className="px-6 py-4">Score</th>
                                <th className="px-6 py-4">Percentage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50 text-sm font-medium text-slate-700 dark:text-slate-200">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
                            ) : grades.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400">No records found.</td></tr>
                            ) : (
                                grades.map(rec => {
                                    const percentage = ((rec.score / rec.max_score) * 100).toFixed(1);
                                    return (
                                        <tr key={rec.id} className="hover:bg-primary-50/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{rec.assessment_name}</td>
                                            <td className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400">{rec.student_group_name}</td>
                                            {!isStudent && <td className="px-6 py-4">{rec.first_name} {rec.last_name}</td>}
                                            <td className="px-6 py-4">{rec.score} / {rec.max_score}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                    percentage >= 90 ? 'bg-emerald-100 text-emerald-700' :
                                                    percentage >= 70 ? 'bg-primary-100 text-primary-700' :
                                                    percentage >= 50 ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>{percentage}%</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
export default Gradebook;
