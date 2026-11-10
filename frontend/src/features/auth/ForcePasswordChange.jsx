import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { IconLock } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const MIN_PASSWORD_LENGTH = 12;

const inputClass = 'w-full px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-semibold text-slate-700 dark:text-slate-200';

// Shown after logging in with a temporary password. The API refuses every
// other request until the password is changed.
const ForcePasswordChange = () => {
    const { user, loading, refreshUser, logout } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [saving, setSaving] = useState(false);

    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    if (!user.mustChangePassword) return <Navigate to="/admin" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.newPassword !== form.confirmPassword) return toast.error('New passwords do not match.');
        if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
            return toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        }
        setSaving(true);
        try {
            await api.put('/users/security/password', {
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
            });
            const updated = await refreshUser();
            toast.success('Password updated. Welcome!');
            navigate(updated?.role === 'GATEKEEPER' ? '/gatekeeper' : '/admin', { replace: true });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update password.');
        } finally {
            setSaving(false);
        }
    };

    const field = (key, label) => (
        <div>
            <label htmlFor={key} className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{label}</label>
            <input
                id={key}
                type="password"
                required
                autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'}
                value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                className={inputClass}
            />
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
                <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center mb-5">
                    <IconLock className="text-primary-600" size={22} />
                </div>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Set a new password</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
                    You signed in with a temporary password. Choose your own password (at least {MIN_PASSWORD_LENGTH} characters) to continue.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {field('currentPassword', 'Temporary password')}
                    {field('newPassword', 'New password')}
                    {field('confirmPassword', 'Confirm new password')}
                    <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm disabled:opacity-60">
                        {saving ? 'Updating...' : 'Update password'}
                    </button>
                </form>
                <button type="button" onClick={logout} className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    Sign out
                </button>
            </div>
        </div>
    );
};

export default ForcePasswordChange;
