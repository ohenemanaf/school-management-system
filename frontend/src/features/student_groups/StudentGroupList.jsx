import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { IconUsersGroup, IconPlus, IconX, IconTrash } from '@tabler/icons-react';
import toast from 'react-hot-toast';

const StudentGroupList = () => {
    const [groups, setGroups] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', level: '', program_id: '' });
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        fetchGroups();
        fetchPrograms();
    }, []);

    const fetchGroups = async () => {
        try {
            const response = await api.get('/student-groups');
            setGroups(response.data);
        } catch (error) {
            toast.error('Failed to load student groups');
        } finally {
            setLoading(false);
        }
    };

    const fetchPrograms = async () => {
        try {
            const response = await api.get('/programs');
            setPrograms(response.data);
        } catch (error) {
            toast.error('Failed to load programs');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/student-groups', formData);
            toast.success('Group created successfully');
            setIsModalOpen(false);
            setFormData({ name: '', level: '', program_id: '' });
            fetchGroups();
        } catch (error) {
            toast.error('Failed to create group');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this group?')) return;
        try {
            await api.delete(`/student-groups/${id}`);
            toast.success('Group deleted');
            fetchGroups();
        } catch (error) {
            toast.error('Failed to delete group');
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-10 w-full overflow-hidden box-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Student Groups / Cohorts</h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage cohorts of students.</p>
                </div>
                {isAdmin && (
                    <button onClick={() => setIsModalOpen(true)} className="flex justify-center items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 rounded-xl font-bold transition-colors w-full md:w-auto cursor-pointer">
                        <IconPlus size={20} />
                        Add Group
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {loading ? (
                    <p className="col-span-full text-center text-slate-500 dark:text-slate-400 py-10">Loading groups...</p>
                ) : groups.length === 0 ? (
                    <p className="col-span-full text-center text-slate-500 dark:text-slate-400 py-10">No groups found.</p>
                ) : (
                    groups.map(group => (
                        <div key={group.id} className="glass p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 relative group flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                                <IconUsersGroup size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 leading-tight">{group.name}</h3>
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">Level: {group.level}</p>
                                {group.program_name && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-700 mt-2">
                                        {group.program_name}
                                    </span>
                                )}
                            </div>
                            {isAdmin && (
                                <button onClick={() => handleDelete(group.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
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
                            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Add New Group</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer">
                                <IconX size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Program</label>
                                <select 
                                    required
                                    value={formData.program_id}
                                    onChange={(e) => setFormData({...formData, program_id: e.target.value})}
                                    className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full p-3 font-medium transition-colors"
                                >
                                    <option value="">Select a Program</option>
                                    {programs.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Group Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full p-3 font-medium transition-colors"
                                    placeholder="e.g. Computer Science Group A"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Level</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.level}
                                    onChange={(e) => setFormData({...formData, level: e.target.value})}
                                    className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full p-3 font-medium transition-colors"
                                    placeholder="e.g. Level 200"
                                />
                            </div>
                            
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-50 dark:bg-slate-900/50 transition-colors cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 py-3 px-4 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors cursor-pointer">
                                    Save Group
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentGroupList;
