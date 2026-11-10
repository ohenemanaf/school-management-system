import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
    IconReportAnalytics, IconTrendingUp, IconTrophy, IconBooks, IconAward, IconPrinter, IconLock,
} from '@tabler/icons-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import api from '../../utils/api';
import { SCHOOL_NAME } from '../../utils/format';
import ResultStatement from './ResultStatement';
import AssessmentsBySubject from './AssessmentsBySubject';

// A student's results for a term: progress analytics from every mark so far,
// and the official report card (once the school releases the term), which
// prints as a clean A4 page together with a performance summary.

const DEFAULT_SCALE = [
    { minScore: 80, grade: 'A' }, { minScore: 70, grade: 'B' }, { minScore: 60, grade: 'C' },
    { minScore: 50, grade: 'D' }, { minScore: 0, grade: 'F' },
];
const gradeFor = (pct, scale) => (scale.find((s) => pct >= s.minScore) || scale[scale.length - 1]).grade;
const shortLabel = (text, max = 14) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
const axisTick = { fill: 'var(--viz-text-secondary)', fontSize: 12 };
const tooltipStyle = { borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' };

function useIsNarrow() {
    const query = '(max-width: 640px)';
    const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const onChange = () => setNarrow(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    return narrow;
}

const Card = ({ title, accent, className = '', children }) => (
    <section className={`glass bg-white dark:bg-slate-800/70 border border-white dark:border-slate-700/50 shadow-sm rounded-3xl p-4 sm:p-6 min-w-0 ${className}`}>
        <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 sm:mb-6 flex items-center gap-2">
            <span className={`w-2 h-6 rounded-full ${accent}`} />
            {title}
        </h3>
        {children}
    </section>
);

const Kpi = ({ icon, gradient, value, label, small, className = '' }) => (
    <div className={`glass bg-white dark:bg-slate-800/70 border border-white dark:border-slate-700/50 shadow-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative overflow-hidden min-w-0 ${className}`}>
        <div className={`absolute right-0 top-0 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br ${gradient} opacity-10 rounded-bl-full`} />
        <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center mb-2 sm:mb-3 shadow-lg`}>{icon}</div>
        <p className={`${small ? 'text-lg sm:text-xl' : 'text-2xl sm:text-4xl'} font-semibold text-slate-800 dark:text-slate-100 mb-1 truncate`} title={typeof value === 'string' ? value : undefined}>{value}</p>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
);

const StudentResults = () => {
    const narrow = useIsNarrow();
    const [terms, setTerms] = useState(null);
    const [termId, setTermId] = useState('');
    const [grades, setGrades] = useState([]);
    const [scale, setScale] = useState(DEFAULT_SCALE);
    const [statement, setStatement] = useState(null);
    const [cardState, setCardState] = useState('loading'); // loading | ready | not-released | none
    const [showBreakdown, setShowBreakdown] = useState(false);

    useEffect(() => {
        api.get('/results/terms').then(({ data }) => {
            setTerms(data);
            const first = data.find((t) => t.results_released && t.graded > 0) || data.find((t) => t.graded > 0) || data[0];
            if (first) setTermId(String(first.id));
            else setCardState('none');
        }).catch(() => { setTerms([]); setCardState('none'); toast.error('Could not load your terms'); });
        api.get('/grades').then(({ data }) => setGrades(data)).catch(() => toast.error('Could not load your marks'));
        api.get('/results/scale').then(({ data }) => { if (data.length) setScale(data); }).catch(() => {});
    }, []);

    useEffect(() => {
        if (!termId) return;
        setCardState('loading');
        setStatement(null);
        api.get('/results/statement', { params: { term_id: termId } })
            .then(({ data }) => { setStatement(data); setCardState('ready'); })
            .catch((error) => setCardState(error.response?.data?.code === 'NOT_RELEASED' ? 'not-released' : 'none'));
    }, [termId]);

    // --- Analytics for the selected term ---------------------------------
    const analytics = useMemo(() => {
        const inTerm = grades.filter((g) => !termId || String(g.term_id) === termId);
        const processed = inTerm.map((g) => ({
            ...g,
            subject: g.course_name || 'Other assessments',
            label: g.course_code || g.course_name || 'Other',
            percentage: (Number(g.score) / Number(g.max_score)) * 100,
            date: new Date(g.created_at),
        }));
        // Subject charts and "best subject" use marks filed under a subject only.
        const bySubject = new Map();
        for (const g of processed.filter((x) => x.course_name)) {
            if (!bySubject.has(g.subject)) bySubject.set(g.subject, { subject: g.subject, label: g.label, total: 0, count: 0 });
            const s = bySubject.get(g.subject);
            s.total += g.percentage;
            s.count += 1;
        }
        const subjects = [...bySubject.values()].map((s) => ({ subject: s.subject, label: s.label, average: Number((s.total / s.count).toFixed(1)), fullMark: 100 }));
        const best = subjects.reduce((top, s) => (!top || s.average > top.average ? s : top), null);
        const average = processed.length ? processed.reduce((sum, g) => sum + g.percentage, 0) / processed.length : null;
        const trend = [...processed].sort((a, b) => a.date - b.date).map((g) => ({ name: g.assessment_name, score: Number(g.percentage.toFixed(1)), subject: g.subject }));
        return { processed, subjects, best, average, trend };
    }, [grades, termId]);

    const selected = terms?.find((t) => String(t.id) === termId);
    const canPrint = cardState === 'ready' && statement;
    const { processed, subjects, best, average, trend } = analytics;

    if (terms === null) {
        return (
            <div className="page flex justify-center items-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
            </div>
        );
    }

    const printButton = (
        <button type="button" disabled={!canPrint} onClick={() => window.print()}
            title={canPrint ? 'Print or save as PDF' : 'Available once the school releases this term'}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto">
            <IconPrinter size={18} /> Print report card
        </button>
    );

    return (
        <div className="page space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                        <IconReportAnalytics size={32} className="text-primary-600 shrink-0" />
                        My Results &amp; Report Card
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 font-medium">Track your progress, then print your report card when the term is released.</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
                    {terms.length > 0 && (
                        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            Term
                            <select value={termId} onChange={(e) => setTermId(e.target.value)} className="flex-1 sm:flex-none min-w-0 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100">
                                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}{t.results_released ? '' : ' (not released)'}</option>)}
                            </select>
                        </label>
                    )}
                    {printButton}
                </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
                <Kpi icon={<IconTrendingUp size={20} />} gradient="from-primary-500 to-indigo-400" value={average === null ? '--' : `${average.toFixed(1)}%`} label="Overall average" />
                <Kpi icon={<IconBooks size={20} />} gradient="from-amber-500 to-orange-400" value={processed.length} label="Assessments" className="sm:order-last" />
                <Kpi icon={<IconTrophy size={20} />} gradient="from-emerald-500 to-teal-400" value={best ? best.subject : 'N/A'} label={`Best subject${best ? ` (${best.average.toFixed(1)}%)` : ''}`} small className="col-span-2 sm:col-span-1" />
            </div>

            {processed.length === 0 ? (
                <div className="glass bg-white dark:bg-slate-800/70 border border-white dark:border-slate-700/50 rounded-3xl p-8 sm:p-12 text-center shadow-sm">
                    <IconAward size={48} className="mx-auto text-slate-300 mb-4" />
                    <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">No marks yet{selected ? ` for ${selected.name}` : ''}</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Your marks appear here, with graphs, as your lecturers enter them.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    <Card title="Performance trend" accent="bg-primary-500" className="lg:col-span-2">
                        <div className="h-64 sm:h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trend} margin={{ top: 5, right: narrow ? 8 : 30, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--viz-grid)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={narrow || trend.length > 12 ? false : axisTick} dy={10} height={narrow || trend.length > 12 ? 8 : 30} />
                                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={axisTick} />
                                    <RechartsTooltip contentStyle={tooltipStyle} formatter={(value, name, props) => [`${value}%`, props.payload.subject]} />
                                    <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={narrow ? 3 : 4} dot={{ r: narrow ? 3 : 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 7, strokeWidth: 0 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card title="Subject averages" accent="bg-emerald-500">
                        <div className="w-full" style={{ height: Math.max(220, subjects.length * 44 + 40) }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={subjects} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--viz-grid)" />
                                    <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={axisTick} />
                                    <YAxis type="category" dataKey={narrow ? 'label' : 'subject'} axisLine={false} tickLine={false} tick={{ ...axisTick, fontSize: 11 }} width={narrow ? 64 : 120} tickFormatter={(v) => shortLabel(String(v), narrow ? 9 : 18)} />
                                    <RechartsTooltip cursor={{ fill: 'var(--viz-hover)' }} contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, 'Average']} labelFormatter={(_, payload) => payload?.[0]?.payload.subject} />
                                    <Bar dataKey="average" fill="#10b981" radius={[0, 6, 6, 0]} barSize={narrow ? 18 : 24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card title="Skill mapping" accent="bg-amber-500">
                        <div className="h-64 sm:h-72 w-full flex items-center justify-center">
                            {subjects.length >= 3 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius={narrow ? '62%' : '70%'} data={subjects}>
                                        <PolarGrid stroke="var(--viz-grid)" />
                                        <PolarAngleAxis dataKey="label" tick={{ fill: 'var(--viz-text-secondary)', fontSize: narrow ? 10 : 11, fontWeight: 'bold' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name="You" dataKey="average" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                                        <RechartsTooltip formatter={(value) => [`${value}%`, 'Average']} labelFormatter={(_, payload) => payload?.[0]?.payload.subject} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-slate-400 text-sm font-medium text-center px-4">Marks in at least 3 subjects are needed for the skill map.</p>
                            )}
                        </div>
                    </Card>

                    <Card title="All assessments by subject" accent="bg-blue-500" className="lg:col-span-2">
                        <AssessmentsBySubject marks={processed} gradeFor={(pct) => gradeFor(pct, scale)} finals={new Map((statement?.rows || []).map((r) => [r.name, r]))} />
                    </Card>
                </div>
            )}

            {/* Report card */}
            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span className="w-2 h-6 rounded-full bg-slate-700 dark:bg-slate-300" /> Report card
                    </h2>
                    {canPrint && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <input type="checkbox" checked={showBreakdown} onChange={(e) => setShowBreakdown(e.target.checked)} />
                                Include each assessment
                            </label>
                            {printButton}
                        </div>
                    )}
                </div>

                {cardState === 'loading' ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
                ) : cardState === 'not-released' ? (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 sm:p-6 shadow-sm">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><IconLock size={18} className="text-slate-400" />{selected?.name || 'This term'}: report card not released yet</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your report card (grades, GPA and the printable copy) appears as soon as the school releases this term. Your marks above are already up to date.</p>
                    </div>
                ) : canPrint ? (
                    <>
                        <ResultStatement data={statement} schoolName={SCHOOL_NAME} showBreakdown={showBreakdown} responsive />
                        {/* Printed copy, outside the app layout so menus never print. */}
                        {createPortal(
                            <div className="print-only">
                                <ResultStatement data={statement} schoolName={SCHOOL_NAME} showBreakdown={showBreakdown} printSummary />
                            </div>,
                            document.body
                        )}
                    </>
                ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No report card for this term.</p>
                )}
            </section>
        </div>
    );
};

export default StudentResults;
