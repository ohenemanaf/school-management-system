import { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { IconSend, IconMail, IconAlertCircle, IconCheck, IconInfoCircle, IconSpeakerphone } from '@tabler/icons-react';

const BroadcastCenter = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [audience, setAudience] = useState('ALL');
    const [type, setType] = useState('INFO');
    const [sendEmail, setSendEmail] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await api.post('/notifications/broadcast', {
                title,
                message,
                audience,
                type,
                sendEmail
            });
            toast.success(`Broadcast sent successfully!${sendEmail ? ` (${response.data.emailCount} emails queued)` : ''}`);
            setTitle('');
            setMessage('');
            setSendEmail(false);
        } catch (error) {
            toast.error('Failed to send broadcast');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="page max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                        <IconSpeakerphone size={24} />
                    </div>
                    Broadcast Center
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Send announcements and notifications to users across the system.</p>
            </div>

            <div className="glass rounded-3xl p-8 border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[100px] rounded-full pointer-events-none"></div>
                
                <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Target Audience</label>
                            <select 
                                value={audience} 
                                onChange={(e) => setAudience(e.target.value)}
                                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-semibold text-slate-700 dark:text-slate-200"
                            >
                                <option value="ALL">Everyone in System</option>
                                <option value="STUDENT">All Students</option>
                                <option value="LECTURER">All Lecturers</option>
                                <option value="ADMIN">Administrators Only</option>
                            </select>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Message Type</label>
                            <select 
                                value={type} 
                                onChange={(e) => setType(e.target.value)}
                                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-semibold text-slate-700 dark:text-slate-200"
                            >
                                <option value="INFO">Information (Blue)</option>
                                <option value="SUCCESS">Success (Green)</option>
                                <option value="WARNING">Warning (Yellow)</option>
                                <option value="ALERT">Alert / Important (Red)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Message Title</label>
                        <input 
                            required
                            type="text" 
                            placeholder="e.g. End of Semester Examinations"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Detailed Message</label>
                        <textarea 
                            required
                            rows="5"
                            placeholder="Type your announcement here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 resize-y"
                        ></textarea>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${sendEmail ? 'bg-primary-100 text-primary-600' : 'bg-slate-200 text-slate-400'}`}>
                            <IconMail size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Send via Email</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Deliver this notification directly to users' inboxes</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-slate-700/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-800 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-primary-600/20 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <IconSend size={20} />
                            {isSubmitting ? 'Broadcasting...' : 'Broadcast Message'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BroadcastCenter;
