import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { IconPlus, IconTrash, IconStar } from '@tabler/icons-react';
import api from '../../utils/api';
import { Panel, Button, Input, Select, Label, Badge, Note } from './ui';
import { errorMessage } from './constants';

const blankTerm = { name: '', start_date: '', end_date: '', is_current: true };
const blankExam = { name: '', start_date: '', end_date: '', alert_days: '14,7,1', audience: 'ALL' };
const hhmm = (t) => String(t || '').slice(0, 5);

// Terms, exam weeks (with advance alerts) and the bell schedule.
const CalendarTab = ({ setup, reload }) => {
    const [terms, setTerms] = useState([]);
    const [termForm, setTermForm] = useState(blankTerm);
    const [examForms, setExamForms] = useState({});
    const [bell, setBell] = useState([]);
    const [saving, setSaving] = useState(false);

    const loadTerms = () => api.get('/terms').then((res) => setTerms(res.data)).catch(() => toast.error('Failed to load terms'));
    useEffect(() => { loadTerms(); }, []);
    useEffect(() => {
        setBell(setup.bell.map((p) => ({ label: p.label, start_time: hhmm(p.start_time), end_time: hhmm(p.end_time), kind: p.kind })));
    }, [setup.bell]);

    const act = async (fn, success) => {
        try {
            await fn();
            if (success) toast.success(success);
            await loadTerms();
            await reload();
        } catch (error) {
            toast.error(errorMessage(error, 'Something went wrong'));
        }
    };

    const addTerm = (e) => {
        e.preventDefault();
        act(async () => { await api.post('/terms', termForm); setTermForm(blankTerm); }, 'Term added');
    };

    const addExam = (termId) => (e) => {
        e.preventDefault();
        act(async () => {
            await api.post(`/terms/${termId}/exams`, examForms[termId] || blankExam);
            setExamForms({ ...examForms, [termId]: blankExam });
        }, 'Exam period added');
    };

    const setRow = (i, field, value) => setBell(bell.map((row, j) => (j === i ? { ...row, [field]: value } : row)));
    const addRow = (kind) => {
        const last = bell[bell.length - 1];
        const start = last?.end_time || '08:00';
        const [h, m] = start.split(':').map(Number);
        const minutes = h * 60 + m + (kind === 'BREAK' ? 30 : 45);
        const end = `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
        const lessons = bell.filter((r) => r.kind === 'LESSON').length;
        setBell([...bell, { label: kind === 'BREAK' ? 'Break' : `Period ${lessons + 1}`, start_time: start, end_time: end, kind }]);
    };

    const saveBell = async () => {
        setSaving(true);
        try {
            await api.put('/scheduler/bell', { periods: bell });
            toast.success('Bell schedule saved');
            await reload();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not save the bell schedule'));
        } finally {
            setSaving(false);
        }
    };

    const lessonCount = bell.filter((r) => r.kind === 'LESSON').length;

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="flex flex-col gap-6 min-w-0">
                <Panel title="Terms" subtitle="Allocations and timetables are made per term. The current term drives the 07:00 reminders.">
                    <form onSubmit={addTerm} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end mb-5">
                        <div className="sm:col-span-2"><Label>Name</Label><Input required placeholder="e.g. 2026/27 Term 1" value={termForm.name} onChange={(e) => setTermForm({ ...termForm, name: e.target.value })} /></div>
                        <div><Label>Starts</Label><Input required type="date" value={termForm.start_date} onChange={(e) => setTermForm({ ...termForm, start_date: e.target.value })} /></div>
                        <div><Label>Ends</Label><Input required type="date" value={termForm.end_date} onChange={(e) => setTermForm({ ...termForm, end_date: e.target.value })} /></div>
                        <label className="sm:col-span-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <input type="checkbox" checked={termForm.is_current} onChange={(e) => setTermForm({ ...termForm, is_current: e.target.checked })} />
                            Make this the current term
                        </label>
                        <Button type="submit" variant="primary"><IconPlus size={16} /> Add term</Button>
                    </form>

                    {terms.length === 0 ? <Note>No terms yet. Add the first one above.</Note> : (
                        <div className="flex flex-col gap-4">
                            {terms.map((term) => {
                                const form = examForms[term.id] || blankExam;
                                const setForm = (patch) => setExamForms({ ...examForms, [term.id]: { ...form, ...patch } });
                                return (
                                    <div key={term.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                    {term.name} {term.is_current && <Badge tone="green"><IconStar size={12} /> Current</Badge>}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{term.start_date} to {term.end_date}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {!term.is_current && <Button onClick={() => act(() => api.post(`/terms/${term.id}/current`), 'Current term updated')}>Make current</Button>}
                                                <Button variant="danger" aria-label={`Delete ${term.name}`} onClick={() => window.confirm(`Delete ${term.name}? Its exam periods, allocations and drafts go too; the live timetable stays.`) && act(() => api.delete(`/terms/${term.id}`), 'Term deleted')}><IconTrash size={16} /></Button>
                                            </div>
                                        </div>

                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Exam periods</p>
                                        {term.exams.length === 0 ? <Note>None yet.</Note> : (
                                            <ul className="divide-y divide-slate-100 dark:divide-slate-700/60 mb-3">
                                                {term.exams.map((exam) => (
                                                    <li key={exam.id} className="flex items-center justify-between gap-3 py-2">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{exam.name}</p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">{exam.start_date} to {exam.end_date} · alerts {exam.alert_days} days before · {exam.audience === 'ALL' ? 'students and lecturers' : exam.audience === 'STUDENT' ? 'students' : 'lecturers'}</p>
                                                        </div>
                                                        <Button variant="danger" aria-label={`Delete ${exam.name}`} onClick={() => act(() => api.delete(`/terms/exams/${exam.id}`), 'Exam period deleted')}><IconTrash size={14} /></Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        <form onSubmit={addExam(term.id)} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
                                            <div className="col-span-2"><Label>Exam name</Label><Input required placeholder="e.g. Mid-term exams" value={form.name} onChange={(e) => setForm({ name: e.target.value })} /></div>
                                            <div><Label>Starts</Label><Input required type="date" value={form.start_date} onChange={(e) => setForm({ start_date: e.target.value })} /></div>
                                            <div><Label>Ends</Label><Input required type="date" value={form.end_date} onChange={(e) => setForm({ end_date: e.target.value })} /></div>
                                            <div><Label>Alert days before</Label><Input value={form.alert_days} onChange={(e) => setForm({ alert_days: e.target.value })} /></div>
                                            <div><Label>Who</Label>
                                                <Select value={form.audience} onChange={(e) => setForm({ audience: e.target.value })}>
                                                    <option value="ALL">Everyone</option><option value="STUDENT">Students</option><option value="LECTURER">Lecturers</option>
                                                </Select>
                                            </div>
                                            <Button type="submit" className="col-span-2 sm:col-span-6 sm:justify-self-end"><IconPlus size={16} /> Add exam period</Button>
                                        </form>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Panel>
            </div>

            <Panel
                title="Bell schedule"
                subtitle={`The school day, Monday to Friday. ${lessonCount} lesson periods a day = ${lessonCount * 5} a week.`}
                action={<Button variant="primary" disabled={saving || bell.length === 0} onClick={saveBell}>{saving ? 'Saving…' : 'Save bell schedule'}</Button>}
            >
                {bell.length === 0 && <Note>No periods yet. Add lessons and breaks in order.</Note>}
                <div className="flex flex-col gap-2">
                    {bell.map((row, i) => (
                        <div key={i} className={`grid grid-cols-12 gap-2 items-center rounded-lg p-2 ${row.kind === 'BREAK' ? 'bg-amber-50/60 dark:bg-amber-500/5' : ''}`}>
                            <Input className="col-span-4" aria-label="Label" value={row.label} onChange={(e) => setRow(i, 'label', e.target.value)} />
                            <Input className="col-span-3" aria-label="Start" type="time" value={row.start_time} onChange={(e) => setRow(i, 'start_time', e.target.value)} />
                            <Input className="col-span-3" aria-label="End" type="time" value={row.end_time} onChange={(e) => setRow(i, 'end_time', e.target.value)} />
                            <div className="col-span-2 flex justify-end gap-1">
                                <Badge tone={row.kind === 'BREAK' ? 'amber' : 'blue'}>{row.kind === 'BREAK' ? 'Break' : 'Lesson'}</Badge>
                                <button type="button" aria-label="Remove row" className="text-slate-400 hover:text-red-600 p-1 cursor-pointer" onClick={() => setBell(bell.filter((_, j) => j !== i))}><IconTrash size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 mt-4">
                    <Button onClick={() => addRow('LESSON')}><IconPlus size={16} /> Lesson period</Button>
                    <Button onClick={() => addRow('BREAK')}><IconPlus size={16} /> Break</Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">Changing the bell schedule after generating means generating again before you publish.</p>
            </Panel>
        </div>
    );
};

export default CalendarTab;
