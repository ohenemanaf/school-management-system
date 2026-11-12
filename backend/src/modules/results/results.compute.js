// Semester results maths, kept free of database access so it can be tested.
//
// Per subject: class work and exam are each turned into a percentage of their
// maximum marks, then weighted (default 30% class work / 70% exam) into a
// total out of 100, looked up on the grading scale. A subject with no exam
// mark yet is "IC" (incomplete) and is left out of GPA and averages.

const round = (value, places = 1) => (value === null || value === undefined ? null : Math.round(value * 10 ** places) / 10 ** places);
const sum = (list, pick) => list.reduce((total, item) => total + Number(pick(item)), 0);

/** The scale row for a total (scale rows are { min_score, grade, grade_point, remark }). */
function gradeFor(total, scale) {
    const sorted = [...scale].sort((a, b) => Number(b.min_score) - Number(a.min_score));
    return sorted.find((row) => total >= Number(row.min_score)) || sorted[sorted.length - 1] || null;
}

/**
 * @param {object} input
 * @param {{course_id:number, component:'CLASS'|'EXAM', assessment_name:string, score:number, max_score:number}[]} input.grades
 * @param {Map<number,{code:string,name:string,credit_hours:number}>} input.courses
 * @param {object[]} input.scale
 * @param {number} input.caWeight  percentage for class work (exam gets the rest)
 */
function computeTermResults({ grades, courses, scale, caWeight = 30 }) {
    const examWeight = 100 - caWeight;
    const byCourse = new Map();
    for (const g of grades) {
        if (!g.course_id) continue;
        if (!byCourse.has(g.course_id)) byCourse.set(g.course_id, []);
        byCourse.get(g.course_id).push(g);
    }

    const rows = [...byCourse].map(([courseId, list]) => {
        const course = courses.get(courseId) || { code: '', name: 'Unknown subject', credit_hours: 0 };
        const classWork = list.filter((g) => g.component !== 'EXAM');
        const exams = list.filter((g) => g.component === 'EXAM');
        const pct = (items) => (items.length ? (sum(items, (g) => g.score) / sum(items, (g) => g.max_score)) * 100 : null);
        const caPct = pct(classWork);
        const examPct = pct(exams);
        const caMark = caPct === null ? null : round((caPct * caWeight) / 100);
        const examMark = examPct === null ? null : round((examPct * examWeight) / 100);
        const complete = examPct !== null && (caPct !== null || caWeight === 0);
        const total = complete ? round((caMark || 0) + examMark) : null;
        const band = complete ? gradeFor(total, scale) : null;
        const credits = Number(course.credit_hours) || 0;
        return {
            courseId,
            code: course.code,
            name: course.name,
            credits,
            caMark,
            examMark,
            total,
            grade: band ? band.grade : 'IC',
            gradePoint: band ? Number(band.grade_point) : null,
            remark: band ? band.remark : 'Incomplete: exam mark not yet recorded',
            passed: band ? Number(band.grade_point) > 0 : false,
            complete,
            assessments: list.map((g) => ({
                name: g.assessment_name, component: g.component, score: Number(g.score), maxScore: Number(g.max_score),
            })),
        };
    }).sort((a, b) => String(a.code).localeCompare(String(b.code)) || a.name.localeCompare(b.name));

    const graded = rows.filter((r) => r.complete);
    const creditsAttempted = sum(graded, (r) => r.credits);
    const qualityPoints = sum(graded, (r) => r.gradePoint * r.credits);
    const weightedMarks = sum(graded, (r) => r.total * r.credits);

    return {
        rows,
        summary: {
            subjects: rows.length,
            incomplete: rows.length - graded.length,
            creditsAttempted,
            creditsEarned: sum(graded.filter((r) => r.passed), (r) => r.credits),
            qualityPoints: round(qualityPoints, 2),
            gpa: creditsAttempted ? round(qualityPoints / creditsAttempted, 2) : null,
            weightedAverage: creditsAttempted ? round(weightedMarks / creditsAttempted, 1) : null,
        },
    };
}

/** Cumulative GPA over several terms' summaries. */
function cumulative(summaries) {
    const credits = sum(summaries, (s) => s.creditsAttempted);
    const points = sum(summaries, (s) => s.qualityPoints);
    return { credits, cgpa: credits ? round(points / credits, 2) : null };
}

module.exports = { computeTermResults, cumulative, gradeFor };
