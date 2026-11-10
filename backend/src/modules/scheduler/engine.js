/**
 * Timetable engine: a constraint-satisfaction scheduler with no database access,
 * so it can be tested in isolation and reused (generate, preview, verify).
 *
 * Hard rules (never broken):
 *   - a class, a teacher and a room are each in at most one place per period
 *   - teachers stay within their weekly and daily period limits
 *   - one subject is not taught to a class more than ceil(periods/days) times a day
 *   - periods blocked by fixed lessons (classes not being generated) stay free
 *   - a subject is only taught by a teacher qualified for it (unless fixed by an admin)
 *
 * Soft goals (minimised as a penalty):
 *   - heavy subjects in the morning, at most `maxHeavyPerDay` per class per day
 *   - a subject spread across different days
 *   - few idle gaps for classes and teachers; lessons spread evenly over the week
 *   - rooms big enough for the class
 *
 * Method: assign teachers (best skill, least load, consistent across streams), then
 * place lessons most-constrained-first with scored greedy choices and one-step
 * repair (move a blocking lesson), repeated with different seeds; keep the best
 * and improve it with local search.
 */

const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const WEIGHTS = {
    heavyAfternoon: 3,
    heavyOverload: 5,
    subjectSameDay: 4,
    roomTooSmall: 4,
    classGap: 2,
    teacherGap: 1,
    classImbalance: 1,
};

/** Small, fast, seedable random generator (deterministic results for a seed). */
function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const key = (...parts) => parts.join('|');

// ---------------------------------------------------------------------------
// 1. Teacher assignment
// ---------------------------------------------------------------------------

function assignTeachers(ctx) {
    const { requirements, teachersById, proficiency, classesById, blockedTeacherPeriods } = ctx;
    const load = new Map();
    for (const t of teachersById.values()) load.set(t.id, blockedTeacherPeriods.get(t.id) || 0);

    const assigned = [];
    const unassigned = [];
    const warnings = [];
    // subject+level -> teacher, so parallel streams of one level share a teacher where possible
    const levelSubjectTeacher = new Map();

    const fixed = requirements.filter((r) => r.teacherId);
    const open = requirements.filter((r) => !r.teacherId);

    for (const req of fixed) {
        const teacher = teachersById.get(req.teacherId);
        if (!teacher) {
            unassigned.push({ ...req, reason: 'The chosen teacher no longer exists or is inactive' });
            continue;
        }
        if (!proficiency.has(key(req.teacherId, req.subjectId))) {
            warnings.push(`${teacher.name} is fixed to teach ${ctx.subjectsById.get(req.subjectId)?.name} without that subject in their profile.`);
        }
        load.set(teacher.id, load.get(teacher.id) + req.periodsPerWeek);
        if (load.get(teacher.id) > teacher.maxPerWeek) {
            warnings.push(`${teacher.name} is fixed to more periods (${load.get(teacher.id)}) than their weekly limit (${teacher.maxPerWeek}).`);
        }
        assigned.push({ ...req });
        const level = classesById.get(req.classId)?.level;
        levelSubjectTeacher.set(key(level, req.subjectId), teacher.id);
    }

    const candidatesFor = (req) => [...teachersById.values()].filter((t) => proficiency.has(key(t.id, req.subjectId)));
    open.sort((a, b) => candidatesFor(a).length - candidatesFor(b).length || b.periodsPerWeek - a.periodsPerWeek || a.classId - b.classId);

    for (const req of open) {
        const candidates = candidatesFor(req);
        if (candidates.length === 0) {
            unassigned.push({ ...req, reason: 'No teacher is qualified for this subject' });
            continue;
        }
        const withRoom = candidates.filter((t) => load.get(t.id) + req.periodsPerWeek <= t.maxPerWeek);
        if (withRoom.length === 0) {
            unassigned.push({ ...req, reason: 'Every qualified teacher is already at their weekly limit' });
            continue;
        }
        const level = classesById.get(req.classId)?.level;
        const consistent = levelSubjectTeacher.get(key(level, req.subjectId));
        const score = (t) => proficiency.get(key(t.id, req.subjectId)) * 10
            - (load.get(t.id) / Math.max(t.maxPerWeek, 1)) * 8
            + (t.id === consistent ? 3 : 0);
        withRoom.sort((a, b) => score(b) - score(a) || a.id - b.id);
        const chosen = withRoom[0];
        load.set(chosen.id, load.get(chosen.id) + req.periodsPerWeek);
        levelSubjectTeacher.set(key(level, req.subjectId), chosen.id);
        assigned.push({ ...req, teacherId: chosen.id, autoAssigned: true });
    }

    return { assigned, unassigned, warnings };
}

// ---------------------------------------------------------------------------
// 2. Placement state
// ---------------------------------------------------------------------------

function createState(ctx) {
    return {
        placed: new Map(), // unitId -> { day, period, roomId }
        classSlot: new Map(), // class|day|period -> unitId
        teacherSlot: new Map(),
        roomSlot: new Map(),
        classSubjectDay: new Map(), // class|subject|day -> count
        teacherDay: new Map(), // teacher|day -> count
        classRoomUse: new Map(), // class|room -> count (keeps a class in "its" room)
        unplaced: new Set(ctx.units.map((u) => u.id)),
    };
}

function cloneState(state) {
    return {
        placed: new Map(state.placed),
        classSlot: new Map(state.classSlot),
        teacherSlot: new Map(state.teacherSlot),
        roomSlot: new Map(state.roomSlot),
        classSubjectDay: new Map(state.classSubjectDay),
        teacherDay: new Map(state.teacherDay),
        classRoomUse: new Map(state.classRoomUse),
        unplaced: new Set(state.unplaced),
    };
}

const inc = (map, k, by) => {
    const v = (map.get(k) || 0) + by;
    if (v === 0) map.delete(k); else map.set(k, v);
};

function place(state, unit, day, period, roomId) {
    state.placed.set(unit.id, { day, period, roomId });
    state.classSlot.set(key(unit.classId, day, period), unit.id);
    state.teacherSlot.set(key(unit.teacherId, day, period), unit.id);
    state.roomSlot.set(key(roomId, day, period), unit.id);
    inc(state.classSubjectDay, key(unit.classId, unit.subjectId, day), 1);
    inc(state.teacherDay, key(unit.teacherId, day), 1);
    inc(state.classRoomUse, key(unit.classId, roomId), 1);
    state.unplaced.delete(unit.id);
}

function unplace(state, unit) {
    const at = state.placed.get(unit.id);
    if (!at) return null;
    state.placed.delete(unit.id);
    state.classSlot.delete(key(unit.classId, at.day, at.period));
    state.teacherSlot.delete(key(unit.teacherId, at.day, at.period));
    state.roomSlot.delete(key(at.roomId, at.day, at.period));
    inc(state.classSubjectDay, key(unit.classId, unit.subjectId, at.day), -1);
    inc(state.teacherDay, key(unit.teacherId, at.day), -1);
    inc(state.classRoomUse, key(unit.classId, at.roomId), -1);
    state.unplaced.add(unit.id);
    return at;
}

/** Hard-rule check for putting `unit` at day/period (room chosen separately). */
function slotAllowed(ctx, state, unit, day, period) {
    if (ctx.blocked.has(key('c', unit.classId, day, period))) return false;
    if (ctx.blocked.has(key('t', unit.teacherId, day, period))) return false;
    if (state.classSlot.has(key(unit.classId, day, period))) return false;
    if (state.teacherSlot.has(key(unit.teacherId, day, period))) return false;
    if ((state.classSubjectDay.get(key(unit.classId, unit.subjectId, day)) || 0) >= unit.dayLimit) return false;
    const teacher = ctx.teachersById.get(unit.teacherId);
    const blockedToday = ctx.blockedTeacherDay.get(key(unit.teacherId, day)) || 0;
    if ((state.teacherDay.get(key(unit.teacherId, day)) || 0) + blockedToday >= teacher.maxPerDay) return false;
    return true;
}

/** Best free room: big enough, preferably the room the class already uses most. */
function pickRoom(ctx, state, unit, day, period) {
    let best = null;
    for (const room of ctx.rooms) {
        if (ctx.blocked.has(key('r', room.id, day, period))) continue;
        if (state.roomSlot.has(key(room.id, day, period))) continue;
        const fits = room.capacity >= unit.size;
        const familiarity = state.classRoomUse.get(key(unit.classId, room.id)) || 0;
        // Prefer rooms that fit, then the class's usual room, then the tightest fit.
        const score = (fits ? 1000 : 0) + familiarity * 10 - (fits ? (room.capacity - unit.size) / 100 : -room.capacity / 100);
        if (!best || score > best.score) best = { roomId: room.id, fits, score };
    }
    return best;
}

/** Local soft cost of placing `unit` at day/period, used to rank choices. */
function placementCost(ctx, state, unit, day, period, room, rng) {
    let cost = 0;
    const periodIndex = ctx.periodIndex.get(period);
    if (unit.heavy) {
        if (periodIndex >= ctx.morningPeriods) cost += WEIGHTS.heavyAfternoon;
        let heavyToday = 0;
        for (const p of ctx.periodNos) {
            const other = state.classSlot.get(key(unit.classId, day, p));
            if (other !== undefined && ctx.unitsById.get(other).heavy) heavyToday += 1;
        }
        if (heavyToday >= ctx.maxHeavyPerDay) cost += WEIGHTS.heavyOverload;
    }
    if ((state.classSubjectDay.get(key(unit.classId, unit.subjectId, day)) || 0) > 0 && unit.periodsPerWeek <= ctx.days.length) {
        cost += WEIGHTS.subjectSameDay;
    }
    if (!room.fits) cost += WEIGHTS.roomTooSmall;
    // Keep days compact: neighbours reduce gaps.
    const prev = ctx.periodNos[periodIndex - 1];
    const next = ctx.periodNos[periodIndex + 1];
    for (const p of [prev, next]) {
        if (p === undefined) continue;
        if (state.teacherSlot.has(key(unit.teacherId, day, p))) cost -= 0.5;
        if (state.classSlot.has(key(unit.classId, day, p))) cost -= 0.5;
    }
    // Spread a class's lessons across the week and fill earlier periods first.
    let classToday = 0;
    for (const p of ctx.periodNos) if (state.classSlot.has(key(unit.classId, day, p))) classToday += 1;
    cost += classToday * 0.6 + periodIndex * 0.05;
    return cost + rng() * 0.4;
}

function candidates(ctx, state, unit, rng) {
    const out = [];
    for (const day of ctx.days) {
        for (const period of ctx.periodNos) {
            if (!slotAllowed(ctx, state, unit, day, period)) continue;
            const room = pickRoom(ctx, state, unit, day, period);
            if (!room) continue;
            out.push({ day, period, roomId: room.roomId, cost: placementCost(ctx, state, unit, day, period, room, rng) });
        }
    }
    out.sort((a, b) => a.cost - b.cost);
    return out;
}

/** Try to make room for `unit` by moving one lesson that blocks it. */
function repair(ctx, state, unit, rng) {
    for (const day of ctx.days) {
        for (const period of ctx.periodNos) {
            if (ctx.blocked.has(key('c', unit.classId, day, period)) || ctx.blocked.has(key('t', unit.teacherId, day, period))) continue;
            const blockers = new Set();
            const c = state.classSlot.get(key(unit.classId, day, period));
            const t = state.teacherSlot.get(key(unit.teacherId, day, period));
            if (c !== undefined) blockers.add(c);
            if (t !== undefined) blockers.add(t);
            if (blockers.size !== 1) continue;
            const blocker = ctx.unitsById.get([...blockers][0]);
            const before = unplace(state, blocker);
            if (slotAllowed(ctx, state, unit, day, period)) {
                const room = pickRoom(ctx, state, unit, day, period);
                if (room) {
                    place(state, unit, day, period, room.roomId);
                    const moves = candidates(ctx, state, blocker, rng).filter((m) => !(m.day === day && m.period === period));
                    if (moves.length) {
                        place(state, blocker, moves[0].day, moves[0].period, moves[0].roomId);
                        return true;
                    }
                    unplace(state, unit);
                }
            }
            place(state, blocker, before.day, before.period, before.roomId);
        }
    }
    return false;
}

// ---------------------------------------------------------------------------
// 3. Scoring the whole timetable
// ---------------------------------------------------------------------------

function evaluate(ctx, state) {
    const breakdown = Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, 0]));
    const classDays = new Map(); // class|day -> [periodIndex]
    const teacherDays = new Map();
    const heavyPerClassDay = new Map();
    const subjectPerClassDay = new Map();

    for (const [unitId, at] of state.placed) {
        const unit = ctx.unitsById.get(unitId);
        const idx = ctx.periodIndex.get(at.period);
        if (unit.heavy) {
            if (idx >= ctx.morningPeriods) breakdown.heavyAfternoon += 1;
            inc(heavyPerClassDay, key(unit.classId, at.day), 1);
        }
        inc(subjectPerClassDay, key(unit.classId, unit.subjectId, at.day, unit.periodsPerWeek), 1);
        const room = ctx.roomsById.get(at.roomId);
        if (room && room.capacity < unit.size) breakdown.roomTooSmall += 1;
        const ck = key(unit.classId, at.day);
        if (!classDays.has(ck)) classDays.set(ck, []);
        classDays.get(ck).push(idx);
        const tk = key(unit.teacherId, at.day);
        if (!teacherDays.has(tk)) teacherDays.set(tk, []);
        teacherDays.get(tk).push(idx);
    }
    for (const count of heavyPerClassDay.values()) if (count > ctx.maxHeavyPerDay) breakdown.heavyOverload += count - ctx.maxHeavyPerDay;
    for (const [k, count] of subjectPerClassDay) {
        const ppw = Number(k.split('|')[3]);
        if (ppw <= ctx.days.length && count > 1) breakdown.subjectSameDay += count - 1;
    }
    const gaps = (list) => {
        if (list.length < 2) return 0;
        list.sort((a, b) => a - b);
        return list[list.length - 1] - list[0] + 1 - list.length;
    };
    for (const list of classDays.values()) breakdown.classGap += gaps(list);
    for (const list of teacherDays.values()) breakdown.teacherGap += gaps(list);

    // Imbalance: how far each class's daily lesson count is from its weekly average.
    const perClass = new Map();
    for (const [k, list] of classDays) {
        const classId = k.split('|')[0];
        if (!perClass.has(classId)) perClass.set(classId, []);
        perClass.get(classId).push(list.length);
    }
    for (const counts of perClass.values()) {
        while (counts.length < ctx.days.length) counts.push(0);
        const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
        breakdown.classImbalance += Math.round(counts.reduce((s, c) => s + Math.abs(c - avg), 0));
    }

    const penalty = Object.entries(breakdown).reduce((sum, [k, v]) => sum + v * WEIGHTS[k], 0);
    return { penalty, breakdown };
}

const better = (a, b) => !b
    || a.state.unplaced.size < b.state.unplaced.size
    || (a.state.unplaced.size === b.state.unplaced.size && a.score.penalty < b.score.penalty);

// ---------------------------------------------------------------------------
// 4. Construction, restarts and improvement
// ---------------------------------------------------------------------------

function construct(ctx, rng) {
    const state = createState(ctx);
    // Most constrained first: busiest teachers, most periods, heavy subjects; jitter breaks ties.
    const order = ctx.units.map((u) => ({
        u,
        rank: (ctx.teacherDemand.get(u.teacherId) || 0) * 2 + u.periodsPerWeek * 3 + (u.heavy ? 4 : 0) + rng() * 3,
    })).sort((a, b) => b.rank - a.rank).map((x) => x.u);

    for (const unit of order) {
        const options = candidates(ctx, state, unit, rng);
        if (options.length) {
            place(state, unit, options[0].day, options[0].period, options[0].roomId);
        } else {
            repair(ctx, state, unit, rng);
        }
    }
    return { state, score: evaluate(ctx, state) };
}

function improve(ctx, best, rng, deadline) {
    let current = best;
    const unitIds = ctx.units.map((u) => u.id);
    let iterations = 0;
    while (Date.now() < deadline && unitIds.length) {
        iterations += 1;
        const state = cloneState(current.state);
        // Retry anything still unplaced first.
        for (const id of [...state.unplaced]) {
            const unit = ctx.unitsById.get(id);
            const options = candidates(ctx, state, unit, rng);
            if (options.length) place(state, unit, options[0].day, options[0].period, options[0].roomId);
            else repair(ctx, state, unit, rng);
        }
        // Move one random lesson to a random allowed slot.
        const unit = ctx.unitsById.get(unitIds[Math.floor(rng() * unitIds.length)]);
        if (state.placed.has(unit.id)) {
            const before = unplace(state, unit);
            const options = candidates(ctx, state, unit, rng);
            const pick = options.length ? options[Math.floor(rng() * Math.min(options.length, 6))] : null;
            if (pick) place(state, unit, pick.day, pick.period, pick.roomId);
            else place(state, unit, before.day, before.period, before.roomId);
        }
        const candidate = { state, score: evaluate(ctx, state) };
        if (better(candidate, current)) current = candidate;
    }
    return { result: current, iterations };
}

// ---------------------------------------------------------------------------
// 5. Public API
// ---------------------------------------------------------------------------

/**
 * @param {object} input
 * @param {string[]} [input.days]
 * @param {{no:number,start:string,end:string}[]} input.periods  lesson periods only, in order
 * @param {{id:number,name:string,capacity:number}[]} input.rooms
 * @param {{id:number,name:string,size:number,level?:string}[]} input.classes
 * @param {{id:number,name:string,maxPerWeek:number,maxPerDay:number}[]} input.teachers
 * @param {{teacherId:number,subjectId:number,level:number}[]} input.proficiencies  level 1-3
 * @param {{id:number,name:string,heavy:boolean}[]} input.subjects
 * @param {{classId:number,subjectId:number,periodsPerWeek:number,teacherId?:number|null}[]} input.requirements
 * @param {{classId?:number,teacherId?:number,roomId?:number,day:string,period:number}[]} [input.blocked]
 * @param {object} [input.options] seed, timeLimitMs, improveMs, maxAttempts, maxHeavyPerDay, morningPeriods
 */
function generateTimetable(input) {
    const started = Date.now();
    const options = {
        seed: 1, timeLimitMs: 2500, improveMs: 1200, maxAttempts: 60, minAttempts: 3, maxHeavyPerDay: 2, ...(input.options || {}),
    };
    const days = input.days || DEFAULT_DAYS;
    const periods = [...input.periods].sort((a, b) => a.no - b.no);
    const periodNos = periods.map((p) => p.no);

    const ctx = {
        days,
        periodNos,
        periodIndex: new Map(periodNos.map((p, i) => [p, i])),
        morningPeriods: options.morningPeriods ?? Math.ceil(periodNos.length / 2),
        maxHeavyPerDay: options.maxHeavyPerDay,
        rooms: input.rooms,
        roomsById: new Map(input.rooms.map((r) => [r.id, r])),
        classesById: new Map(input.classes.map((c) => [c.id, c])),
        teachersById: new Map(input.teachers.map((t) => [t.id, t])),
        subjectsById: new Map(input.subjects.map((s) => [s.id, s])),
        proficiency: new Map(input.proficiencies.filter((p) => p.level > 0).map((p) => [key(p.teacherId, p.subjectId), p.level])),
        requirements: input.requirements.filter((r) => r.periodsPerWeek > 0),
        blocked: new Set(),
        blockedTeacherDay: new Map(),
        blockedTeacherPeriods: new Map(),
    };

    for (const b of input.blocked || []) {
        if (b.classId) ctx.blocked.add(key('c', b.classId, b.day, b.period));
        if (b.roomId) ctx.blocked.add(key('r', b.roomId, b.day, b.period));
        if (b.teacherId) {
            const k = key('t', b.teacherId, b.day, b.period);
            if (!ctx.blocked.has(k)) {
                ctx.blocked.add(k);
                inc(ctx.blockedTeacherDay, key(b.teacherId, b.day), 1);
                inc(ctx.blockedTeacherPeriods, b.teacherId, 1);
            }
        }
    }

    const teaching = assignTeachers(ctx);

    // One unit per lesson period.
    const units = [];
    for (const req of teaching.assigned) {
        const cls = ctx.classesById.get(req.classId);
        const subject = ctx.subjectsById.get(req.subjectId);
        if (!cls || !subject) continue;
        for (let i = 0; i < req.periodsPerWeek; i += 1) {
            units.push({
                id: units.length,
                classId: req.classId,
                subjectId: req.subjectId,
                teacherId: req.teacherId,
                heavy: Boolean(subject.heavy),
                periodsPerWeek: req.periodsPerWeek,
                dayLimit: Math.max(1, Math.ceil(req.periodsPerWeek / days.length)),
                size: cls.size || 0,
            });
        }
    }
    ctx.units = units;
    ctx.unitsById = new Map(units.map((u) => [u.id, u]));
    ctx.teacherDemand = new Map();
    for (const u of units) inc(ctx.teacherDemand, u.teacherId, 1);

    let best = null;
    let attempts = 0;
    const deadline = started + options.timeLimitMs;
    while (attempts < options.maxAttempts && (attempts < options.minAttempts || Date.now() < deadline)) {
        const run = construct(ctx, mulberry32(options.seed + attempts * 7919));
        if (better(run, best)) best = run;
        attempts += 1;
        if (best.state.unplaced.size === 0 && best.score.penalty === 0) break;
    }
    const { result, iterations } = improve(ctx, best, mulberry32(options.seed * 31 + 7), Date.now() + options.improveMs);

    return formatResult(ctx, result, teaching, { attempts, iterations, seed: options.seed, ms: Date.now() - started, periods });
}

function diagnose(ctx, state, unit) {
    let bothFree = 0;
    for (const day of ctx.days) {
        for (const period of ctx.periodNos) {
            const classFree = !state.classSlot.has(key(unit.classId, day, period)) && !ctx.blocked.has(key('c', unit.classId, day, period));
            const teacherFree = !state.teacherSlot.has(key(unit.teacherId, day, period)) && !ctx.blocked.has(key('t', unit.teacherId, day, period));
            if (classFree && teacherFree) bothFree += 1;
        }
    }
    if (bothFree === 0) return 'No period when both the class and the teacher are free';
    return 'Remaining free periods break a rule (teacher daily limit, subject already taught that day, or no free room)';
}

function formatResult(ctx, { state, score }, teaching, stats) {
    const periodByNo = new Map(stats.periods.map((p) => [p.no, p]));
    const lessons = [...state.placed].map(([unitId, at]) => {
        const unit = ctx.unitsById.get(unitId);
        const p = periodByNo.get(at.period);
        return {
            classId: unit.classId, subjectId: unit.subjectId, teacherId: unit.teacherId, roomId: at.roomId,
            day: at.day, period: at.period, start: p.start, end: p.end,
        };
    }).sort((a, b) => a.classId - b.classId || ctx.days.indexOf(a.day) - ctx.days.indexOf(b.day) || a.period - b.period);

    const unplacedGroups = new Map();
    for (const id of state.unplaced) {
        const unit = ctx.unitsById.get(id);
        const k = key(unit.classId, unit.subjectId, unit.teacherId);
        if (!unplacedGroups.has(k)) unplacedGroups.set(k, { classId: unit.classId, subjectId: unit.subjectId, teacherId: unit.teacherId, missing: 0, reason: diagnose(ctx, state, unit) });
        unplacedGroups.get(k).missing += 1;
    }

    const teacherLoads = [...ctx.teachersById.values()].map((t) => {
        const perDay = Object.fromEntries(ctx.days.map((d) => [d, (state.teacherDay.get(key(t.id, d)) || 0) + (ctx.blockedTeacherDay.get(key(t.id, d)) || 0)]));
        const periods = Object.values(perDay).reduce((a, b) => a + b, 0);
        return { teacherId: t.id, name: t.name, periods, maxPerWeek: t.maxPerWeek, perDay };
    }).filter((t) => t.periods > 0).sort((a, b) => b.periods - a.periods);

    return {
        lessons,
        teacherAssignments: teaching.assigned.map(({ classId, subjectId, teacherId, periodsPerWeek, autoAssigned }) => ({ classId, subjectId, teacherId, periodsPerWeek, autoAssigned: Boolean(autoAssigned) })),
        unassigned: teaching.unassigned.map(({ classId, subjectId, periodsPerWeek, reason }) => ({ classId, subjectId, periodsPerWeek, reason })),
        unplaced: [...unplacedGroups.values()],
        warnings: teaching.warnings,
        penalty: score.penalty,
        breakdown: score.breakdown,
        teacherLoads,
        stats: {
            requiredPeriods: ctx.units.length + teaching.unassigned.reduce((s, r) => s + r.periodsPerWeek, 0),
            placedPeriods: lessons.length,
            attempts: stats.attempts,
            improvementSteps: stats.iterations,
            seed: stats.seed,
            ms: stats.ms,
        },
    };
}

/**
 * Independent safety check: lists every double booking in a set of lessons
 * (including against fixed lessons). Used before publishing and in tests.
 */
function verifyTimetable(lessons, blocked = []) {
    const problems = [];
    const seen = new Map();
    const claim = (kind, id, day, period, what) => {
        if (id === undefined || id === null) return;
        const k = key(kind, id, day, period);
        if (seen.has(k)) problems.push(`${what} is double-booked on ${day} period ${period}`);
        else seen.set(k, true);
    };
    for (const b of blocked) {
        claim('c', b.classId, b.day, b.period, `Class ${b.classId}`);
        claim('t', b.teacherId, b.day, b.period, `Teacher ${b.teacherId}`);
        claim('r', b.roomId, b.day, b.period, `Room ${b.roomId}`);
    }
    for (const l of lessons) {
        claim('c', l.classId, l.day, l.period, `Class ${l.classId}`);
        claim('t', l.teacherId, l.day, l.period, `Teacher ${l.teacherId}`);
        claim('r', l.roomId, l.day, l.period, `Room ${l.roomId}`);
    }
    return problems;
}

module.exports = { generateTimetable, verifyTimetable, DEFAULT_DAYS, WEIGHTS, mulberry32 };
