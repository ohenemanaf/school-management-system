// The printable statement of semester results. Deliberately drawn as a white
// A4 sheet (no dark-mode colours) so the screen matches the printout.

const fmt = (value, digits = 1) => (value === null || value === undefined ? '—' : Number(value).toFixed(digits));
const dateText = (value) => (value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

const Cell = ({ children, className = '' }) => <td className={`border border-slate-300 px-2 py-1.5 ${className}`}>{children}</td>;
const Head = ({ children, className = '' }) => <th className={`border border-slate-300 bg-slate-100 px-2 py-1.5 font-semibold ${className}`}>{children}</th>;

const ResultStatement = ({ data, schoolName, showBreakdown }) => {
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
        <article className="statement bg-white text-slate-900 mx-auto w-full max-w-[210mm] p-6 sm:p-10 shadow-sm border border-slate-200 print:shadow-none print:border-0 print:p-0 text-[13px] leading-snug">
            <header className="text-center border-b-2 border-slate-800 pb-3 mb-4">
                <p className="text-lg font-bold uppercase tracking-wide">{schoolName}</p>
                <p className="text-sm font-semibold tracking-[0.2em] uppercase mt-1">Statement of Semester Results</p>
                <p className="text-sm mt-1">{term.name} · {dateText(term.startDate)} to {dateText(term.endDate)}</p>
            </header>

            <section className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 mb-5">
                {details.map(([label, value]) => (
                    <div key={label} className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
                        <span className="font-semibold break-words">{value}</span>
                    </div>
                ))}
            </section>

            {rows.length === 0 ? (
                <p className="border border-slate-300 p-4 text-center">No graded subjects for this term.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[640px] print:min-w-0">
                        <thead>
                            <tr>
                                <Head className="text-left">Code</Head>
                                <Head className="text-left">Subject</Head>
                                <Head>Credits</Head>
                                <Head>Class work<br /><span className="font-normal">/{weights.classWork}</span></Head>
                                <Head>Exam<br /><span className="font-normal">/{weights.exam}</span></Head>
                                <Head>Total<br /><span className="font-normal">/100</span></Head>
                                <Head>Grade</Head>
                                <Head>Grade point</Head>
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
                </div>
            )}

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 break-inside-avoid">
                <table className="w-full border-collapse">
                    <tbody>
                        {[
                            ['Subjects taken', summary.subjects],
                            ['Credits attempted', summary.creditsAttempted],
                            ['Credits earned', summary.creditsEarned],
                            ['Weighted average mark', fmt(summary.weightedAverage)],
                            ['Semester GPA', fmt(summary.gpa, 2)],
                            ['Cumulative GPA', `${fmt(summary.cumulative.cgpa, 2)} (${summary.cumulative.credits} credits)`],
                        ].map(([label, value]) => (
                            <tr key={label}>
                                <Head className="text-left w-1/2">{label}</Head>
                                <Cell className="font-semibold tabular-nums">{value}</Cell>
                            </tr>
                        ))}
                        <tr>
                            <Head className="text-left">Attendance</Head>
                            <Cell className="tabular-nums">{attendance.days ? `${attendance.present} of ${attendance.days} days (${fmt(attendance.rate)}%)` : 'Not recorded'}</Cell>
                        </tr>
                    </tbody>
                </table>

                <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Grading key</p>
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

            {showBreakdown && rows.length > 0 && (
                <section className="mt-5">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Assessment breakdown</p>
                    <table className="w-full border-collapse text-[12px]">
                        <thead><tr><Head className="text-left">Subject</Head><Head className="text-left">Assessment</Head><Head>Type</Head><Head>Score</Head><Head>%</Head></tr></thead>
                        <tbody>
                            {rows.flatMap((r) => r.assessments.map((a, i) => (
                                <tr key={`${r.courseId}-${i}`} className="break-inside-avoid">
                                    <Cell>{i === 0 ? r.name : ''}</Cell>
                                    <Cell>{a.name}</Cell>
                                    <Cell className="text-center">{a.component === 'EXAM' ? 'Exam' : 'Class work'}</Cell>
                                    <Cell className="text-center tabular-nums">{fmt(a.score)} / {fmt(a.maxScore)}</Cell>
                                    <Cell className="text-center tabular-nums">{fmt((a.score / a.maxScore) * 100)}</Cell>
                                </tr>
                            )))}
                        </tbody>
                    </table>
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
