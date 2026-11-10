import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { IconCalendarCog } from '@tabler/icons-react';
import api from '../../utils/api';
import { Select } from './ui';
import CalendarTab from './CalendarTab';
import ClassesTab from './ClassesTab';
import TeachersTab from './TeachersTab';
import AllocationsTab from './AllocationsTab';
import GenerateTab from './GenerateTab';
import RemindersTab from './RemindersTab';

const TABS = [
    { id: 'calendar', label: '1. Calendar', component: CalendarTab },
    { id: 'classes', label: '2. Classes & streams', component: ClassesTab },
    { id: 'teachers', label: '3. Subjects & teachers', component: TeachersTab },
    { id: 'allocations', label: '4. Allocations', component: AllocationsTab },
    { id: 'generate', label: '5. Generate', component: GenerateTab },
    { id: 'reminders', label: '6. Reminders', component: RemindersTab },
];

// Timetable generator for super admin and admin: set up the term, then generate and publish.
const SchedulerPage = () => {
    const [tab, setTab] = useState(() => {
        try { return localStorage.getItem('scheduler.tab') || 'calendar'; } catch { return 'calendar'; }
    });
    const [termId, setTermId] = useState(null);
    const [setup, setSetup] = useState(null);

    const reload = useCallback(async () => {
        try {
            const { data } = await api.get('/scheduler/setup', { params: termId ? { term_id: termId } : {} });
            setSetup(data);
        } catch {
            toast.error('Failed to load the scheduler');
        }
    }, [termId]);

    useEffect(() => { reload(); }, [reload]);

    const choose = (id) => {
        setTab(id);
        try { localStorage.setItem('scheduler.tab', id); } catch { /* storage unavailable */ }
    };

    const Active = TABS.find((t) => t.id === tab)?.component || CalendarTab;

    return (
        <div className="page w-full box-border">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <IconCalendarCog size={28} className="text-primary-600" /> Timetable Generator
                    </h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Set up the term once, then let the generator build a clash-free timetable for every stream.</p>
                </div>
                {setup?.terms?.length > 0 && (
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        Term
                        <Select className="w-56" value={setup.termId || ''} onChange={(e) => setTermId(Number(e.target.value))}>
                            {setup.terms.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_current ? ' (current)' : ''}</option>)}
                        </Select>
                    </label>
                )}
            </div>

            <div className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200 dark:border-slate-700 mb-6" role="tablist">
                {TABS.map((t) => (
                    <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => choose(t.id)}
                        className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${tab === t.id
                            ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {!setup ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p> : <Active setup={setup} reload={reload} />}
        </div>
    );
};

export default SchedulerPage;
