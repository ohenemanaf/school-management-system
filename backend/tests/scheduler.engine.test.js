const { test } = require('node:test');
const assert = require('node:assert');
const { generateTimetable, verifyTimetable } = require('../src/modules/scheduler/engine');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [
    { no: 1, start: '08:00', end: '08:45' }, { no: 2, start: '08:45', end: '09:30' },
    { no: 3, start: '09:30', end: '10:15' }, { no: 4, start: '10:45', end: '11:30' },
    { no: 5, start: '11:30', end: '12:15' }, { no: 6, start: '13:00', end: '13:45' },
    { no: 7, start: '13:45', end: '14:30' }, { no: 8, start: '14:30', end: '15:15' },
];
const FAST = { timeLimitMs: 300, improveMs: 200 };

/** A small school: two levels, Gold and Diamond streams, six subjects, five teachers. */
function school(overrides = {}) {
    const classes = [
        { id: 1, name: 'Form 1 Gold', size: 30, level: 'Form 1' },
        { id: 2, name: 'Form 1 Diamond', size: 32, level: 'Form 1' },
        { id: 3, name: 'Form 2 Gold', size: 28, level: 'Form 2' },
        { id: 4, name: 'Form 2 Diamond', size: 30, level: 'Form 2' },
    ];
    const subjects = [
        { id: 10, name: 'Mathematics', heavy: true }, { id: 11, name: 'Science', heavy: true },
        { id: 12, name: 'English', heavy: false }, { id: 13, name: 'Social Studies', heavy: false },
        { id: 14, name: 'ICT', heavy: false }, { id: 15, name: 'French', heavy: false },
    ];
    const teachers = [
        { id: 100, name: 'Ama (Maths)', maxPerWeek: 25, maxPerDay: 6 },
        { id: 101, name: 'Kofi (Maths, Science)', maxPerWeek: 25, maxPerDay: 6 },
        { id: 102, name: 'Esi (Science)', maxPerWeek: 25, maxPerDay: 6 },
        { id: 103, name: 'Yaw (English, Social)', maxPerWeek: 25, maxPerDay: 6 },
        { id: 104, name: 'Akua (ICT, French, English)', maxPerWeek: 25, maxPerDay: 6 },
    ];
    const proficiencies = [
        { teacherId: 100, subjectId: 10, level: 3 }, { teacherId: 101, subjectId: 10, level: 2 },
        { teacherId: 101, subjectId: 11, level: 2 }, { teacherId: 102, subjectId: 11, level: 3 },
        { teacherId: 103, subjectId: 12, level: 3 }, { teacherId: 103, subjectId: 13, level: 3 },
        { teacherId: 104, subjectId: 14, level: 3 }, { teacherId: 104, subjectId: 15, level: 2 },
        { teacherId: 104, subjectId: 12, level: 1 },
    ];
    const perClass = [[10, 5], [11, 4], [12, 4], [13, 3], [14, 2], [15, 2]];
    const requirements = classes.flatMap((c) => perClass.map(([subjectId, periodsPerWeek]) => ({ classId: c.id, subjectId, periodsPerWeek })));
    const rooms = [
        { id: 1, name: 'Room A', capacity: 35 }, { id: 2, name: 'Room B', capacity: 35 },
        { id: 3, name: 'Room C', capacity: 35 }, { id: 4, name: 'Room D', capacity: 35 },
        { id: 5, name: 'Lab', capacity: 30 },
    ];
    return { days: DAYS, periods: PERIODS, rooms, classes, teachers, proficiencies, subjects, requirements, options: FAST, ...overrides };
}

test('places every lesson for a feasible school with no double bookings', () => {
    const input = school();
    const result = generateTimetable(input);
    assert.deepStrictEqual(result.unassigned, []);
    assert.deepStrictEqual(result.unplaced, []);
    assert.strictEqual(result.lessons.length, 4 * 20);
    assert.deepStrictEqual(verifyTimetable(result.lessons), []);
});

test('every class gets exactly the periods it was allocated', () => {
    const input = school();
    const result = generateTimetable(input);
    for (const req of input.requirements) {
        const count = result.lessons.filter((l) => l.classId === req.classId && l.subjectId === req.subjectId).length;
        assert.strictEqual(count, req.periodsPerWeek, `class ${req.classId} subject ${req.subjectId}`);
    }
});

test('teachers only teach subjects they are qualified for', () => {
    const input = school();
    const qualified = new Set(input.proficiencies.map((p) => `${p.teacherId}|${p.subjectId}`));
    for (const l of generateTimetable(input).lessons) {
        assert.ok(qualified.has(`${l.teacherId}|${l.subjectId}`), `teacher ${l.teacherId} for subject ${l.subjectId}`);
    }
});

test('teachers stay within their weekly and daily limits', () => {
    const input = school();
    const result = generateTimetable(input);
    for (const t of input.teachers) {
        const mine = result.lessons.filter((l) => l.teacherId === t.id);
        assert.ok(mine.length <= t.maxPerWeek);
        for (const day of DAYS) assert.ok(mine.filter((l) => l.day === day).length <= t.maxPerDay, `${t.name} on ${day}`);
    }
});

test('a subject is spread over the week, never stacked on one day', () => {
    const result = generateTimetable(school());
    const perDay = new Map();
    for (const l of result.lessons) {
        const k = `${l.classId}|${l.subjectId}|${l.day}`;
        perDay.set(k, (perDay.get(k) || 0) + 1);
    }
    // Maths has 5 periods over 5 days, so at most 1 a day.
    for (const [k, n] of perDay) assert.ok(n <= 1, `${k} has ${n} lessons`);
});

test('heavy subjects mostly land in the morning', () => {
    const result = generateTimetable(school());
    const heavy = result.lessons.filter((l) => l.subjectId === 10 || l.subjectId === 11);
    const morning = heavy.filter((l) => l.period <= 4).length;
    assert.ok(morning / heavy.length >= 0.8, `${morning} of ${heavy.length} heavy lessons in the morning`);
});

test('parallel streams of a level share the same subject teacher when capacity allows', () => {
    const result = generateTimetable(school());
    const teacherFor = (classId, subjectId) => result.teacherAssignments.find((a) => a.classId === classId && a.subjectId === subjectId).teacherId;
    assert.strictEqual(teacherFor(1, 10), teacherFor(2, 10), 'Form 1 Gold and Diamond Maths');
});

test('workload is balanced across qualified teachers', () => {
    // Two equally skilled English teachers should split four classes, not one take all.
    const input = school();
    input.proficiencies = input.proficiencies.filter((p) => p.subjectId !== 12)
        .concat([{ teacherId: 103, subjectId: 12, level: 2 }, { teacherId: 104, subjectId: 12, level: 2 }]);
    const result = generateTimetable(input);
    const englishTeachers = new Set(result.teacherAssignments.filter((a) => a.subjectId === 12).map((a) => a.teacherId));
    assert.strictEqual(englishTeachers.size, 2);
});

test('fixed lessons of other classes are never overlapped', () => {
    const blocked = [
        { classId: 1, teacherId: 100, roomId: 1, day: 'Monday', period: 1 },
        { teacherId: 103, roomId: 2, day: 'Tuesday', period: 2 },
    ];
    const result = generateTimetable(school({ blocked }));
    assert.deepStrictEqual(verifyTimetable(result.lessons, blocked), []);
});

test('a subject with no qualified teacher is reported, not silently dropped', () => {
    const input = school();
    input.subjects.push({ id: 16, name: 'Music', heavy: false });
    input.requirements.push({ classId: 1, subjectId: 16, periodsPerWeek: 2 });
    const result = generateTimetable(input);
    assert.deepStrictEqual(result.unassigned.map((u) => [u.classId, u.subjectId]), [[1, 16]]);
    assert.match(result.unassigned[0].reason, /No teacher is qualified/);
});

test('a teacher at their weekly limit is not given more classes', () => {
    const input = school();
    input.teachers = input.teachers.map((t) => (t.id === 104 ? { ...t, maxPerWeek: 4 } : t));
    const result = generateTimetable(input);
    const akua = result.lessons.filter((l) => l.teacherId === 104).length;
    assert.ok(akua <= 4);
    assert.ok(result.unassigned.some((u) => /weekly limit/.test(u.reason)));
});

test('impossible demand is reported with a reason instead of double-booking', () => {
    // One class, 45 periods asked for, only 40 slots in the week.
    const input = school({
        classes: [{ id: 1, name: 'Overloaded', size: 20, level: 'X' }],
        teachers: [{ id: 100, name: 'Busy', maxPerWeek: 60, maxPerDay: 8 }, { id: 101, name: 'Busy 2', maxPerWeek: 60, maxPerDay: 8 }],
        proficiencies: [{ teacherId: 100, subjectId: 10, level: 3 }, { teacherId: 101, subjectId: 11, level: 3 }],
        requirements: [{ classId: 1, subjectId: 10, periodsPerWeek: 25 }, { classId: 1, subjectId: 11, periodsPerWeek: 20 }],
    });
    const result = generateTimetable(input);
    assert.deepStrictEqual(verifyTimetable(result.lessons), []);
    const missing = result.unplaced.reduce((s, u) => s + u.missing, 0);
    assert.ok(missing >= 5, `${missing} lessons could not be placed`);
    assert.ok(result.unplaced.every((u) => u.reason.length > 0));
});

test('an admin-fixed teacher is honoured and flagged when not qualified', () => {
    const input = school();
    input.requirements = input.requirements.map((r) => (r.classId === 1 && r.subjectId === 15 ? { ...r, teacherId: 103 } : r));
    const result = generateTimetable(input);
    assert.ok(result.lessons.filter((l) => l.classId === 1 && l.subjectId === 15).every((l) => l.teacherId === 103));
    assert.ok(result.warnings.some((w) => /without that subject/.test(w)));
});

test('the same seed gives the same timetable', () => {
    const opts = { seed: 42, timeLimitMs: 0, improveMs: 0, minAttempts: 2, maxAttempts: 2 };
    const a = generateTimetable(school({ options: opts }));
    const b = generateTimetable(school({ options: opts }));
    assert.deepStrictEqual(a.lessons, b.lessons);
});

test('verifyTimetable catches a double booking', () => {
    const lessons = [
        { classId: 1, teacherId: 100, roomId: 1, day: 'Monday', period: 1 },
        { classId: 2, teacherId: 100, roomId: 2, day: 'Monday', period: 1 },
    ];
    assert.match(verifyTimetable(lessons)[0], /Teacher 100 is double-booked/);
});
