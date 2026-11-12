import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { IconLockOpen, IconLock } from '@tabler/icons-react';
import api from '../../utils/api';

// For super admin and admin: release each term's results to students (and set
// how much class work counts). They never see named results themselves.
const ResultsRelease = () => {
    const [terms, setTerms] = useState([]);
    const [weights, setWeights] = useState({});
    const [busy, setBusy] = useState(null);

    const load = () => api.get('/terms').then(({ data }) => {
        setTerms(data);
        setWeights(Object.fromEntries(data.map((t) => [t.id, t.ca_weight])));
    }).catch(() => toast.error('Could not load terms'));

    useEffect(() => { load(); }, []);

    const update = async (term, released) => {
        if (released && !window.confirm(`Release ${term.name} results? Every student will be able to see and print their statement.`)) return;
        setBusy(term.id);
        try {
            const { data } = await api.post(`/terms/${term.id}/results`, { released, caWeight: Number(weights[term.id]) });
            toast.success(data.message);
            await load();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not update the term');
        } finally {
            setBusy(null);
        }
    };

    if (!terms.length) return null;

    return (
        <section className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm mb-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Release results to students</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">Students see their semester statement only after you release the term. Class work and exam weights apply to every subject in that term.</p>
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {terms.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.name}{t.is_current ? ' (current)' : ''}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{t.start_date} to {t.end_date}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                Class work
                                <input type="number" min={0} max={100} value={weights[t.id] ?? 30} disabled={t.results_released}
                                    onChange={(e) => setWeights({ ...weights, [t.id]: e.target.value })}
                                    className="w-16 px-2 py-1.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 disabled:opacity-60" />
                                % · exam {100 - (Number(weights[t.id]) || 0)}%
                            </label>
                            {t.results_released ? (
                                <>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"><IconLockOpen size={14} /> Released</span>
                                    <button type="button" disabled={busy === t.id} onClick={() => update(t, false)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50">Withdraw</button>
                                </>
                            ) : (
                                <>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"><IconLock size={14} /> Not released</span>
                                    <button type="button" disabled={busy === t.id} onClick={() => update(t, true)} className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-50">Release</button>
                                </>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default ResultsRelease;
