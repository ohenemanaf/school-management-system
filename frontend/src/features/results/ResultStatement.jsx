import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { IconSchool } from '@tabler/icons-react';

// The report card (statement of semester results), drawn as an A4 sheet.
// It uses fixed school colours (not the viewer's theme) so every copy looks
// the same on screen and on paper.
//   responsive   on screen: one card per subject on phones, the table from md up
//   printSummary printed copy: adds the performance summary chart

const NAVY = '#1e3a8a';
const NAVY_SOFT = '#eef2ff';
const PRINT_BLUE = '#2a78d6'; // validated series colour on white

const fmt = (value, digits = 1) => (value === null || value === undefined ? '—' : Number(value).toFixed(digits));
const dateText = (value) => (value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

/** Soft status tones: good = green, in between = amber, fail = red, incomplete = grey. */
function gradeTone(row) {
    if (row.grade === 'IC' || row.gradePoint === null) return 'bg-slate-100 text-slate-700 ring-slate-300';
    if (row.gradePoint >= 3) return 'bg-emerald-50 text-emerald-800 ring-emerald-300';
    if (row.gradePoint > 0) return 'bg-amber-50 text-amber-800 ring-amber-300';
    return 'bg-red-50 text-red-800 ring-red-300';
}

/** A short overall comment from the GPA (the school can add its own by hand). */
function overallRemark(gpa) {
    if (gpa === null || gpa === undefined) return 'Results are not yet complete for this term.';
    if (gpa >= 3.6) return 'Outstanding performance. Keep up the excellent work.';
    if (gpa >= 3.0) return 'Very good performance. Well done.';
    if (gpa >= 2.5) return 'Good performance, with room to push further.';
    if (gpa >= 2.0) return 'Satisfactory performance. More effort will lift these grades.';
    if (gpa >= 1.0) return 'Fair performance. Needs to work harder in the weaker subjects.';
    return 'Weak performance. Needs serious improvement and extra support.';
}

const GradePill = ({ row, large }) => (
    <span className={`inline-flex items-center justify-center rounded-md ring-1 font-bold tabular-nums ${large ? 'min-w-[2.75rem] h-9 text-base' : 'min-w-[2.25rem] h-6 text-xs'} ${gradeTone(row)}`}>
        {row.grade}
    </span>
);

const SectionTitle = ({ children }) => (
    <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: NAVY }}>{children}</h3>
);

const ResultsTable = ({ rows, weights }) => (
    <table className="w-full border-collapse text-[12.5px]">
        <thead>
            <tr className="text-white text-[11px] uppercase tracking-wide whitespace-nowrap" style={{ background: NAVY }}>
                <th className="px-2.5 py-2 text-left font-semibold rounded-tl-md">Code</th>
                <th className="px-2.5 py-2 text-left font-semibold">Subject</th>
                <th className="px-2 py-2 font-semibold">Cr.</th>
                <th className="px-2 py-2 font-semibold">Class<br /><span className="font-normal normal-case opacity-80">/{weights.classWork}</span></th>
                <th className="px-2 py-2 font-semibold">Exam<br /><span className="font-normal normal-case opacity-80">/{weights.exam}</span></th>
                <th className="px-2 py-2 font-semibold">Total<br /><span className="font-normal normal-case opacity-80">/100</span></th>
                <th className="px-2 py-2 font-semibold">Grade</th>
                <th className="px-2 py-2 font-semibold">Point</th>
                <th className="px-2.5 py-2 text-left font-semibold rounded-tr-md">Remark</th>
            </tr>
        </thead>
        <tbody>
            {rows.map((r, i) => (
                <tr key={r.courseId} className={`break-inside-avoid border-b border-slate-200 ${i % 2 ? 'bg-slate-50' : 'bg-white'}`}>
                    <td className="px-2.5 py-2 whitespace-nowrap text-slate-600 font-medium">{r.code || '—'}</td>
                    <td className="px-2.5 py-2 font-semibold text-slate-900">{r.name}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{r.credits}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{fmt(r.caMark)}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{fmt(r.examMark)}</td>
                    <td className="px-2 py-2 text-center tabular-nums font-bold text-slate-900">{fmt(r.total)}</td>
                    <td className="px-2 py-2 text-center"><GradePill row={r} /></td>
                    <td className="px-2 py-2 text-center tabular-nums">{fmt(r.gradePoint, 2)}</td>
                    <td className="px-2.5 py-2 text-slate-700">{r.remark}</td>
                </tr>
            ))}
        </tbody>
    </table>
);

/** Phone layout: one compact card per subject. */
const ResultsCards = ({ rows, weights }) => (
    <ul className="flex flex-col gap-2.5">
        {rows.map((r) => (
            <li key={r.courseId} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-slate-50">
                    <div className="min-w-0">
                        <p className="font-semibold text-slate-900 leading-tight">{r.name}</p>
                        <p className="text-[11px] text-slate-500">{r.code || '—'} · {r.credits} credits · {fmt(r.gradePoint, 2)} pts</p>
                    </div>
                    <GradePill row={r} large />
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
                    {[[`Class /${weights.classWork}`, r.caMark], [`Exam /${weights.exam}`, r.examMark], ['Total /100', r.total]].map(([label, value]) => (
                        <div key={label} className="py-2">
                            <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
                            <p className="font-bold text-slate-900 tabular-nums">{fmt(value)}</p>
                        </div>
                    ))}
                </div>
                <p className="text-[11px] text-slate-600 px-3 py-1.5 border-t border-slate-200">{r.remark}</p>
            </li>
        ))}
    </ul>
);

const Tile = ({ label, value, hint, accent }) => (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 relative overflow-hidden">
        <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent || NAVY }} />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900 tabular-nums leading-tight mt-0.5">{value}</p>
        {hint && <p className="text-[10.5px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
);

/** Printed performance chart: each subject's total. */
const PrintSummary = ({ rows }) => {
    const graded = rows.filter((r) => r.total !== null);
    if (!graded.length) return null;
    const data = graded.map((r) => ({ name: r.code || r.name, total: r.total }));
    return (
        <section className="mt-5 print:mt-3 break-inside-avoid">
            <SectionTitle>Performance by subject</SectionTitle>
            <BarChart width={680} height={Math.max(110, data.length * 22 + 30)} data={data} layout="vertical" margin={{ top: 2, right: 36, bottom: 2, left: 8 }}>
                <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={90} interval={0} tick={{ fill: '#334155', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Bar dataKey="total" fill={PRINT_BLUE} barSize={12} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    <LabelList dataKey="total" position="right" style={{ fill: '#0f172a', fontSize: 11 }} />
                </Bar>
            </BarChart>
        </section>
    );
};

const ResultStatement = ({ data, schoolName, showBreakdown, responsive = false, printSummary = false }) => {
    const { student, term, weights, rows, summary, attendance, scale } = data;
    const details = [
        ['Index number', student.indexNumber],
        ['Class', student.className || '—'],
        ['Level', student.level || '—'],
        ['Programme', student.program || '—'],
        ['Stream', student.stream || '—'],
        ['Term', term.name],
    ];

    return (
        <article className="statement bg-white text-slate-800 mx-auto w-full max-w-[210mm] shadow-sm border border-slate-200 rounded-xl overflow-hidden print:rounded-none print:shadow-none print:border-0 text-[13px] leading-snug">
            {/* Letterhead */}
            <header className="flex items-center gap-3 sm:gap-4 px-4 sm:px-8 py-4 sm:py-5 print:py-3 text-white" style={{ background: NAVY }}>
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-white flex items-center justify-center shrink-0 ring-4 ring-white/20">
                    <IconSchool size={28} style={{ color: NAVY }} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-lg font-bold uppercase tracking-wide leading-tight">{schoolName}</p>
                    <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-blue-100 mt-0.5">Official Report Card</p>
                    <p className="text-[11px] sm:text-xs text-blue-100/90 mt-0.5">{term.name} · {dateText(term.startDate)} to {dateText(term.endDate)}</p>
                </div>
                <div className="hidden sm:block text-center bg-white rounded-xl px-4 py-2 shrink-0 print:block" style={{ color: NAVY }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Semester GPA</p>
                    <p className="text-2xl font-extrabold tabular-nums leading-none mt-0.5">{fmt(summary.gpa, 2)}</p>
                </div>
            </header>

            <div className="px-4 sm:px-8 py-5 sm:py-6 print:px-6 print:py-4">
                {/* Student */}
                <section className="flex items-center gap-4 rounded-xl px-4 py-3 mb-5 print:mb-3 print:py-2" style={{ background: NAVY_SOFT }}>
                    <div className="hidden sm:flex print:flex w-14 h-14 rounded-full items-center justify-center text-white text-lg font-bold shrink-0" style={{ background: NAVY }}>
                        {initials(student.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-base sm:text-lg font-bold text-slate-900 leading-tight">{student.name}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 print:grid-cols-3 gap-x-4 gap-y-1 mt-1.5">
                            {details.map(([label, value]) => (
                                <p key={label} className="min-w-0 text-[12px]">
                                    <span className="text-slate-500">{label}: </span>
                                    <span className="font-semibold text-slate-800 break-words">{value}</span>
                                </p>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Results */}
                <SectionTitle>Subject results</SectionTitle>
                {rows.length === 0 ? (
                    <p className="rounded-xl border border-slate-200 p-4 text-center">No graded subjects for this term.</p>
                ) : responsive ? (
                    <>
                        <div className="md:hidden"><ResultsCards rows={rows} weights={weights} /></div>
                        <div className="hidden md:block rounded-md overflow-hidden border border-slate-200"><ResultsTable rows={rows} weights={weights} /></div>
                    </>
                ) : (
                    <div className="rounded-md overflow-hidden border border-slate-200"><ResultsTable rows={rows} weights={weights} /></div>
                )}

                {/* Summary */}
                <section className="mt-5 print:mt-3 break-inside-avoid">
                    <SectionTitle>Summary</SectionTitle>
                    <div className={`grid gap-2.5 grid-cols-2 ${responsive ? 'md:grid-cols-4' : 'grid-cols-4'}`}>
                        <Tile label="Semester GPA" value={fmt(summary.gpa, 2)} hint="out of 4.00" />
                        <Tile label="Cumulative GPA" value={fmt(summary.cumulative.cgpa, 2)} hint={`${summary.cumulative.credits} credits overall`} accent="#0e7490" />
                        <Tile label="Average mark" value={fmt(summary.weightedAverage)} hint="credit-weighted, /100" accent="#7c3aed" />
                        <Tile label="Attendance" value={attendance.days ? `${fmt(attendance.rate, 0)}%` : '—'} hint={attendance.days ? `${attendance.present} of ${attendance.days} days` : 'Not recorded'} accent="#047857" />
                    </div>
                    <p className="text-[11.5px] text-slate-600 mt-2">
                        {summary.subjects} subjects · {summary.creditsAttempted} credits attempted · {summary.creditsEarned} credits earned
                        {summary.incomplete > 0 ? ` · ${summary.incomplete} incomplete (IC, not counted in the GPA)` : ''}
                    </p>
                </section>

                {printSummary && rows.length > 0 && <PrintSummary rows={rows} />}

                {/* Grading key */}
                <section className="mt-5 print:mt-3 break-inside-avoid">
                    <SectionTitle>Grading key</SectionTitle>
                    <div className="flex flex-wrap gap-1.5">
                        {scale.map((s, i) => (
                            <span key={s.grade} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]">
                                <span className="font-bold text-slate-900">{s.grade}</span>
                                <span className="text-slate-600 tabular-nums">{s.minScore}{i === 0 ? '–100' : `–${(scale[i - 1].minScore - 0.1).toFixed(1).replace(/\.0$/, '')}`}</span>
                                <span className="text-slate-400">·</span>
                                <span className="text-slate-600 tabular-nums">{fmt(s.gradePoint, 1)}</span>
                            </span>
                        ))}
                    </div>
                </section>

                {showBreakdown && rows.length > 0 && (
                    <section className="mt-5">
                        <SectionTitle>Assessment breakdown</SectionTitle>
                        <div className="overflow-x-auto rounded-md border border-slate-200">
                            <table className="w-full border-collapse text-[12px]">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wide">
                                        <th className="px-2.5 py-1.5 text-left font-semibold">Subject</th>
                                        <th className="px-2.5 py-1.5 text-left font-semibold">Assessment</th>
                                        <th className="px-2 py-1.5 font-semibold">Type</th>
                                        <th className="px-2 py-1.5 font-semibold">Score</th>
                                        <th className="px-2 py-1.5 font-semibold">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.flatMap((r) => r.assessments.map((a, i) => (
                                        <tr key={`${r.courseId}-${i}`} className={`break-inside-avoid border-t border-slate-200 ${i === 0 ? 'border-t-slate-300' : ''}`}>
                                            <td className="px-2.5 py-1.5 font-semibold">{i === 0 ? r.name : ''}</td>
                                            <td className="px-2.5 py-1.5">{a.name}</td>
                                            <td className="px-2 py-1.5 text-center">{a.component === 'EXAM' ? 'Exam' : 'Class work'}</td>
                                            <td className="px-2 py-1.5 text-center tabular-nums whitespace-nowrap">{fmt(a.score)} / {fmt(a.maxScore)}</td>
                                            <td className="px-2 py-1.5 text-center tabular-nums">{fmt((a.score / a.maxScore) * 100, 0)}</td>
                                        </tr>
                                    )))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Remarks */}
                <section className="mt-5 print:mt-3 break-inside-avoid">
                    <SectionTitle>Remarks</SectionTitle>
                    <div className="rounded-xl border border-slate-200 divide-y divide-slate-200">
                        <div className="px-3 py-2.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Overall</p>
                            <p className="text-slate-800 mt-0.5">{overallRemark(summary.gpa)}</p>
                        </div>
                        {["Class teacher's comment", "Head of school's comment"].map((label) => (
                            <div key={label} className="px-3 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                                <div className="mt-4 print:mt-3 border-b border-dotted border-slate-400" />
                                <div className="mt-5 print:mt-4 border-b border-dotted border-slate-400" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Signatures */}
                <footer className="mt-8 print:mt-4 break-inside-avoid">
                    <div className="grid grid-cols-3 gap-6 items-end">
                        {['Class teacher', 'Head of school'].map((label) => (
                            <div key={label}>
                                <div className="h-8 print:h-6" />
                                <div className="border-t border-slate-500 pt-1 text-[11px] text-slate-600">{label}</div>
                            </div>
                        ))}
                        <div className="flex justify-center">
                            <div className="w-20 h-20 print:w-16 print:h-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-[10px] uppercase tracking-wider text-slate-400 text-center leading-tight">School<br />stamp</div>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-6 print:mt-3 pt-2 border-t border-slate-200 flex flex-wrap justify-between gap-2">
                        <span>Generated on {dateText(data.generatedAt)} · Class work {weights.classWork}%, examination {weights.exam}% of each total.</span>
                        <span className="tabular-nums">Ref. {student.indexNumber}/{term.id}</span>
                    </p>
                </footer>
            </div>
        </article>
    );
};

export default ResultStatement;
