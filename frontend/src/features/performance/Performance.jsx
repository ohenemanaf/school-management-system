import { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { IconChartBar, IconInfoCircle } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

// School-wide results for leaders (super admin, admin, headmaster).
// Only aggregates: individual grades stay with each class's lecturer.

const axisTick = { fill: 'var(--viz-text-secondary)', fontSize: 12 };
const fmt = (value, suffix = '%') => (value === null || value === undefined ? '—' : `${value}${suffix}`);

const StatTile = ({ label, value, hint }) => (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-3xl font-semibold text-slate-900 dark:text-white mt-1 tabular-nums">{value}</p>
        {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
    </div>
);

const ChartCard = ({ title, subtitle, children }) => (
    <section className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm min-w-0">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">{subtitle}</p>}
        {children}
    </section>
);

const ClassTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    return (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-md text-xs">
            <p className="font-semibold text-slate-900 dark:text-white mb-1">{row.student_group_name}</p>
            <p className="text-slate-600 dark:text-slate-300">Average <span className="font-semibold tabular-nums">{fmt(row.average)}</span></p>
            <p className="text-slate-600 dark:text-slate-300">Pass rate <span className="font-semibold tabular-nums">{fmt(row.pass_rate)}</span></p>
            <p className="text-slate-500 dark:text-slate-400">{row.students} students graded</p>
        </div>
    );
};

const BandTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    return (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-md text-xs">
            <p className="font-semibold text-slate-900 dark:text-white">{row.band}%</p>
            <p className="text-slate-600 dark:text-slate-300"><span className="font-semibold tabular-nums">{row.count}</span> grades</p>
        </div>
    );
};

const Performance = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/grades/analytics')
            .then((res) => setData(res.data))
            .catch(() => toast.error('Failed to load performance data'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="page text-sm text-slate-500 dark:text-slate-400">Loading…</div>;
    if (!data) return null;

    const { overall, byGroup, byAssessment, distribution, minStudents, passMark } = data;
    const charted = byGroup.filter((g) => !g.suppressed);
    const hidden = byGroup.filter((g) => g.suppressed);

    return (
        <div className="page w-full box-border">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <IconChartBar size={28} className="text-primary-600" /> Academic Performance
                </h1>
                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    School-wide results. Individual grades stay with each class&apos;s lecturer.
                </p>
            </div>

            {overall.grades === 0 ? (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center text-slate-500 dark:text-slate-400">
                    No grades have been recorded yet.
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatTile label="Average score" value={fmt(overall.average)} />
                        <StatTile label="Pass rate" value={fmt(overall.pass_rate)} hint={`Scores of ${passMark}% or more`} />
                        <StatTile label="Students graded" value={overall.students} />
                        <StatTile label="Assessments" value={overall.assessments} />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                        <ChartCard title="Average score by class" subtitle="Percentage of the maximum score, all assessments">
                            {charted.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">No class has enough graded students to show yet.</p>
                            ) : (
                                <div style={{ height: Math.max(160, charted.length * 44 + 40) }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={charted} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
                                            <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
                                            <XAxis type="number" domain={[0, 100]} tick={axisTick} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                                            <YAxis type="category" dataKey="student_group_name" width={150} tick={axisTick} axisLine={false} tickLine={false} />
                                            <Tooltip content={<ClassTooltip />} cursor={{ fill: 'var(--viz-hover)' }} />
                                            <Bar dataKey="average" fill="var(--viz-series-1)" barSize={16} radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </ChartCard>

                        <ChartCard title="Score distribution" subtitle="Number of grades in each score band">
                            <div style={{ height: 260 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={distribution} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                                        <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
                                        <XAxis dataKey="band" tick={axisTick} axisLine={false} tickLine={false} />
                                        <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                                        <Tooltip content={<BandTooltip />} cursor={{ fill: 'var(--viz-hover)' }} />
                                        <Bar dataKey="count" fill="var(--viz-series-1)" barSize={28} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <ChartCard title="By class">
                            <SummaryTable rows={byGroup} nameKey="student_group_name" nameLabel="Class" />
                        </ChartCard>
                        <ChartCard title="By assessment">
                            <SummaryTable rows={byAssessment} nameKey="assessment_name" nameLabel="Assessment" />
                        </ChartCard>
                    </div>

                    {hidden.length > 0 && (
                        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                            <IconInfoCircle size={16} className="shrink-0" />
                            Results for groups with fewer than {minStudents} graded students are not shown, so no one&apos;s individual mark can be worked out.
                        </p>
                    )}
                </>
            )}
        </div>
    );
};

const SummaryTable = ({ rows, nameKey, nameLabel }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
            <thead>
                <tr className="text-xs uppercase tracking-wide whitespace-nowrap text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 pr-4 font-semibold">{nameLabel}</th>
                    <th className="py-2 pr-4 font-semibold text-right">Students</th>
                    <th className="py-2 pr-4 font-semibold text-right">Average</th>
                    <th className="py-2 font-semibold text-right">Pass rate</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {rows.map((row) => (
                    <tr key={row[nameKey]} className="text-slate-700 dark:text-slate-200">
                        <td className="py-2 pr-4 font-medium">{row[nameKey]}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{row.students}</td>
                        {row.suppressed ? (
                            <td colSpan={2} className="py-2 text-right text-xs text-slate-500 dark:text-slate-400">Too few to show</td>
                        ) : (
                            <>
                                <td className="py-2 pr-4 text-right tabular-nums">{fmt(row.average)}</td>
                                <td className="py-2 text-right tabular-nums">{fmt(row.pass_rate)}</td>
                            </>
                        )}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default Performance;
