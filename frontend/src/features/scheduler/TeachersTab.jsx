import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { Panel, Button, Input, Select, Badge, Note } from './ui';
import { SKILLS, errorMessage } from './constants';

// Heavy subjects, and what each teacher can teach and how much.
const TeachersTab = ({ setup, reload }) => {
    const [drafts, setDrafts] = useState({});
    const [savingId, setSavingId] = useState(null);

    useEffect(() => {
        setDrafts(Object.fromEntries(setup.teachers.map((t) => [t.id, {
            maxPerWeek: t.maxPerWeek,
            maxPerDay: t.maxPerDay,
            skills: Object.fromEntries(t.subjects.map((s) => [s.courseId, s.proficiency])),
        }])));
    }, [setup.teachers]);

    const toggleHeavy = async (subject) => {
        try {
            await api.put(`/scheduler/subjects/${subject.id}`, { is_heavy: !subject.is_heavy });
            await reload();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not update the subject'));
        }
    };

    const update = (teacherId, patch) => setDrafts({ ...drafts, [teacherId]: { ...drafts[teacherId], ...patch } });
    const setSkill = (teacherId, courseId, value) => update(teacherId, { skills: { ...drafts[teacherId].skills, [courseId]: Number(value) } });

    const save = async (teacher) => {
        const d = drafts[teacher.id];
        setSavingId(teacher.id);
        try {
            await api.put(`/scheduler/teachers/${teacher.id}`, {
                maxPerWeek: Number(d.maxPerWeek),
                maxPerDay: Number(d.maxPerDay),
                subjects: Object.entries(d.skills).filter(([, level]) => level > 0).map(([courseId, proficiency]) => ({ courseId: Number(courseId), proficiency })),
            });
            toast.success(`Saved ${teacher.name}`);
            await reload();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not save the teacher'));
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <Panel title="Subjects" subtitle="Heavy subjects (e.g. Maths, Science) are kept in the morning and limited to two a day per class. Click to switch.">
                {setup.subjects.length === 0 ? <Note>No subjects yet. Add them on the Courses page.</Note> : (
                    <div className="flex flex-wrap gap-2">
                        {setup.subjects.map((s) => (
                            <button key={s.id} type="button" onClick={() => toggleHeavy(s)} aria-pressed={s.is_heavy}
                                className={`px-3 py-1.5 rounded-full border text-sm font-semibold transition-colors cursor-pointer ${s.is_heavy
                                    ? 'bg-primary-600 border-primary-600 text-white'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-300'}`}>
                                {s.name}{s.is_heavy ? ' · heavy' : ''}
                            </button>
                        ))}
                    </div>
                )}
            </Panel>

            <Panel title="Teachers" subtitle="Skill per subject: 1 can teach, 2 good, 3 specialist. The generator prefers stronger and less busy teachers.">
                {setup.teachers.length === 0 ? <Note>No active lecturers yet.</Note> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-xs uppercase tracking-wide whitespace-nowrap text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                    <th className="py-2 pr-3 font-semibold sticky left-0 bg-white dark:bg-slate-800">Teacher</th>
                                    <th className="py-2 pr-3 font-semibold">Max / week</th>
                                    <th className="py-2 pr-3 font-semibold">Max / day</th>
                                    {setup.subjects.map((s) => <th key={s.id} className="py-2 pr-3 font-semibold">{s.name}</th>)}
                                    <th className="py-2" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                {setup.teachers.map((t) => {
                                    const d = drafts[t.id];
                                    if (!d) return null;
                                    const skilled = Object.values(d.skills).filter((v) => v > 0).length;
                                    return (
                                        <tr key={t.id} className="align-middle">
                                            <td className="py-2 pr-3 sticky left-0 bg-white dark:bg-slate-800">
                                                <p className="font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">{t.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{t.department}{skilled === 0 && <> · <Badge tone="amber">no subjects</Badge></>}</p>
                                            </td>
                                            <td className="py-2 pr-3"><Input type="number" min={1} max={60} className="w-20" aria-label="Max periods per week" value={d.maxPerWeek} onChange={(e) => update(t.id, { maxPerWeek: e.target.value })} /></td>
                                            <td className="py-2 pr-3"><Input type="number" min={1} max={12} className="w-16" aria-label="Max periods per day" value={d.maxPerDay} onChange={(e) => update(t.id, { maxPerDay: e.target.value })} /></td>
                                            {setup.subjects.map((s) => (
                                                <td key={s.id} className="py-2 pr-3">
                                                    <Select className="w-32" aria-label={`${t.name} – ${s.name}`} value={d.skills[s.id] || 0} onChange={(e) => setSkill(t.id, s.id, e.target.value)}>
                                                        {SKILLS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                                                    </Select>
                                                </td>
                                            ))}
                                            <td className="py-2"><Button variant="primary" disabled={savingId === t.id} onClick={() => save(t)}>{savingId === t.id ? 'Saving…' : 'Save'}</Button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>
        </div>
    );
};

export default TeachersTab;
