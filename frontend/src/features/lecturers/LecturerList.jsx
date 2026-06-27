import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { IconSearch, IconPlus, IconTrash, IconUser, IconX, IconEdit, IconUpload, IconFileSpreadsheet } from '@tabler/icons-react';
import toast from 'react-hot-toast';

const LecturerList = () => {
    const [lecturers, setLecturers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editLecturerId, setEditLecturerId] = useState(null);
    const [formData, setFormData] = useState({ email: '', password: '', department: '', hireDate: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Bulk Upload state
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [csvFile, setCsvFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => { fetchLecturers(); }, []);

    const fetchLecturers = async () => {
        try {
            const response = await api.get('/lecturers');
            setLecturers(response.data);
        } catch (error) {
            toast.error('Failed to load lecturers');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (lecturer = null) => {
        if (lecturer) {
            setEditLecturerId(lecturer.id);
            setFormData({
                email: lecturer.email,
                password: '', // Hidden/ignored on edit
                department: lecturer.department,
                hireDate: lecturer.hire_date ? lecturer.hire_date.split('T')[0] : ''
            });
        } else {
            setEditLecturerId(null);
            setFormData({ email: '', password: '', department: '', hireDate: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editLecturerId) {
                const payload = { ...formData };
                delete payload.password;
                await api.put(`/lecturers/${editLecturerId}`, payload);
                toast.success('Lecturer updated successfully');
            } else {
                await api.post('/lecturers', formData);
                toast.success('Lecturer added successfully');
            }
            setIsModalOpen(false);
            setFormData({ email: '', password: '', department: '', hireDate: '' });
            fetchLecturers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save lecturer');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this lecturer?')) return;
        try {
            await api.delete(`/lecturers/${id}`);
            toast.success('Lecturer deleted');
            fetchLecturers();
        } catch (error) {
            toast.error('Failed to delete lecturer');
        }
    };

    const handleBulkUpload = async () => {
        if (!csvFile) return toast.error('Please select a CSV file');
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', csvFile);

        try {
            const response = await api.post('/lecturers/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(`${response.data.successful} lecturers uploaded successfully`);
            if (response.data.failed > 0) {
                toast.error(`${response.data.failed} lecturers failed to upload`);
                console.error('Failed uploads:', response.data.failedDetails);
            }
            setIsBulkModalOpen(false);
            setCsvFile(null);
            fetchLecturers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Bulk upload failed');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const filteredLecturers = lecturers.filter(t => 
        t.email.toLowerCase().includes(search.toLowerCase()) ||
        t.department.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-4 md:p-6 lg:p-10 w-full overflow-hidden box-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Lecturers</h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage teaching staff and departments.</p>
                </div>
                {isAdmin && (
                    <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={() => setIsBulkModalOpen(true)} className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-xl font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700">
                            <IconUpload size={20} />
                            <span className="hidden md:inline">Bulk Upload</span>
                        </button>
                        <button onClick={() => handleOpenModal()} className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-[#1B437C] hover:bg-[#122e5a] text-white px-5 py-3 rounded-xl font-bold transition-colors cursor-pointer shadow-sm">
                            <IconPlus size={20} />
                            Add Lecturer
                        </button>
                    </div>
                )}
            </div>


            {/* Bulk Upload Modal */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100 dark:border-slate-700/50 shadow-2xl">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Bulk Upload Lecturers</h2>
                            <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors cursor-pointer">
                                <IconX size={24} />
                            </button>
                        </div>
                        <div className="p-8">
                            <div className="mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                <h3 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2">
                                    <IconFileSpreadsheet size={18} />
                                    CSV Format Required
                                </h3>
                                <p className="text-xs text-blue-600/80 mb-2">Your CSV file must include these exact headers:</p>
                                <code className="block bg-white dark:bg-slate-800 px-3 py-2 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-200 border border-blue-100">
                                    Email, Department, Hire Date
                                </code>
                            </div>
                            
                            <div className="space-y-4">
                                <label className="block">
                                    <span className="sr-only">Choose CSV File</span>
                                    <input 
                                        type="file" 
                                        accept=".csv"
                                        ref={fileInputRef}
                                        onChange={(e) => setCsvFile(e.target.files[0])}
                                        className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-colors cursor-pointer"
                                    />
                                </label>
                                {csvFile && (
                                    <p className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        {csvFile.name} ready to upload
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => setIsBulkModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer">Cancel</button>
                            <button 
                                onClick={handleBulkUpload} 
                                disabled={!csvFile || isUploading} 
                                className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#1B437C] hover:bg-[#122e5a] transition-colors disabled:opacity-70 cursor-pointer flex items-center gap-2"
                            >
                                {isUploading ? (
                                    <>Uploading...</>
                                ) : (
                                    <>
                                        <IconUpload size={18} />
                                        Upload CSV
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-700/50">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                                {editLecturerId ? 'Edit Lecturer' : 'Add New Lecturer'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors cursor-pointer">
                                <IconX size={24} />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto">
                            <form id="lecturerForm" onSubmit={handleSubmit} className="flex flex-col gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Email Address</label>
                                    <input required type="email" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-[#1B437C] outline-none font-medium text-slate-800 dark:text-slate-100" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                                {!editLecturerId && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Initial Password</label>
                                        <input required type="password" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-[#1B437C] outline-none font-medium text-slate-800 dark:text-slate-100" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Department</label>
                                    <input required type="text" placeholder="e.g. Mathematics" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-[#1B437C] outline-none font-medium text-slate-800 dark:text-slate-100" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Hire Date</label>
                                    <input required type="date" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-[#1B437C] outline-none font-medium text-slate-800 dark:text-slate-100" value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} />
                                </div>
                            </form>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer">Cancel</button>
                            <button form="lecturerForm" type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#1B437C] hover:bg-[#122e5a] transition-colors disabled:opacity-70 cursor-pointer">
                                {isSubmitting ? 'Saving...' : (editLecturerId ? 'Update Lecturer' : 'Save Lecturer')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass rounded-2xl md:rounded-3xl overflow-hidden">
                <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                    <div className="relative w-full max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <IconSearch size={20} />
                        </div>
                        <input type="text" placeholder="Search lecturers..." value={search} onChange={(e) => setSearch(e.target.value)} className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-xl outline-none transition-all text-sm font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400" />
                    </div>
                </div>

                {/* DESKTOP TABLE VIEW */}
                <div className="hidden md:block overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                                <th className="px-6 py-4">Lecturer</th>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Hire Date</th>
                                <th className="px-6 py-4">Status</th>
                                {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700 dark:text-slate-200">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
                            ) : filteredLecturers.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400">No lecturers found.</td></tr>
                            ) : (
                                filteredLecturers.map(lecturer => (
                                    <tr key={lecturer.id} className="hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                                                <IconUser size={20} />
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-slate-100">{lecturer.email}</span>
                                        </td>
                                        <td className="px-6 py-4">{lecturer.department}</td>
                                        <td className="px-6 py-4">{lecturer.hire_date ? new Date(lecturer.hire_date).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${lecturer.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {lecturer.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleOpenModal(lecturer)} className="p-2 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors cursor-pointer mr-2">
                                                    <IconEdit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(lecturer.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"><IconTrash size={18} /></button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* MOBILE CARD VIEW */}
                <div className="md:hidden grid grid-cols-1 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50">
                    {loading ? (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">Loading...</div>
                    ) : filteredLecturers.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">No lecturers found.</div>
                    ) : (
                        filteredLecturers.map(lecturer => (
                            <div key={lecturer.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 pb-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                                        <IconUser size={20} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-base">{lecturer.email}</p>
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{lecturer.department}</p>
                                    </div>
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-300 mb-4 flex justify-between">
                                    <span className="font-semibold text-slate-400">Hired</span>
                                    <span>{lecturer.hire_date ? new Date(lecturer.hire_date).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                {isAdmin && (
                                    <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-700/50 pt-3 mt-1">
                                        <button onClick={() => handleOpenModal(lecturer)} className="px-4 py-2 text-sm font-bold text-primary-600 bg-primary-50 rounded-lg cursor-pointer">Edit</button>
                                        <button onClick={() => handleDelete(lecturer.id)} className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 rounded-lg cursor-pointer">Delete</button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default LecturerList;
