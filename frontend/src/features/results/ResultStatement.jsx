import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';

// The report card (statement of semester results). Drawn as a white A4 sheet
// so the screen matches the printout.
//   responsive   on screen: one card per subject on phones, the table from md up
//   printSummary printed copy: adds the performance summary and subject chart

const fmt = (value, digits = 1) => (value === null || value === undefined ? '—' : Number(value).toFixed(digits));
const dateText = (value) => (value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const PRINT_BLUE = '#2a78d6'; // validated series colour on white

const Cell = ({ children, className = '' }) => <td className={`border border-slate-300 px-2 py-1.5 ${className}`}>{children}</td>;
const Head = ({ children, className = '' }) => <th className={`border border-slate-300 bg-slate-100 px-2 py-1.5 font-semibold ${className}`}>{children}</th>;
const Caption = ({ children }) => <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{children}</p>;

const ResultsTable = ({ rows, weights }) => (
    <table className="w-full border-collapse">
        <thead>
            <tr>
                <Head className="text-left">Code</Head>
                <Head className="text-left">Subject</Head>
                <Head>Credits</Head>
                <Head>Class work<br /><span className="font-normal">/{weights.classWork}</span></Head>
                <Head>Exam<br /><span className="font-normal">/{weights.exam}</span></Head>
                <Head>Total<br /><span className="font-normal">/100</span></Head>
                <Head>Grade</Head>
                <Head>Point</Head>
                <Head className="text-left">Remark</Head>
            </tr>
        </thead>
        <tbody>
            {rows.map((r) => (
                <tr key={r.courseId} className="break-inside-avoid">
                    <Cell className="whitespace-nowrap">{r.code || '—'}</Cell>
                    <Cell>{r.name}</Cell>
                    <Cell className="text-center tabular-nums">{r.credits}</Cell>
                    <Cell className="text-center tabular-nums">{fmt(r.caMark)}</Cell>
                    <Cell className="text-center tabular-nums">{fmt(r.examMark)}</Cell>
                    <Cell className="text-center tabular-nums font-semibold">{fmt(r.total)}</Cell>
                    <Cell className="text-center font-bold">{r.grade}</Cell>
                    <Cell className="text-center tabular-nums">{fmt(r.gradePoint, 2)}</Cell>
                    <Cell>{r.remark}</Cell>
                </tr>
            ))}
        </tbody>
    </table>
);

/** Phone layout: one compact card per subject. */
const ResultsCards = ({ rows, weights }) => (
    <ul className="flex flex-col gap-2">
        {rows.map((r) => (
            <li key={r.courseId} className="border border-slate-300 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="font-semibold leading-tight">{r.name}</p>
                        <p className="text-[11px] text-slate-500">{r.code || '—'} · {r.credits} credits</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xl font-bold leading-none">{r.grade}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{fmt(r.gradePoint, 2)} pts</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                    {[[`Class /${weights.classWork}`, r.caMark], [`Exam /${weights.exam}`, r.examMark], ['Total /100', r.total]].map(([label, value]) => (
                        <div key={label} className="bg-slate-50 rounded-md py-1">
                            <p className="text-[10px] text-slate-500">{label}</p>
                            <p className="font-semibold tabular-nums">{fmt(value)}</p>
                        </div>
                    ))}
                </div>
                <p className="text-[11px] text-slate-600 mt-1.5">{r.remark}</p>
            </li>
        ))}
    </ul>
);

/** Printed performance summary: headline figures and each subject's total. */
const PrintSummary = ({ rows, summary, analytics }) => {
    const graded = rows.filter((r) => r.total !== null);
    const chartData = graded.map((r) => ({ name: r.code || r.name, total: r.total }));
    const best = graded.reduce((top, r) => (!top || r.total > top.total ? r : top), null);
    return (
        <section className="mt-5 break-inside-avoid">
            <Caption>Performance summary</Caption>
            <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                    ['Average total', fmt(summary.weightedAverage)],
                    ['Best subject', best ? `${best.code || best.name} (${fmt(best.total)})` : '—'],
                    ['Assessments taken', analytics?.assessments ?? rows.reduce((n, r) => n + r.assessments.length, 0)],
                    ['Semester GPA', fmt(summary.gpa, 2)],
                ].map(([label, value]) => (
                    <div key={label} className="border border-slate-300 rounded-md px-2 py-1.5">
                        <p className="text-[10px] text-slate-500">{label}</p>
                        <p className="font-semibold">{value}</p>
                    </div>
                ))}
            </div>
            {chartData.length > 0 && (
                <BarChart width={680} height={Math.max(150, chartData.length * 26 + 40)} data={chartData} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 8 }}>
                    <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#334155', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Bar dataKey="total" fill={PRINT_BLUE} barSize={14} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                        <LabelList dataKey="total" position="right" style={{ fill: '#0f172a', fontSize: 11 }} />
                    </Bar>
                </BarChart>
            )}
        </section>
    );
};

const ResultStatement = ({ data, schoolName, showBreakdown, responsive = false, printSummary = false, analytics }) => {
    const { student, term, weights, rows, summary, attendance, scale } = data;
    const details = [
        ['Name', student.name],
        ['Index number', student.indexNumber],
        ['Class', student.className || '—'],
        ['Level', student.level || '—'],
        ['Programme', student.program || '—'],
        ['Stream', student.stream || '—'],
    ];

    return (
        <article className="statement bg-white text-slate-900 mx-auto w-full max-w-[210mm] p-4 sm:p-10 shadow-sm border border-slate-200 rounded-lg print:rounded-none print:shadow-none print:border-0 print:p-0 text-[13px] leading-snug">
            <header className="text-center border-b-2 border-slate-800 pb-3 mb-4">
                <p className="text-base sm:text-lg font-bold uppercase tracking-wide">{schoolName}</p>
                <p className="text-xs sm:text-sm font-semibold tracking-[0.15em] uppercase mt-1">Report Card · Semester Results</p>
                <p className="text-xs sm:text-sm mt-1">{term.name} · {dateText(term.startDate)} to {dateText(term.endDate)}</p>
            </header>

            <section className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 mb-5">
                {details.map(([label, value]) => (
                    <div key={label} className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
                        <span className="font-semibold break-words">{value}</span>
                    </div>
                ))}
            </section>

            {rows.length === 0 ? (
                <p className="border border-slate-300 p-4 text-center">No graded subjects for this term.</p>
            ) : responsive ? (
                <>
                    <div className="md:hidden"><ResultsCards rows={rows} weights={weights} /></div>
                    <div className="hidden md:block"><ResultsTable rows={rows} weights={weights} /></div>
                </>
            ) : (
                <ResultsTable rows={rows} weights={weights} />
            )}

            <section className={`grid grid-cols-1 gap-4 mt-5 break-inside-avoid ${responsive ? 'md:grid-cols-2' : 'grid-cols-2'}`}>
                <table className="w-full border-collapse self-start">
                    <tbody>
                        {[
                            ['Subjects taken', summary.subjects],
                            ['Credits attempted', summary.creditsAttempted],
                            ['Credits earned', summary.creditsEarned],
                            ['Weighted average mark', fmt(summary.weightedAverage)],
                            ['Semester GPA', fmt(summary.gpa, 2)],
                            ['Cumulative GPA', `${fmt(summary.cumulative.cgpa, 2)} (${summary.cumulative.credits} credits)`],
                            ['Attendance', attendance.days ? `${attendance.present} of ${attendance.days} days (${fmt(attendance.rate)}%)` : 'Not recorded'],
                        ].map(([label, value]) => (
                            <tr key={label}>
                                <Head className="text-left w-1/2">{label}</Head>
                                <Cell className="font-semibold tabular-nums">{value}</Cell>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div>
                    <Caption>Grading key</Caption>
                    <table className="w-full border-collapse text-[12px]">
                        <thead><tr><Head>Marks</Head><Head>Grade</Head><Head>Point</Head><Head className="text-left">Remark</Head></tr></thead>
                        <tbody>
                            {scale.map((s, i) => (
                                <tr key={s.grade}>
                                    <Cell className="text-center tabular-nums whitespace-nowrap">{s.minScore}{i === 0 ? '–100' : `–${(scale[i - 1].minScore - 0.1).toFixed(1).replace(/\.0$/, '')}`}</Cell>
                                    <Cell className="text-center font-semibold">{s.grade}</Cell>
                                    <Cell className="text-center tabular-nums">{fmt(s.gradePoint, 1)}</Cell>
                                    <Cell>{s.remark}</Cell>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {summary.incomplete > 0 && <p className="text-[11px] mt-1">IC = incomplete (no exam mark yet); not counted in the GPA.</p>}
                </div>
            </section>

            {printSummary && rows.length > 0 && <PrintSummary rows={rows} summary={summary} analytics={analytics} />}

            {showBreakdown && rows.length > 0 && (
                <section className="mt-5">
                    <Caption>Assessment breakdown</Caption>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-[12px]">
                            <thead><tr><Head className="text-left">Subject</Head><Head className="text-left">Assessment</Head><Head>Type</Head><Head>Score</Head><Head>%</Head></tr></thead>
                            <tbody>
                                {rows.flatMap((r) => r.assessments.map((a, i) => (
                                    <tr key={`${r.courseId}-${i}`} className="break-inside-avoid">
                                        <Cell>{i === 0 ? r.name : ''}</Cell>
                                        <Cell>{a.name}</Cell>
                                        <Cell className="text-center">{a.component === 'EXAM' ? 'Exam' : 'Class work'}</Cell>
                                        <Cell className="text-center tabular-nums whitespace-nowrap">{fmt(a.score)} / {fmt(a.maxScore)}</Cell>
                                        <Cell className="text-center tabular-nums">{fmt((a.score / a.maxScore) * 100)}</Cell>
                                    </tr>
                                )))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            <footer className="mt-10 break-inside-avoid">
                <div className="grid grid-cols-2 gap-10">
                    <div><div className="border-t border-slate-500 pt-1 text-[11px]">Head of Academic Affairs</div></div>
                    <div><div className="border-t border-slate-500 pt-1 text-[11px]">Date</div></div>
                </div>
                <p className="text-[10px] text-slate-500 mt-6">
                    Generated on {dateText(data.generatedAt)} from the school management system. Class work counts for {weights.classWork}% and the examination for {weights.exam}% of each total.
                </p>
            </footer>
        </article>
    );
};

export default ResultStatement;
