const db = require('../../config/db');
const { scopeClause } = require('../../utils/currentProfile');

// Groups or assessments with fewer graded students than this are not broken
// down, so an average can never reveal one student's mark.
const MIN_STUDENTS = 3;
const PASS_RATIO = 0.5;

class GradesModel {
    /** Most recent grades first, optionally for one group. Always capped. */
    static async findAll({ studentGroupId, limit, scope = null } = {}) {
        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 500, 1), 2000);
        const conditions = [];
        const params = [];
        if (studentGroupId) {
            conditions.push('g.student_group_id = ?');
            params.push(studentGroupId);
        }
        const scoped = scopeClause('g.student_group_id', scope);
        if (scoped.sql) { conditions.push(scoped.sql); params.push(...scoped.params); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const [rows] = await db.execute(`
            SELECT g.id, g.assessment_name, g.score, g.max_score, g.created_at,
                   s.first_name, s.last_name, s.enrollment_number,
                   sg.name as student_group_name
            FROM grades g
            JOIN students s ON g.student_id = s.id
            JOIN student_groups sg ON g.student_group_id = sg.id
            ${where}
            ORDER BY g.created_at DESC, g.id DESC
            LIMIT ${safeLimit}`, params);
        return rows;
    }

    static async findByStudent(studentId) {
        const [rows] = await db.execute(`
            SELECT g.id, g.assessment_name, g.score, g.max_score, g.created_at, sg.name as student_group_name
            FROM grades g
            JOIN student_groups sg ON g.student_group_id = sg.id
            WHERE g.student_id = ?
            ORDER BY g.created_at DESC
        `, [studentId]);
        return rows;
    }

    /**
     * School-wide performance without any student names: totals, per class,
     * per assessment and a score distribution. Small groups are suppressed.
     */
    static async analytics() {
        const pct = 'g.score / g.max_score * 100';
        const [[overall]] = await db.execute(`
            SELECT COUNT(*) AS grades, COUNT(DISTINCT g.student_id) AS students,
                   COUNT(DISTINCT g.assessment_name) AS assessments,
                   AVG(${pct}) AS average, AVG(g.score / g.max_score >= ${PASS_RATIO}) * 100 AS pass_rate
            FROM grades g`);
        const [byGroup] = await db.execute(`
            SELECT sg.id AS student_group_id, sg.name AS student_group_name,
                   COUNT(DISTINCT g.student_id) AS students, COUNT(*) AS grades,
                   AVG(${pct}) AS average, AVG(g.score / g.max_score >= ${PASS_RATIO}) * 100 AS pass_rate
            FROM grades g JOIN student_groups sg ON sg.id = g.student_group_id
            GROUP BY sg.id, sg.name
            ORDER BY sg.name`);
        const [byAssessment] = await db.execute(`
            SELECT g.assessment_name, COUNT(DISTINCT g.student_id) AS students,
                   AVG(${pct}) AS average, AVG(g.score / g.max_score >= ${PASS_RATIO}) * 100 AS pass_rate
            FROM grades g
            GROUP BY g.assessment_name
            ORDER BY g.assessment_name`);
        const [[bands]] = await db.execute(`
            SELECT SUM(${pct} < 40) AS b0, SUM(${pct} >= 40 AND ${pct} < 50) AS b40,
                   SUM(${pct} >= 50 AND ${pct} < 60) AS b50, SUM(${pct} >= 60 AND ${pct} < 70) AS b60,
                   SUM(${pct} >= 70 AND ${pct} < 80) AS b70, SUM(${pct} >= 80) AS b80
            FROM grades g`);

        const round = (value) => (value === null || value === undefined ? null : Math.round(Number(value) * 10) / 10);
        const summarise = (row) => {
            const suppressed = Number(row.students) < MIN_STUDENTS;
            return {
                ...row,
                students: Number(row.students),
                average: suppressed ? null : round(row.average),
                pass_rate: suppressed ? null : round(row.pass_rate),
                suppressed,
            };
        };
        const labels = ['0-39', '40-49', '50-59', '60-69', '70-79', '80-100'];
        const keys = ['b0', 'b40', 'b50', 'b60', 'b70', 'b80'];

        return {
            overall: {
                grades: Number(overall?.grades || 0),
                students: Number(overall?.students || 0),
                assessments: Number(overall?.assessments || 0),
                average: round(overall?.average),
                pass_rate: round(overall?.pass_rate),
            },
            byGroup: byGroup.map(summarise),
            byAssessment: byAssessment.map(summarise),
            distribution: labels.map((band, i) => ({ band, count: Number(bands?.[keys[i]] || 0) })),
            minStudents: MIN_STUDENTS,
            passMark: PASS_RATIO * 100,
        };
    }

    static async create(gradeData) {
        const { studentId, studentGroupId, assessmentName, score, maxScore } = gradeData;
        const [result] = await db.execute(`
            INSERT INTO grades (student_id, student_group_id, assessment_name, score, max_score) 
            VALUES (?, ?, ?, ?, ?)
        `, [studentId, studentGroupId, assessmentName, score, maxScore]);
        return result.insertId;
    }
}
GradesModel.MIN_STUDENTS = MIN_STUDENTS;
module.exports = GradesModel;
