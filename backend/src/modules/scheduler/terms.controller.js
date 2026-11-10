const db = require('../../config/db');
const { handle } = require('./scheduler.controller');

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const AUDIENCES = ['ALL', 'STUDENT', 'LECTURER'];

function parseAlertDays(value) {
    const text = value === undefined || value === null || value === '' ? '14,7,1' : String(value);
    const days = text.split(',').map((d) => d.trim()).filter(Boolean).map(Number);
    if (!days.length || days.some((d) => !Number.isInteger(d) || d < 0 || d > 90)) return null;
    return [...new Set(days)].sort((a, b) => b - a).join(',');
}

async function termsWithExams(where = '', params = []) {
    const [terms] = await db.execute(`SELECT id, name, start_date, end_date, is_current FROM terms ${where} ORDER BY start_date DESC`, params);
    if (!terms.length) return [];
    const [exams] = await db.query(
        'SELECT id, term_id, name, start_date, end_date, alert_days, audience FROM exam_periods WHERE term_id IN (?) ORDER BY start_date',
        [terms.map((t) => t.id)]
    );
    return terms.map((t) => ({ ...t, is_current: Boolean(t.is_current), exams: exams.filter((e) => e.term_id === t.id) }));
}

const TermsController = {
    list: handle(async (req, res) => {
        res.json(await termsWithExams());
    }),

    current: handle(async (req, res) => {
        const [term] = await termsWithExams('WHERE is_current = 1');
        res.json(term || null);
    }),

    create: handle(async (req, res) => {
        const { name, start_date, end_date, is_current } = req.body;
        if (!name || !DATE.test(start_date || '') || !DATE.test(end_date || '') || start_date >= end_date) {
            return res.status(400).json({ message: 'Give a name and a start date before the end date (YYYY-MM-DD).' });
        }
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            if (is_current) await conn.execute('UPDATE terms SET is_current = 0');
            const [result] = await conn.execute(
                'INSERT INTO terms (name, start_date, end_date, is_current) VALUES (?, ?, ?, ?)',
                [String(name).slice(0, 100), start_date, end_date, is_current ? 1 : 0]
            );
            await conn.commit();
            res.status(201).json({ id: result.insertId });
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }),

    update: handle(async (req, res) => {
        const { name, start_date, end_date } = req.body;
        if (!name || !DATE.test(start_date || '') || !DATE.test(end_date || '') || start_date >= end_date) {
            return res.status(400).json({ message: 'Give a name and a start date before the end date (YYYY-MM-DD).' });
        }
        const [result] = await db.execute('UPDATE terms SET name = ?, start_date = ?, end_date = ? WHERE id = ?',
            [String(name).slice(0, 100), start_date, end_date, req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Term not found' });
        res.json({ message: 'Term updated' });
    }),

    makeCurrent: handle(async (req, res) => {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const [exists] = await conn.execute('SELECT id FROM terms WHERE id = ?', [req.params.id]);
            if (!exists.length) {
                await conn.rollback();
                return res.status(404).json({ message: 'Term not found' });
            }
            await conn.execute('UPDATE terms SET is_current = (id = ?)', [req.params.id]);
            await conn.commit();
            res.json({ message: 'Current term updated' });
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }),

    remove: handle(async (req, res) => {
        const [result] = await db.execute('DELETE FROM terms WHERE id = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Term not found' });
        res.json({ message: 'Term deleted with its exam periods, allocations and drafts. The live timetable is unchanged.' });
    }),

    addExam: handle(async (req, res) => {
        const { name, start_date, end_date } = req.body;
        const audience = req.body.audience || 'ALL';
        const alertDays = parseAlertDays(req.body.alert_days);
        if (!name || !DATE.test(start_date || '') || !DATE.test(end_date || '') || start_date > end_date) {
            return res.status(400).json({ message: 'Give the exam a name and dates (start on or before end).' });
        }
        if (!AUDIENCES.includes(audience) || !alertDays) {
            return res.status(400).json({ message: 'Alert days must be whole numbers 0-90 separated by commas, e.g. 14,7,1.' });
        }
        const [result] = await db.execute(
            'INSERT INTO exam_periods (term_id, name, start_date, end_date, alert_days, audience) VALUES (?, ?, ?, ?, ?, ?)',
            [req.params.id, String(name).slice(0, 150), start_date, end_date, alertDays, audience]
        );
        res.status(201).json({ id: result.insertId });
    }),

    updateExam: handle(async (req, res) => {
        const { name, start_date, end_date } = req.body;
        const audience = req.body.audience || 'ALL';
        const alertDays = parseAlertDays(req.body.alert_days);
        if (!name || !DATE.test(start_date || '') || !DATE.test(end_date || '') || start_date > end_date || !AUDIENCES.includes(audience) || !alertDays) {
            return res.status(400).json({ message: 'Check the exam name, dates, audience and alert days.' });
        }
        const [result] = await db.execute(
            'UPDATE exam_periods SET name = ?, start_date = ?, end_date = ?, alert_days = ?, audience = ? WHERE id = ?',
            [String(name).slice(0, 150), start_date, end_date, alertDays, audience, req.params.examId]
        );
        if (!result.affectedRows) return res.status(404).json({ message: 'Exam period not found' });
        res.json({ message: 'Exam period updated' });
    }),

    removeExam: handle(async (req, res) => {
        const [result] = await db.execute('DELETE FROM exam_periods WHERE id = ?', [req.params.examId]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Exam period not found' });
        res.json({ message: 'Exam period deleted' });
    }),
};

module.exports = { TermsController, parseAlertDays };
