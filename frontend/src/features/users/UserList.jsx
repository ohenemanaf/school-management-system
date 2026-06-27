import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { IconSearch, IconUser, IconTrash } from '@tabler/icons-react';
import toast from 'react-hot-toast';

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`/users/${id}`);
            toast.success('User deleted successfully');
            fetchUsers();
        } catch (error) {
            toast.error('Failed to delete user');
        }
    };

    const handleUserUpdate = async (id, field, value) => {
        try {
            await api.put(`/users/${id}`, { [field]: value });
            toast.success('User updated successfully');
            fetchUsers();
        } catch (error) {
            toast.error('Failed to update user');
        }
    };

    const filteredUsers = users.filter(u => 
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 lg:p-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">System Users</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage administrators, lecturers, and student accounts.</p>
                </div>
            </div>

            <div className="glass rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-white dark:bg-slate-800/40">
                    <div className="relative w-full max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <IconSearch size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all text-sm font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400"
                        />
                    </div>
                </div>

                {/* DESKTOP TABLE VIEW */}
                <div className="hidden md:block overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50 text-sm font-medium text-slate-700 dark:text-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-400">No users found.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-primary-50/30 transition-colors">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                                                <IconUser size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-slate-100">{user.email}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Joined {new Date(user.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select 
                                                value={user.role} 
                                                onChange={(e) => handleUserUpdate(user.id, 'role', e.target.value)}
                                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm cursor-pointer"
                                            >
                                                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                                                <option value="HEADMASTER">HEADMASTER</option>
                                                <option value="ADMIN">ADMIN</option>
                                                <option value="ACCOUNTANT">ACCOUNTANT</option>
                                                <option value="LIBRARIAN">LIBRARIAN</option>
                                                <option value="LECTURER">LECTURER</option>
                                                <option value="STUDENT">STUDENT</option>
                                                <option value="GATEKEEPER">GATEKEEPER</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select 
                                                value={user.is_active ? '1' : '0'} 
                                                onChange={(e) => handleUserUpdate(user.id, 'is_active', parseInt(e.target.value))}
                                                className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm cursor-pointer ${user.is_active ? 'text-emerald-700' : 'text-red-700'}`}
                                            >
                                                <option value="1">Active</option>
                                                <option value="0">Disabled</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleDelete(user.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer">
                                                <IconTrash size={18} />
                                            </button>
                                        </td>
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
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">No users found.</div>
                    ) : (
                        filteredUsers.map((user) => (
                            <div key={user.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 pb-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                                        <IconUser size={20} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-base">{user.email}</p>
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Joined {new Date(user.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-300 mb-4 flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-slate-400">Role</span>
                                        <select 
                                            value={user.role} 
                                            onChange={(e) => handleUserUpdate(user.id, 'role', e.target.value)}
                                            className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                                        >
                                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                                            <option value="HEADMASTER">HEADMASTER</option>
                                            <option value="ADMIN">ADMIN</option>
                                            <option value="ACCOUNTANT">ACCOUNTANT</option>
                                            <option value="LIBRARIAN">LIBRARIAN</option>
                                            <option value="LECTURER">LECTURER</option>
                                            <option value="STUDENT">STUDENT</option>
                                            <option value="GATEKEEPER">GATEKEEPER</option>
                                        </select>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-slate-400">Status</span>
                                        <select 
                                            value={user.is_active ? '1' : '0'} 
                                            onChange={(e) => handleUserUpdate(user.id, 'is_active', parseInt(e.target.value))}
                                            className={`bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none ${user.is_active ? 'text-emerald-700' : 'text-red-700'}`}
                                        >
                                            <option value="1">Active</option>
                                            <option value="0">Disabled</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-700/50 pt-3 mt-1">
                                    <button onClick={() => handleDelete(user.id)} className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 rounded-lg w-full">Delete</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserList;
