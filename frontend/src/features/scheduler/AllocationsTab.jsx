import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { IconPlus, IconTrash, IconCopy } from '@tabler/icons-react';
import api from '../../utils/api';
import { Panel, Button, Input, Select, Label, Badge, Note } from './ui';
import { errorMessage } from './constants';

// Per term: the subjects each class takes, periods a week, and an optional fixed teacher.
const AllocationsTab = ({ setup, reload }) => {
    const [classId, setClassId] = useState('');
    const [rows, setRows] = useState([]);
    const [copyTo, setCopyTo] = useState([]);
    const [saving, setSaving] = useState(false);

    const weekly = setup.bell.filter((p) => p.kind === 'LESSON').length * 5;
    const selected = setup.classes.find((c) => String(c.id) === String(classId));
    const allocationsByClass = useMemo(() => setup.allocations.reduce((map, a) => {
        (map[a.student_group_id] = map[a.student_group_id] || []).push(a);
        return map;
    }, {}), [setup.allocations]);

    useEffect(() => {
        if (!classId && setup.classes.length) setClassId(String(setup.classes[0].id));
    }, [setup.classes, classId]);

    useEffect(() => {
        const current = allocationsByClass[classId] || [];
        setRows(current.map((a) => ({ courseId: String(a.course_id), periodsPerWeek: a.periods_per_week, lecturerId: a.lecturer_id ? String(a.lecturer_id) : '' })));
        const peers = setup.classes.filter((c) => String(c.id) !== String(classId) && c.level && c.level === selected?.level);
        setCopyTo(peers.map((c) => c.id));
    }, [classId, allocationsByClass, setup.classes, selected?.level]);

    if (!setup.termId) return <Panel><Note>Add a term on the Calendar tab first.</Note></Panel>;
    if (setup.classes.length === 0) return <Panel><Note>Create classes on the Classes page first.</Note></Panel>;

    const total = rows.reduce((sum, r) => sum + (Number(r.periodsPerWeek) || 0), 0);
    const used = new Set(rows.map((r) => r.courseId));
    const qualified = (courseId) => setup.teachers.filter((t) => t.subjects.some((s) => String(s.courseId) === String(courseId)));
    const setRow = (i, patch) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    const otherClasses = setup.classes.filter((c) => String(c.id) !== String(classId));

    const save = async () => {
        setSaving(true);
        try {
            await api.put(`/scheduler/allocations/${classId}`, {
                termId: setup.termId,
                items: rows.filter((r) => r.courseId).map((r) => ({ courseId: Number(r.courseId), periodsPerWeek: Number(r.periodsPerWeek), lecturerId: r.lecturerId ? Number(r.lecturerId) : null })),
            });
            toast.success(`Saved subjects for ${selected?.name}`);
            await reload();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not save'));
        } finally {
            setSaving(false);
        }
    };

    const copy = async () => {
        if (!copyTo.length) return;
        const names = setup.classes.filter((c) => copyTo.includes(c.id)).map((c) => c.name).join(', ');
        if (!window.confirm(`Replace the subjects of ${names} with those of ${selected?.name}? Fixed teachers are not copied.`)) return;
        try {
            await api.post('/scheduler/allocations/copy', { termId: setup.termId, fromGroupId: Number(classId), toGroupIds: copyTo });
            toast.success('Copied');
            await reload();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not copy'));
        }
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <Panel title="Classes" subtitle="Periods allocated this term">
                <ul className="flex flex-col gap-1">
                    {setup.classes.map((c) => {
                        const periods = (allocationsByClass[c.id] || []).reduce((s, a) => s + a.periods_per_week, 0);
                        const active = String(c.id) === String(classId);
                        return (
                            <li key={c.id}>
                                <button type="button" onClick={() => setClassId(String(c.id))}
                                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-left cursor-pointer ${active ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                    <span className="truncate">{c.name}</span>
                                    {periods > 0 ? <Badge tone="blue">{periods}</Badge> : <Badge tone="amber">none</Badge>}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </Panel>

            <div className="xl:col-span-3 flex flex-col gap-6">
                <Panel
                    title={`${selected?.name || ''} – subjects this term`}
                    subtitle={`${total} of ${weekly || '?'} periods a week used. Leave the teacher on "Auto" and the generator picks the best available one.`}
                    action={<Button variant="primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save subjects'}</Button>}
                >
                    {weekly > 0 && total > weekly && <p className="mb-3"><Badge tone="red">More periods than the week has ({weekly})</Badge></p>}
                    {rows.length === 0 && <Note>No subjects yet for this class.</Note>}
                    <div className="flex flex-col gap-2">
                        {rows.map((row, i) => {
                            const teachers = qualified(row.courseId);
                            return (
                                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-12 sm:col-span-5"><Label>Subject</Label>
                                        <Select value={row.courseId} onChange={(e) => setRow(i, { courseId: e.target.value, lecturerId: '' })}>
                                            <option value="">Choose…</option>
                                            {setup.subjects.filter((s) => !used.has(String(s.id)) || String(s.id) === row.courseId).map((s) => (
                                                <option key={s.id} value={s.id}>{s.name}{s.is_heavy ? ' (heavy)' : ''}</option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className="col-span-4 sm:col-span-2"><Label>Periods / week</Label>
                                        <Input type="number" min={1} max={15} value={row.periodsPerWeek} onChange={(e) => setRow(i, { periodsPerWeek: e.target.value })} />
                                    </div>
                                    <div className="col-span-6 sm:col-span-4"><Label>Teacher</Label>
                                        <Select value={row.lecturerId} onChange={(e) => setRow(i, { lecturerId: e.target.value })}>
                                            <option value="">Auto ({teachers.length} qualified)</option>
                                            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </Select>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1 flex justify-end">
                                        <button type="button" aria-label="Remove subject" className="p-2 text-slate-400 hover:text-red-600 cursor-pointer" onClick={() => setRows(rows.filter((_, j) => j !== i))}><IconTrash size={18} /></button>
                                    </div>
                                    {row.courseId && teachers.length === 0 && (
                                        <p className="col-span-12 -mt-1"><Badge tone="amber">No teacher has this subject yet (Subjects &amp; teachers tab)</Badge></p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <Button className="mt-4" onClick={() => setRows([...rows, { courseId: '', periodsPerWeek: 3, lecturerId: '' }])}><IconPlus size={16} /> Add subject</Button>
                </Panel>

                {otherClasses.length > 0 && (
                    <Panel title="Copy to other classes" subtitle="Give other streams the same subjects and periods (save first). Classes of the same level are ticked.">
                        <div className="flex flex-wrap gap-x-5 gap-y-2 mb-4">
                            {otherClasses.map((c) => (
                                <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                    <input type="checkbox" checked={copyTo.includes(c.id)}
                                        onChange={(e) => setCopyTo(e.target.checked ? [...copyTo, c.id] : copyTo.filter((id) => id !== c.id))} />
                                    {c.name}
                                </label>
                            ))}
                        </div>
                        <Button disabled={!copyTo.length || !(allocationsByClass[classId] || []).length} onClick={copy}><IconCopy size={16} /> Copy to {copyTo.length} classes</Button>
                    </Panel>
                )}
            </div>
        </div>
    );
};

export default AllocationsTab;
