import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { IconBook2, IconPlus, IconX, IconTrash } from '@tabler/icons-react';
import toast from 'react-hot-toast';

const ProgramList = () => {
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', code: '' });
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    useEffect(() => {
        fetchPrograms();
    }, []);

    const fetchPrograms = async () => {
        try {
            const response = await api.get('/programs');
            setPrograms(response.data);
        } catch (error) {
            toast.error('Failed to load programs');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/programs', formData);
            toast.success('Program created successfully');
            setIsModalOpen(false);
            setFormData({ name: '', code: '' });
            fetchPrograms();
        } catch (error) {
            toast.error('Failed to create program');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this program?')) return;
        try {
            await api.delete(`/programs/${id}`);
            toast.success('Program deleted');
            fetchPrograms();
        } catch (error) {
            toast.error('Failed to delete program');
        }
    };

    return (
        <div className="page w-full  box-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">Programs</h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage all academic programs.</p>
                </div>
                {isAdmin && (
                    <button onClick={() => setIsModalOpen(true)} className="flex justify-center items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors w-full md:w-auto cursor-pointer">
                        <IconPlus size={20} />
                        Add Program
                    </button>
                )}
            </div>

            <div className="catalog-grid">
                {loading ? (
                    <p className="col-span-full text-center text-slate-500 dark:text-slate-400 py-10">Loading programs...</p>
                ) : programs.length === 0 ? (
                    <p className="col-span-full text-center text-slate-500 dark:text-slate-400 py-10">No programs found.</p>
                ) : (
                    programs.map(program => (
                        <div key={program.id} className="catalog-card glass p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50 relative group flex items-start gap-4 min-w-0 overflow-hidden">
                            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
                                <IconBook2 size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight break-words" title={program.name}>{program.name}</h3>
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">{program.code}</p>
                            </div>
                            {isAdmin && (
                                <button onClick={() => handleDelete(program.id)} className="text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 p-2 rounded-xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-all cursor-pointer shrink-0">
                                    <IconTrash size={18} />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {isModalOpen && isAdmin && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-xl">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Add New Program</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer">
                                <IconX size={20} />
                            </button>
                        </div>
                        <div className="p-8">
                            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Program Name</label>
                                    <input required type="text" placeholder="e.g. BSc Computer Science" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-semibold text-slate-700 dark:text-slate-200" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Program Code</label>
                                    <input required type="text" placeholder="e.g. BSc-CS" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-semibold text-slate-700 dark:text-slate-200" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                                </div>
                                <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors mt-2 cursor-pointer">
                                    Create Program
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProgramList;
