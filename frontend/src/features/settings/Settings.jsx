import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { fileUrl } from '../../utils/api';
import { 
    IconSettings, IconUserCircle, IconBell, IconShieldLock, 
    IconSun, IconMoon, IconTextDirectionLtr, IconTextDirectionRtl,
    IconMaximize, IconMinimize, IconLayoutSidebar, IconLayoutSidebarRightCollapse,
    IconCheck
} from '@tabler/icons-react';
import toast from 'react-hot-toast';

const Settings = () => {
    const { user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState('system');

    const getAvatarUrl = () => {
        if (user?.profileImageUrl) {
            return fileUrl(user.profileImageUrl);
        }
        if (user?.role === 'STUDENT') {
            const gender = user?.gender?.toLowerCase() === 'female' ? 'girl' : 'boy';
            const nameParam = user?.name ? user.name.replace(' ', '+') : 'Student';
            return `https://avatar.iran.liara.run/public/${gender}?username=${nameParam}`;
        }
        return `https://ui-avatars.com/api/?name=${user?.email}&background=6366f1&color=fff&size=128`;
    };

    // UI States for System Preferences
    const [themeOption, setThemeOption] = useState('light');
    const [themeDirection, setThemeDirection] = useState('ltr');
    const [themeColor, setThemeColor] = useState('blue');
    const [containerOption, setContainerOption] = useState('boxed');
    const [sidebarType, setSidebarType] = useState('full');
    
    // UI States for Notifications
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(false);

    // Password Form State
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [isSaving, setIsSaving] = useState(false);

    // Load preferences on mount
    useEffect(() => {
        if (user?.preferences) {
            setThemeOption(user.preferences.themeOption || 'light');
            setThemeDirection(user.preferences.themeDirection || 'ltr');
            setThemeColor(user.preferences.themeColor || 'blue');
            setContainerOption(user.preferences.containerOption || 'boxed');
            setSidebarType(user.preferences.sidebarType || 'full');
            setEmailAlerts(user.preferences.emailAlerts ?? true);
            setPushNotifications(user.preferences.pushNotifications ?? false);
        }
    }, [user]);

    const handleSavePreferences = async () => {
        setIsSaving(true);
        try {
            const preferences = {
                themeOption,
                themeDirection,
                themeColor,
                containerOption,
                sidebarType,
                emailAlerts,
                pushNotifications
            };
            await api.put('/users/preferences', preferences);
            await refreshUser();
            toast.success("Preferences saved successfully!");
        } catch (error) {
            toast.error("Failed to save preferences.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return toast.error("New passwords do not match.");
        }
        if (passwordForm.newPassword.length < 6) {
            return toast.error("Password must be at least 6 characters.");
        }
        
        setIsSaving(true);
        try {
            await api.put('/users/security/password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });
            toast.success("Password updated successfully!");
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update password.");
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile Settings', icon: <IconUserCircle size={22} /> },
        { id: 'notifications', label: 'Notifications', icon: <IconBell size={22} /> },
        { id: 'security', label: 'Security', icon: <IconShieldLock size={22} /> },
        { id: 'system', label: 'System Preferences', icon: <IconSettings size={22} /> },
    ];

    const themeColors = [
        { id: 'blue', hex: '#1d4ed8' },
        { id: 'lightBlue', hex: '#0284c7' },
        { id: 'purple', hex: '#6b21a8' },
        { id: 'teal', hex: '#0f766e' },
        { id: 'cyan', hex: '#06b6d4' },
        { id: 'orange', hex: '#f97316' },
    ];

    return (
        <div className="page ">
            <div className="mb-10">
                <h1 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">Settings</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage your account preferences and system settings.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1 flex flex-col gap-2">
                    {tabs.map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-semibold border transition-colors cursor-pointer ${
                                activeTab === tab.id 
                                ? 'bg-white dark:bg-slate-800 shadow-sm shadow-primary-100 text-primary-600 border-white dark:border-slate-700/50' 
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:bg-slate-800/60 border-transparent'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Main Settings Content */}
                <div className="lg:col-span-2">
                    {activeTab === 'profile' && (
                        <div className="glass p-8 rounded-3xl shadow-sm">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">Profile Information</h2>
                            
                            <div className="flex items-center gap-6 mb-8">
                                <img 
                                    src={getAvatarUrl()} 
                                    alt="Profile" 
                                    className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-700/50 shadow-md object-cover"
                                />
                                <div>
                                    <button onClick={() => toast("Avatar upload coming soon!", { icon: "📸" })} className="px-5 py-2.5 bg-primary-50 text-primary-700 font-semibold rounded-xl hover:bg-primary-100 transition-colors text-sm cursor-pointer">
                                        Change Avatar
                                    </button>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-3">JPG, GIF or PNG. Max size of 800K</p>
                                </div>
                            </div>

                            <form className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Role</label>
                                        <input type="text" disabled value={user?.role || ''} className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Email Address</label>
                                        <input type="email" disabled value={user?.email || ''} className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                                    </div>
                                </div>
                                
                                <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-3">
                                    <button type="button" className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:bg-slate-800/60 transition-colors cursor-pointer">Discard</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="glass p-8 rounded-3xl shadow-sm">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">Notification Preferences</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                    <div>
                                        <h3 className="font-semibold text-slate-700 dark:text-slate-200">Email Alerts</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Receive weekly system summaries.</p>
                                    </div>
                                    <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} className="w-5 h-5 accent-primary-600 cursor-pointer" />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                    <div>
                                        <h3 className="font-semibold text-slate-700 dark:text-slate-200">Push Notifications</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Get real-time alerts in the browser.</p>
                                    </div>
                                    <input type="checkbox" checked={pushNotifications} onChange={(e) => setPushNotifications(e.target.checked)} className="w-5 h-5 accent-primary-600 cursor-pointer" />
                                </div>
                                <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-3">
                                    <button type="button" disabled={isSaving} onClick={handleSavePreferences} className="px-6 py-2.5 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm cursor-pointer disabled:opacity-70">
                                        {isSaving ? 'Saving...' : 'Save Preferences'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="glass p-8 rounded-3xl shadow-sm">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">Security Settings</h2>
                            <form onSubmit={handleUpdatePassword} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Current Password</label>
                                    <input type="password" required value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} placeholder="••••••••" className="w-full px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-semibold text-slate-700 dark:text-slate-200" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">New Password</label>
                                        <input type="password" required value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} placeholder="••••••••" className="w-full px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-semibold text-slate-700 dark:text-slate-200" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Confirm Password</label>
                                        <input type="password" required value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} placeholder="••••••••" className="w-full px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-sm font-semibold text-slate-700 dark:text-slate-200" />
                                    </div>
                                </div>
                                <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-3">
                                    <button type="submit" disabled={isSaving} className="px-6 py-2.5 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm cursor-pointer disabled:opacity-70">
                                        {isSaving ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'system' && (
                        <div className="glass p-8 rounded-3xl shadow-sm">
                            
                            <div className="space-y-8">
                                
                                {/* Theme Option */}
                                <div>
                                    <h3 className="text-slate-800 dark:text-slate-100 font-semibold mb-3">Theme Option</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => setThemeOption('light')}
                                            className={`flex items-center justify-center gap-2 py-3 rounded-xl border ${themeOption === 'light' ? 'bg-primary-100 text-primary-700 border-primary-200' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-900/50'}`}
                                        >
                                            <IconSun size={20} /> Light
                                        </button>
                                        <button 
                                            onClick={() => setThemeOption('dark')}
                                            className={`flex items-center justify-center gap-2 py-3 rounded-xl border ${themeOption === 'dark' ? 'bg-primary-100 text-primary-700 border-primary-200' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-900/50'}`}
                                        >
                                            <IconMoon size={20} /> Dark
                                        </button>
                                    </div>
                                </div>

                                {/* Theme Direction */}
                                <div>
                                    <h3 className="text-slate-800 dark:text-slate-100 font-semibold mb-3">Theme Direction</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => setThemeDirection('ltr')}
                                            className={`flex items-center justify-center gap-2 py-3 rounded-xl border ${themeDirection === 'ltr' ? 'bg-primary-100 text-primary-700 border-primary-200' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-900/50'}`}
                                        >
                                            <IconTextDirectionLtr size={20} /> LTR
                                        </button>
                                        <button 
                                            onClick={() => setThemeDirection('rtl')}
                                            className={`flex items-center justify-center gap-2 py-3 rounded-xl border ${themeDirection === 'rtl' ? 'bg-primary-100 text-primary-700 border-primary-200' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-900/50'}`}
                                        >
                                            <IconTextDirectionRtl size={20} /> RTL
                                        </button>
                                    </div>
                                </div>

                                {/* Theme Colors */}
                                <div>
                                    <h3 className="text-slate-800 dark:text-slate-100 font-semibold mb-3">Theme Colors</h3>
                                    <div className="flex flex-wrap gap-4">
                                        {themeColors.map(color => (
                                            <button
                                                key={color.id}
                                                onClick={() => setThemeColor(color.id)}
                                                className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center hover:border-slate-300 transition-colors cursor-pointer"
                                            >
                                                <div 
                                                    className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                                                    style={{ backgroundColor: color.hex }}
                                                >
                                                    {themeColor === color.id && <IconCheck size={14} stroke={3} />}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Container Option */}
                                <div>
                                    <h3 className="text-slate-800 dark:text-slate-100 font-semibold mb-3">Container Option</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => setContainerOption('boxed')}
                                            className={`flex items-center justify-center gap-2 py-3 rounded-xl border ${containerOption === 'boxed' ? 'bg-primary-100 text-primary-700 border-primary-200' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-900/50'}`}
                                        >
                                            <IconMinimize size={20} /> Boxed
                                        </button>
                                        <button 
                                            onClick={() => setContainerOption('full')}
                                            className={`flex items-center justify-center gap-2 py-3 rounded-xl border ${containerOption === 'full' ? 'bg-primary-100 text-primary-700 border-primary-200' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-900/50'}`}
                                        >
                                            <IconMaximize size={20} /> Full
                                        </button>
                                    </div>
                                </div>

                                {/* Sidebar Type */}
                                <div>
                                    <h3 className="text-slate-800 dark:text-slate-100 font-semibold mb-3">Sidebar Type</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => setSidebarType('full')}
                                            className={`flex items-center justify-center gap-2 py-3 rounded-xl border ${sidebarType === 'full' ? 'bg-primary-100 text-primary-700 border-primary-200' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-900/50'}`}
                                        >
                                            <IconLayoutSidebar size={20} /> Full
                                        </button>
                                        <button 
                                            onClick={() => setSidebarType('collapse')}
                                            className={`flex items-center justify-center gap-2 py-3 rounded-xl border ${sidebarType === 'collapse' ? 'bg-primary-100 text-primary-700 border-primary-200' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-900/50'}`}
                                        >
                                            <IconLayoutSidebarRightCollapse size={20} /> Collapse
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-3">
                                    <button type="button" disabled={isSaving} onClick={handleSavePreferences} className="px-6 py-2.5 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm cursor-pointer disabled:opacity-70">
                                        {isSaving ? 'Saving...' : 'Save Preferences'}
                                    </button>
                                </div>

                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
