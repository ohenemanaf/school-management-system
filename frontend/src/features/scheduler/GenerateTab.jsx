import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { IconWand, IconRocket, IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import api from '../../utils/api';
import { Panel, Button, Input, Select, Label, Badge, Note } from './ui';
import { DAYS, errorMessage } from './constants';

const QUALITY_LABELS = {
    heavyAfternoon: 'Heavy subjects after the morning',
    heavyOverload: 'Days with more than two heavy subjects',
    subjectSameDay: 'Subjects repeated on the same day',
    roomTooSmall: 'Lessons in rooms that are too small',
    classGap: 'Free gaps in a class day',
    teacherGap: 'Free gaps in a teacher day',
    classImbalance: 'Uneven days for classes',
};

const hhmm = (t) => String(t || '').slice(0, 5);

// Run the generator, read the report, preview the week, publish.
const GenerateTab = ({ setup, reload }) => {
    const [run, setRun] = useState(null);
    const [busy, setBusy] = useState(false);
    const [seed, setSeed] = useState('');
    const [view, setView] = useState({ kind: 'class', id: '' });

    const names = useMemo(() => ({
        class: new Map(setup.classes.map((c) => [c.id, c.name])),
        subject: new Map(setup.subjects.map((s) => [s.id, s.name])),
        teacher: new Map(setup.teachers.map((t) => [t.id, t.name])),
    }), [setup]);

    const loadLatest = useCallback(async () => {
        if (!setup.termId) return;
        try {
            const { data: runs } = await api.get('/scheduler/runs', { params: { term_id: setup.termId } });
            if (runs.length) setRun((await api.get(`/scheduler/runs/${runs[0].id}`)).data);
            else setRun(null);
        } catch (error) {
            toast.error(errorMessage(error, 'Could not load timetable runs'));
        }
    }, [setup.termId]);

    useEffect(() => { loadLatest(); }, [loadLatest]);

    useEffect(() => {
        if (run?.lessons?.length && !view.id) setView({ kind: 'class', id: String(run.lessons[0].student_group_id) });
    }, [run, view.id]);

    if (!setup.termId) return <Panel><Note>Add a term on the Calendar tab first.</Note></Panel>;

    const term = setup.terms.find((t) => t.id === setup.termId);
    const allocated = new Set(setup.allocations.map((a) => a.student_group_id)).size;
    const lessonPeriods = setup.bell.filter((p) => p.kind === 'LESSON').length;
    const ready = lessonPeriods > 0 && allocated > 0 && setup.rooms.length > 0;

    const generate = async () => {
        setBusy(true);
        try {
            const { data } = await api.post('/scheduler/generate', { termId: setup.termId, ...(seed !== '' ? { seed: Number(seed) } : {}) });
            setRun(data);
            setView({ kind: 'class', id: data.lessons[0] ? String(data.lessons[0].student_group_id) : '' });
            const missing = data.required - data.placed;
            if (missing === 0) toast.success(`All ${data.placed} lessons placed`);
            else toast.error(`${missing} lessons could not be placed. See the report.`);
        } catch (error) {
            toast.error(errorMessage(error, 'Generation failed'));
        } finally {
            setBusy(false);
        }
    };

    const publish = async () => {
        const classes = new Set(run.lessons.map((l) => l.student_group_id)).size;
        if (!window.confirm(`Publish this timetable? It replaces the live timetable of ${classes} classes. Other classes are not touched.`)) return;
        setBusy(true);
        try {
            const { data } = await api.post(`/scheduler/runs/${run.id}/publish`);
            toast.success(data.message);
            await loadLatest();
            await reload();
        } catch (error) {
            toast.error(errorMessage(error, 'Could not publish'));
        } finally {
            setBusy(false);
        }
    };

    const report = run?.report || {};
    const missing = run ? run.required - run.placed : 0;
    const grid = (() => {
        if (!run) return null;
        const mine = run.lessons.filter((l) => (view.kind === 'class' ? l.student_group_id : l.lecturer_id) === Number(view.id));
        const at = new Map(mine.map((l) => [`${l.day_of_week}|${l.period_no}`, l]));
        return { at, count: mine.length };
    })();
    const viewOptions = view.kind === 'class'
        ? [...new Map(run?.lessons.map((l) => [l.student_group_id, l.student_group_name]) || [])]
        : [...new Map(run?.lessons.map((l) => [l.lecturer_id, l.lecturer_name]) || [])];

    return (
        <div className="flex flex-col gap-6">
            <Panel
                title={`Generate for ${term?.name || 'this term'}`}
                subtitle={`${allocated} classes with subjects · ${lessonPeriods} lesson periods a day · ${setup.rooms.length} rooms · ${setup.teachers.length} teachers`}
                action={
                    <div className="flex items-end gap-2">
                        <div className="w-28"><Label>Seed (optional)</Label><Input type="number" placeholder="random" value={seed} onChange={(e) => setSeed(e.target.value)} /></div>
                        <Button variant="primary" disabled={busy || !ready} onClick={generate}><IconWand size={16} /> {busy ? 'Working…' : 'Generate timetable'}</Button>
                    </div>
                }
            >
                {!ready ? (
                    <Note>Before generating: set the bell schedule (Calendar), add rooms, and give classes their subjects (Allocations).</Note>
                ) : (
                    <Note>Each run tries many arrangements and keeps the best. Nothing changes for students and lecturers until you publish. The same seed gives the same timetable.</Note>
                )}
            </Panel>

            {run && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Stat label="Lessons placed" value={`${run.placed} / ${run.required}`} tone={missing ? 'amber' : 'green'} />
                        <Stat label="Quality penalty" value={run.penalty} hint="Lower is better" />
                        <Stat label="Status" value={run.status === 'DRAFT' ? 'Draft' : run.status === 'PUBLISHED' ? 'Live' : 'Replaced'} tone={run.status === 'PUBLISHED' ? 'green' : 'blue'} />
                        <Stat label="Search" value={`${report.stats?.attempts ?? '—'} tries`} hint={`seed ${run.seed} · ${report.stats ? Math.round(report.stats.ms / 100) / 10 : '—'} s`} />
                    </div>

                    {run.status === 'DRAFT' && (
                        <Panel>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                    {missing ? <><IconAlertTriangle size={16} className="inline text-amber-600" /> {missing} lessons are not placed. You can publish anyway, fix the setup and generate again, or try another seed.</>
                                        : <><IconCircleCheck size={16} className="inline text-emerald-600" /> Every lesson is placed with no clashes. Review the preview, then publish.</>}
                                </p>
                                <Button variant="primary" disabled={busy} onClick={publish}><IconRocket size={16} /> Publish timetable</Button>
                            </div>
                        </Panel>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <Panel title="Problems to fix">
                            {!report.unassigned?.length && !report.unplaced?.length && !report.warnings?.length ? <Note>None.</Note> : (
                                <ul className="flex flex-col gap-3 text-sm">
                                    {report.unassigned?.map((u, i) => (
                                        <li key={`a${i}`}><Badge tone="red">No teacher</Badge> <span className="font-medium text-slate-700 dark:text-slate-200">{names.class.get(u.classId)} – {names.subject.get(u.subjectId)}</span><p className="text-xs text-slate-500 dark:text-slate-400">{u.reason} ({u.periodsPerWeek} periods)</p></li>
                                    ))}
                                    {report.unplaced?.map((u, i) => (
                                        <li key={`p${i}`}><Badge tone="amber">{u.missing} not placed</Badge> <span className="font-medium text-slate-700 dark:text-slate-200">{names.class.get(u.classId)} – {names.subject.get(u.subjectId)}</span><p className="text-xs text-slate-500 dark:text-slate-400">{names.teacher.get(u.teacherId)}: {u.reason}</p></li>
                                    ))}
                                    {report.warnings?.map((w, i) => <li key={`w${i}`}><Badge tone="amber">Check</Badge> <span className="text-slate-600 dark:text-slate-300">{w}</span></li>)}
                                </ul>
                            )}
                        </Panel>

                        <Panel title="Quality" subtitle="Soft goals the generator tries to keep low">
                            <ul className="divide-y divide-slate-100 dark:divide-slate-700/60 text-sm">
                                {Object.entries(QUALITY_LABELS).map(([k, label]) => (
                                    <li key={k} className="flex justify-between py-1.5">
                                        <span className="text-slate-600 dark:text-slate-300">{label}</span>
                                        <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">{report.breakdown?.[k] ?? 0}</span>
                                    </li>
                                ))}
                            </ul>
                        </Panel>

                        <Panel title="Teacher workload" subtitle="Periods a week against each teacher's limit">
                            {!report.teacherLoads?.length ? <Note>No lessons placed.</Note> : (
                                <ul className="flex flex-col gap-3">
                                    {report.teacherLoads.map((t) => {
                                        const pct = Math.min(100, Math.round((t.periods / Math.max(t.maxPerWeek, 1)) * 100));
                                        return (
                                            <li key={t.teacherId}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{t.name}</span>
                                                    <span className="tabular-nums text-slate-500 dark:text-slate-400">{t.periods} / {t.maxPerWeek}</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${t.name} workload`}>
                                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--viz-series-1)' }} />
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Panel>
                    </div>

                    <Panel
                        title="Preview"
                        subtitle={`${grid.count} lessons a week`}
                        action={
                            <div className="flex gap-2">
                                <Select aria-label="View by" value={view.kind} onChange={(e) => {
                                    const kind = e.target.value;
                                    const first = run.lessons[0];
                                    setView({ kind, id: first ? String(kind === 'class' ? first.student_group_id : first.lecturer_id) : '' });
                                }}>
                                    <option value="class">By class</option>
                                    <option value="teacher">By teacher</option>
                                </Select>
                                <Select aria-label="Which" value={view.id} onChange={(e) => setView({ ...view, id: e.target.value })}>
                                    {viewOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                                </Select>
                            </div>
                        }
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-separate border-spacing-1 min-w-[720px]">
                                <thead>
                                    <tr>
                                        <th className="w-24" />
                                        {DAYS.map((d) => <th key={d} className="text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-2 py-1">{d}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {setup.bell.map((p) => (p.kind === 'BREAK' ? (
                                        <tr key={p.id}><td colSpan={6} className="text-center text-[11px] text-slate-400 py-0.5">{p.label} · {hhmm(p.start_time)}–{hhmm(p.end_time)}</td></tr>
                                    ) : (
                                        <tr key={p.id}>
                                            <td className="align-top text-slate-500 dark:text-slate-400 px-1 py-2 whitespace-nowrap"><span className="font-semibold text-slate-700 dark:text-slate-200">{p.label}</span><br />{hhmm(p.start_time)}</td>
                                            {DAYS.map((d) => {
                                                const l = grid.at.get(`${d}|${p.period_no}`);
                                                return (
                                                    <td key={d} className={`align-top rounded-md px-2 py-1.5 ${l ? 'bg-primary-50 dark:bg-primary-500/10' : 'bg-slate-50 dark:bg-slate-900/40'}`}>
                                                        {l && (
                                                            <>
                                                                <p className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">{l.course_name}</p>
                                                                <p className="text-slate-500 dark:text-slate-400 leading-tight">{view.kind === 'class' ? l.lecturer_name : l.student_group_name} · {l.room_name}</p>
                                                            </>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    )))}
                                </tbody>
                            </table>
                        </div>
                    </Panel>
                </>
            )}
        </div>
    );
};

const Stat = ({ label, value, hint, tone }) => {
    const tones = { green: 'text-emerald-700 dark:text-emerald-400', amber: 'text-amber-700 dark:text-amber-400', blue: 'text-primary-700 dark:text-primary-300' };
    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-semibold tabular-nums mt-2 ${tones[tone] || 'text-slate-800 dark:text-slate-100'}`}>{value}</p>
            {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
        </div>
    );
};

export default GenerateTab;
