import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { IconDownload } from '@tabler/icons-react';
import toast from 'react-hot-toast';

const MaterialUpload = () => {
    const { user } = useAuth();
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [form, setForm] = useState({ studentGroupId: '', lecturerId: '', title: '', fileUrl: '' });
    const [studentGroupsList, setStudentGroupsList] = useState([]);
    const [lecturersList, setLecturersList] = useState([]);

    useEffect(() => {
        fetchMaterials();
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [groupsRes, lecturersRes] = await Promise.all([
                api.get('/student-groups'),
                api.get('/lecturers')
            ]);
            setStudentGroupsList(groupsRes.data);
            setLecturersList(lecturersRes.data);
            
            if (user?.role === 'LECTURER') {
                const me = lecturersRes.data.find(t => t.email === user.email);
                if (me) {
                    setForm(prev => ({ ...prev, lecturerId: me.id.toString() }));
                }
            }
        } catch (error) {
            console.error('Failed to load form data', error);
        }
    };

    const fetchMaterials = async () => {
        try {
            const response = await api.get('/materials');
            setMaterials(response.data);
        } catch (error) {
            toast.error('Failed to load materials');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        try {
            await api.post('/materials', form);
            toast.success('Material uploaded');
            fetchMaterials();
            setForm(prev => ({ ...prev, title: '', fileUrl: '' }));
        } catch (error) {
            toast.error('Failed to upload material');
        }
    };

    const isStudent = user?.role === 'STUDENT';

    return (
        <div className="p-4 md:p-6 lg:p-10 w-full overflow-hidden box-border">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Learning Materials</h1>
                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Access and distribute course content.</p>
            </div>

            {!isStudent && (
                <div className="glass p-6 rounded-2xl md:rounded-3xl shadow-sm mb-8">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Upload Content</h2>
                    <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <select required value={form.studentGroupId} onChange={e => setForm({...form, studentGroupId: e.target.value})} className="px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200">
                            <option value="">Select Group</option>
                            {studentGroupsList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        <select required disabled={user?.role === 'LECTURER'} value={form.lecturerId} onChange={e => setForm({...form, lecturerId: e.target.value})} className={`px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200 ${user?.role === 'LECTURER' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <option value="">Select Lecturer</option>
                            {lecturersList.map(t => <option key={t.id} value={t.id}>{t.email.split('@')[0]} ({t.department})</option>)}
                        </select>
                        <input type="text" placeholder="Material Title" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200" />
                        <input type="url" placeholder="File URL Link" required value={form.fileUrl} onChange={e => setForm({...form, fileUrl: e.target.value})} className="px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200" />
                        <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 rounded-xl font-bold transition-colors">Upload</button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-8 text-slate-500 dark:text-slate-400">Loading materials...</div>
                ) : materials.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-slate-400">No learning materials found.</div>
                ) : (
                    materials.map(mat => (
                        <div key={mat.id} className="glass p-5 rounded-2xl shadow-sm flex flex-col justify-between h-48 border border-white dark:border-slate-700/50/60">
                            <div>
                                <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 line-clamp-2">{mat.title}</h3>
                                <p className="text-sm font-bold text-primary-600 mt-1">{mat.student_group_name}</p>
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                <span className="text-xs font-semibold text-slate-400">{new Date(mat.created_at).toLocaleDateString()}</span>
                                <a href={mat.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-primary-600 bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors">
                                    <IconDownload size={16} />
                                    Open
                                </a>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
export default MaterialUpload;
