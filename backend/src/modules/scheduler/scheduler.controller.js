const db = require('../../config/db');
const service = require('./scheduler.service');

const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const int = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const isPositiveInt = (v) => Number.isInteger(v) && v > 0;

/** Wraps a handler: known errors become their status, everything else a 500. */
const handle = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (error) {
        if (error.status && error.status < 500) return res.status(error.status).json({ message: error.message });
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'That already exists.' });
        if (error.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ message: 'A referenced record does not exist.' });
        console.error('Scheduler error:', error);
        res.status(500).json({ message: error.status === 500 ? error.message : 'Server error' });
    }
};

const SchedulerController = {
    setup: handle(async (req, res) => {
        res.json(await service.getSetup(req.query.term_id));
    }),

    // --- Bell schedule -----------------------------------------------------------
    saveBell: handle(async (req, res) => {
        const periods = req.body.periods;
        if (!Array.isArray(periods) || periods.length === 0 || periods.length > 20) {
            return res.status(400).json({ message: 'Provide between 1 and 20 periods.' });
        }
        let previousEnd = '';
        for (const [i, p] of periods.entries()) {
            if (!p.label || !TIME.test(p.start_time) || !TIME.test(p.end_time) || !['LESSON', 'BREAK'].includes(p.kind || 'LESSON')) {
                return res.status(400).json({ message: `Row ${i + 1}: give a label, start and end times (HH:MM) and a type.` });
            }
            const start = p.start_time.slice(0, 5);
            const end = p.end_time.slice(0, 5);
            if (start >= end) return res.status(400).json({ message: `Row ${i + 1}: the start must be before the end.` });
            if (previousEnd && start < previousEnd) return res.status(400).json({ message: `Row ${i + 1} overlaps the row before it.` });
            previousEnd = end;
        }
        if (!periods.some((p) => (p.kind || 'LESSON') === 'LESSON')) {
            return res.status(400).json({ message: 'Include at least one lesson period.' });
        }
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            await conn.execute('DELETE FROM bell_periods');
            await conn.query(
                'INSERT INTO bell_periods (period_no, label, start_time, end_time, kind) VALUES ?',
                [periods.map((p, i) => [i + 1, String(p.label).slice(0, 50), p.start_time, p.end_time, p.kind || 'LESSON'])]
            );
            await conn.commit();
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
        res.json({ message: 'Bell schedule saved' });
    }),

    // --- Streams and classes -----------------------------------------------------
    createStream: handle(async (req, res) => {
        const name = String(req.body.name || '').trim();
        if (!name || name.length > 50) return res.status(400).json({ message: 'Give the stream a name (up to 50 characters).' });
        const [result] = await db.execute('INSERT INTO streams (name, sort_order) VALUES (?, ?)', [name, int(req.body.sort_order) || 0]);
        res.status(201).json({ id: result.insertId, name });
    }),

    deleteStream: handle(async (req, res) => {
        const [result] = await db.execute('DELETE FROM streams WHERE id = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Stream not found' });
        res.json({ message: 'Stream removed; its classes keep their names and level.' });
    }),

    setClassStream: handle(async (req, res) => {
        const streamId = int(req.body.stream_id);
        const [result] = await db.execute('UPDATE student_groups SET stream_id = ? WHERE id = ?', [streamId, req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Class not found' });
        res.json({ message: 'Class updated' });
    }),

    // --- Subjects and teachers -----------------------------------------------------
    setSubjectHeavy: handle(async (req, res) => {
        const [result] = await db.execute('UPDATE courses SET is_heavy = ? WHERE id = ?', [req.body.is_heavy ? 1 : 0, req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Subject not found' });
        res.json({ message: 'Subject updated' });
    }),

    saveTeacher: handle(async (req, res) => {
        const maxPerWeek = int(req.body.maxPerWeek);
        const maxPerDay = int(req.body.maxPerDay);
        const subjects = req.body.subjects || [];
        if (!isPositiveInt(maxPerWeek) || maxPerWeek > 60 || !isPositiveInt(maxPerDay) || maxPerDay > 12) {
            return res.status(400).json({ message: 'Weekly limit must be 1-60 periods and daily limit 1-12.' });
        }
        if (!Array.isArray(subjects) || subjects.some((s) => !isPositiveInt(int(s.courseId)) || ![1, 2, 3].includes(int(s.proficiency)))) {
            return res.status(400).json({ message: 'Each subject needs a level of 1, 2 or 3.' });
        }
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const [result] = await conn.execute(
                'UPDATE lecturers SET max_periods_per_week = ?, max_periods_per_day = ? WHERE id = ?',
                [maxPerWeek, maxPerDay, req.params.id]
            );
            if (!result.affectedRows) throw service.fail(404, 'Lecturer not found');
            await conn.execute('DELETE FROM lecturer_subjects WHERE lecturer_id = ?', [req.params.id]);
            if (subjects.length) {
                await conn.query('INSERT INTO lecturer_subjects (lecturer_id, course_id, proficiency) VALUES ?',
                    [subjects.map((s) => [Number(req.params.id), int(s.courseId), int(s.proficiency)])]);
            }
            await conn.commit();
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
        res.json({ message: 'Teacher updated' });
    }),

    // --- Allocations -----------------------------------------------------------------
    saveAllocations: handle(async (req, res) => {
        const termId = int(req.body.termId);
        const items = req.body.items;
        if (!isPositiveInt(termId) || !Array.isArray(items)) return res.status(400).json({ message: 'termId and items are required.' });
        const seen = new Set();
        for (const item of items) {
            const courseId = int(item.courseId);
            const periods = int(item.periodsPerWeek);
            if (!isPositiveInt(courseId) || !isPositiveInt(periods) || periods > 15) {
                return res.status(400).json({ message: 'Each subject needs between 1 and 15 periods a week.' });
            }
            if (seen.has(courseId)) return res.status(400).json({ message: 'A subject is listed twice for this class.' });
            seen.add(courseId);
        }
        const total = items.reduce((sum, i) => sum + int(i.periodsPerWeek), 0);
        const [[{ lessons }]] = await db.execute("SELECT COUNT(*) AS lessons FROM bell_periods WHERE kind = 'LESSON'");
        const weekly = Number(lessons) * 5;
        if (weekly && total > weekly) {
            return res.status(400).json({ message: `That is ${total} periods a week, but the week only has ${weekly}.` });
        }
        await service.requireTerm(termId);
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            await conn.execute('DELETE FROM class_subjects WHERE term_id = ? AND student_group_id = ?', [termId, req.params.groupId]);
            if (items.length) {
                await conn.query(
                    'INSERT INTO class_subjects (term_id, student_group_id, course_id, periods_per_week, lecturer_id) VALUES ?',
                    [items.map((i) => [termId, Number(req.params.groupId), int(i.courseId), int(i.periodsPerWeek), int(i.lecturerId)])]
                );
            }
            await conn.commit();
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
        res.json({ message: 'Allocations saved', totalPeriods: total });
    }),

    copyAllocations: handle(async (req, res) => {
        const termId = int(req.body.termId);
        const fromGroupId = int(req.body.fromGroupId);
        const toGroupIds = (req.body.toGroupIds || []).map(int).filter((id) => isPositiveInt(id) && id !== fromGroupId);
        if (!isPositiveInt(termId) || !isPositiveInt(fromGroupId) || toGroupIds.length === 0) {
            return res.status(400).json({ message: 'termId, fromGroupId and at least one target class are required.' });
        }
        const [source] = await db.execute(
            'SELECT course_id, periods_per_week FROM class_subjects WHERE term_id = ? AND student_group_id = ?', [termId, fromGroupId]
        );
        if (!source.length) return res.status(400).json({ message: 'The source class has no subjects for this term.' });
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            await conn.query('DELETE FROM class_subjects WHERE term_id = ? AND student_group_id IN (?)', [termId, toGroupIds]);
            // Teachers are not copied: one teacher cannot be in two classes at once, so the engine chooses.
            await conn.query(
                'INSERT INTO class_subjects (term_id, student_group_id, course_id, periods_per_week, lecturer_id) VALUES ?',
                [toGroupIds.flatMap((groupId) => source.map((s) => [termId, groupId, s.course_id, s.periods_per_week, null]))]
            );
            await conn.commit();
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
        res.json({ message: `Copied to ${toGroupIds.length} classes` });
    }),

    // --- Generate and publish ---------------------------------------------------------
    generate: handle(async (req, res) => {
        const termId = int(req.body.termId);
        if (!isPositiveInt(termId)) return res.status(400).json({ message: 'Choose a term.' });
        const seed = int(req.body.seed);
        const run = await service.generate({ termId, seed: Number.isInteger(seed) ? seed : undefined, userId: req.user.id });
        res.status(201).json(run);
    }),

    listRuns: handle(async (req, res) => {
        res.json(await service.listRuns(int(req.query.term_id)));
    }),

    getRun: handle(async (req, res) => {
        res.json(await service.getRun(req.params.id));
    }),

    publish: handle(async (req, res) => {
        const result = await service.publish(req.params.id);
        res.json({ message: `Published ${result.published} lessons for ${result.classes} classes.`, ...result });
    }),
};

module.exports = { SchedulerController, handle };
