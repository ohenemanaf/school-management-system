// Every mark for the term, grouped by subject: each subject card shows its
// average and grade, then its class work and exam rows with a percentage bar.

const toneFor = (pct) => (pct >= 70 ? { bar: '#10b981', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30' }
    : pct >= 60 ? { bar: '#3b82f6', chip: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30' }
        : pct >= 50 ? { bar: '#f59e0b', chip: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30' }
            : { bar: '#ef4444', chip: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30' });

const GradeChip = ({ pct, grade, large }) => (
    <span className={`inline-flex items-center justify-center rounded-lg ring-1 font-bold tabular-nums ${large ? 'min-w-[3rem] h-9 px-2 text-base' : 'min-w-[2.5rem] h-7 px-1.5 text-xs'} ${toneFor(pct).chip}`}>
        {grade}
    </span>
);

/** `finals`: official report-card results by subject name (once the term is released). */
const AssessmentsBySubject = ({ marks, gradeFor, finals = new Map() }) => {
    const groups = new Map();
    for (const m of marks) {
        const key = m.course_name || 'Other assessments';
        if (!groups.has(key)) groups.set(key, { name: key, code: m.course_code, marks: [] });
        groups.get(key).marks.push(m);
    }
    const subjects = [...groups.values()]
        .map((g) => ({
            ...g,
            // Class work first, then the exam; oldest first within each.
            marks: g.marks.sort((a, b) => (a.component === 'EXAM') - (b.component === 'EXAM') || a.date - b.date || a.id - b.id),
            average: g.marks.reduce((sum, m) => sum + m.percentage, 0) / g.marks.length,
        }))
        .sort((a, b) => (a.name === 'Other assessments') - (b.name === 'Other assessments') || String(a.code || a.name).localeCompare(String(b.code || b.name)));

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {subjects.map((s) => {
                const final = finals.get(s.name);
                return (
                <section key={s.name} className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30 p-4 min-w-0">
                    <header className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100 leading-snug">{s.name}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {s.code ? `${s.code} · ` : ''}{s.marks.length} {s.marks.length === 1 ? 'mark' : 'marks'} · {final && final.total !== null ? `final mark ${final.total.toFixed(1)} / 100` : `average so far ${s.average.toFixed(1)}%`}
                            </p>
                        </div>
                        {final && final.total !== null
                            ? <GradeChip pct={final.total} grade={final.grade} large />
                            : <GradeChip pct={s.average} grade={gradeFor(s.average)} large />}
                    </header>

                    <ul className="flex flex-col gap-2">
                        {s.marks.map((m) => {
                            const pct = Math.max(0, Math.min(100, m.percentage));
                            return (
                                <li key={m.id} className="bg-white dark:bg-slate-800 rounded-xl px-3 py-2.5 border border-slate-100 dark:border-slate-700/50">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-slate-800 dark:text-slate-100" title={m.date.toLocaleDateString()}>{m.assessment_name}</span>
                                            <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${m.component === 'EXAM'
                                                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                {m.component === 'EXAM' ? 'Exam' : 'Class work'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                                {Number(m.score)}<span className="text-slate-400 font-normal"> / {Number(m.max_score)}</span>
                                            </span>
                                            <GradeChip pct={m.percentage} grade={gradeFor(m.percentage)} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${m.assessment_name} ${pct.toFixed(0)}%`}>
                                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: toneFor(pct).bar }} />
                                        </div>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums w-11 text-right">{pct.toFixed(0)}%</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>
                );
            })}
        </div>
    );
};

export default AssessmentsBySubject;
