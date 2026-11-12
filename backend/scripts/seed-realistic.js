/**
 * Builds a complete, realistic demo school: EduCore University College.
 *
 *   npm run seed:realistic -- --reset
 *
 * ERASES all school data (everything except the roles and grading scale) and
 * replaces it with: programmes, Level 100-300 classes in Gold/Diamond streams,
 * ~430 students, 18 lecturers and staff, courses, a bell schedule, a generated
 * and published timetable, three semesters (two finished and released, the
 * current one in progress), daily attendance, staff check-ins, marks, fees and
 * payments in GHS, a library with loans, materials and announcements.
 *
 * Every account's password is "password123". Output is deterministic (seeded).
 * Refuses to run in production or without --reset. Back the database up first.
 */
require('dotenv').config({ quiet: true });

if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to replace data in production.');
    process.exit(1);
}
if (!process.argv.includes('--reset')) {
    console.error('This replaces ALL school data. Back up the database, then run: npm run seed:realistic -- --reset');
    process.exit(1);
}

const bcrypt = require('bcrypt');
const db = require('../src/config/db');
const scheduler = require('../src/modules/scheduler/scheduler.service');

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------
let seedState = 20261112;
const rand = () => {
    seedState = (seedState + 0x6d2b79f5) >>> 0;
    let t = seedState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));
const chance = (p) => rand() < p;
const normal = (mean, sd) => {
    const u = Math.max(rand(), 1e-9);
    const v = rand();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const weighted = (pairs) => {
    const total = pairs.reduce((s, [, w]) => s + w, 0);
    let r = rand() * total;
    for (const [value, w] of pairs) { r -= w; if (r <= 0) return value; }
    return pairs[pairs.length - 1][0];
};
const pad = (n, w = 2) => String(n).padStart(w, '0');

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------
const TODAY = '2026-11-12';
const HOLIDAYS = new Set(['2025-09-22', '2025-12-05', '2026-03-06', '2026-04-03', '2026-04-06', '2026-05-01', '2026-09-21']); // Founders' Day (observed), Farmers' Day, Independence, Good Friday, Easter Monday, May Day, Founders' Day
const toDate = (s) => new Date(`${s}T12:00:00Z`);
const fmt = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = toDate(s); d.setUTCDate(d.getUTCDate() + n); return fmt(d); };
function schoolDays(from, to) {
    const days = [];
    for (let d = from; d <= to; d = addDays(d, 1)) {
        const dow = toDate(d).getUTCDay();
        if (dow !== 0 && dow !== 6 && !HOLIDAYS.has(d)) days.push(d);
    }
    return days;
}
const at = (date, h, m) => `${date} ${pad(h)}:${pad(m)}:${pad(between(0, 59))}`;

const OLDER_TERM = { name: '2025/26 First Semester', start: '2025-09-01', end: '2025-12-19' };
const PREV_TERM = { name: '2025/26 Second Semester', start: '2026-01-19', end: '2026-05-29' };
const CURR_TERM = { name: '2026/27 First Semester', start: '2026-08-31', end: '2026-12-18' };

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------
const MALE = ['Kwame', 'Kofi', 'Kwaku', 'Yaw', 'Kwabena', 'Kojo', 'Kwasi', 'Kwesi', 'Nii', 'Selorm', 'Elikem', 'Edem', 'Senyo', 'Abdul-Rahman', 'Ibrahim', 'Fuseini', 'Yakubu', 'Emmanuel', 'Daniel', 'Samuel', 'Joseph', 'Isaac', 'Bright', 'Prince', 'Felix', 'Richard', 'Michael', 'Nana Kwame', 'Kelvin', 'Ebenezer', 'Godfred', 'Desmond', 'Jeffrey', 'Collins', 'Eric', 'Derrick', 'Solomon', 'Raymond', 'Bismark', 'Justice', 'Mawuli', 'Delali', 'Fiifi', 'Ekow', 'Paa Kwesi', 'Mustapha', 'Abubakar', 'Shadrach', 'Elvis', 'Ernest'];
const FEMALE = ['Ama', 'Akosua', 'Abena', 'Adwoa', 'Afua', 'Akua', 'Esi', 'Yaa', 'Efua', 'Araba', 'Naa', 'Dzifa', 'Selasi', 'Enyonam', 'Mawusi', 'Mariam', 'Zainab', 'Rashida', 'Fatima', 'Hawa', 'Priscilla', 'Gifty', 'Eunice', 'Benedicta', 'Comfort', 'Mercy', 'Doris', 'Princess', 'Nana Ama', 'Josephine', 'Vida', 'Linda', 'Patience', 'Grace', 'Juliet', 'Belinda', 'Sandra', 'Rita', 'Phyllis', 'Dorcas', 'Elorm', 'Esinam', 'Abigail', 'Hannah', 'Lydia', 'Ruth', 'Felicia', 'Sheila', 'Barbara', 'Christabel'];
const SURNAMES = ['Mensah', 'Owusu', 'Boateng', 'Asante', 'Osei', 'Agyeman', 'Appiah', 'Addo', 'Quaye', 'Tetteh', 'Ofori', 'Darko', 'Amoah', 'Antwi', 'Acheampong', 'Sarpong', 'Ansah', 'Frimpong', 'Bonsu', 'Adjei', 'Danso', 'Annan', 'Lamptey', 'Ankrah', 'Kpodo', 'Agbeko', 'Dogbe', 'Amedzro', 'Mahama', 'Iddrisu', 'Alhassan', 'Abubakar', 'Yeboah', 'Opoku', 'Gyamfi', 'Asiedu', 'Kyei', 'Baffoe', 'Nyarko', 'Ampofo', 'Wiredu', 'Aidoo', 'Arthur', 'Eshun', 'Quansah', 'Botchway', 'Okine', 'Djan', 'Torgbor', 'Fiagbe', 'Sulemana', 'Seidu', 'Bawa', 'Nketia', 'Gyasi', 'Kumi', 'Obeng', 'Badu', 'Manu', 'Twum'];
const AREAS = [
    ['East Legon', 'Accra'], ['Madina', 'Accra'], ['Adenta', 'Accra'], ['Dansoman', 'Accra'], ['Spintex', 'Accra'], ['Kasoa', 'Central Region'],
    ['Tema Community 25', 'Tema'], ['Ashaiman', 'Tema'], ['Teshie', 'Accra'], ['Kaneshie', 'Accra'], ['Achimota', 'Accra'], ['Dome', 'Accra'],
    ['Taifa', 'Accra'], ['Haatso', 'Accra'], ['Lapaz', 'Accra'], ['Asokwa', 'Kumasi'], ['Bantama', 'Kumasi'], ['Ahodwo', 'Kumasi'],
    ['Suame', 'Kumasi'], ['Kasoa Millennium City', 'Central Region'], ['Weija', 'Accra'], ['Nungua', 'Accra'], ['Ho Bankoe', 'Ho'], ['Tamale Lamashegu', 'Tamale'],
];
const PREFIXES = ['024', '054', '055', '059', '020', '050', '027', '057', '026', '053'];
const phone = () => `${pick(PREFIXES)}${between(1000000, 9999999)}`;
const slug = (s) => s.toLowerCase().replace(/[^a-z]/g, '');

// ---------------------------------------------------------------------------
// Academic structure
// ---------------------------------------------------------------------------
const PROGRAMS = [
    { code: 'CS', name: 'BSc. Computer Science' },
    { code: 'SE', name: 'BSc. Software Engineering' },
    { code: 'IT', name: 'BSc. Information Technology' },
    { code: 'CYS', name: 'BSc. Cybersecurity & Digital Forensics' },
];
const CLASSES = [
    ['CS', 100, 'Gold'], ['CS', 100, 'Diamond'], ['CS', 200, 'Gold'], ['CS', 200, 'Diamond'], ['CS', 300, 'Gold'],
    ['SE', 100, 'Gold'], ['SE', 200, 'Gold'], ['SE', 300, 'Gold'],
    ['IT', 100, 'Gold'], ['IT', 100, 'Diamond'], ['IT', 200, 'Gold'], ['IT', 300, 'Gold'],
    ['CYS', 100, 'Gold'], ['CYS', 200, 'Gold'],
];
// [code, title, credits, heavy, difficulty]
const COURSES = [
    ['CSC101', 'Introduction to Programming (Python)', 3, true, -2], ['MATH101', 'Discrete Mathematics', 3, true, -6],
    ['ITC101', 'Fundamentals of Information Technology', 3, false, 4], ['CSC103', 'Computer Organisation', 3, false, -1],
    ['ENG101', 'Communication Skills I', 2, false, 5], ['AFS101', 'African Studies I', 2, false, 6],
    ['CSC201', 'Data Structures & Algorithms', 3, true, -6], ['CSC203', 'Object-Oriented Programming with Java', 3, false, -2],
    ['CSC205', 'Database Systems', 3, false, 1], ['MATH201', 'Linear Algebra', 3, true, -7], ['STAT201', 'Probability & Statistics', 3, true, -4],
    ['SEN201', 'Software Requirements Engineering', 3, false, 3], ['ITC201', 'Web Technologies', 3, false, 3], ['CYS201', 'Introduction to Cybersecurity', 3, false, 1],
    ['BIS201', 'Principles of Accounting', 3, false, 0],
    ['CSC301', 'Operating Systems', 3, true, -5], ['CSC303', 'Computer Networks', 3, false, -2], ['CSC305', 'Software Engineering', 3, false, 2],
    ['CSC307', 'Artificial Intelligence', 3, true, -6], ['SEN301', 'Web Application Development', 3, false, 2], ['IT301', 'Systems Administration', 3, false, 1],
    ['BIS203', 'E-Commerce', 3, false, 3], ['ENT301', 'Entrepreneurship & Innovation', 2, false, 6],
    // Previous (second) semester courses
    ['CSC102', 'Programming II (Python)', 3, true, -3], ['MATH102', 'Calculus I', 3, true, -7], ['CSC104', 'Web Fundamentals', 3, false, 3],
    ['ENG102', 'Communication Skills II', 2, false, 5], ['AFS102', 'African Studies II', 2, false, 6],
    ['CSC202', 'Design & Analysis of Algorithms', 3, true, -7], ['CSC204', 'Computer Architecture', 3, false, -2],
    ['CSC206', 'Software Design & Modelling', 3, false, 1], ['MATH202', 'Numerical Methods', 3, true, -6], ['ITC202', 'Mobile Application Development', 3, false, 2],
];
const CURRENT_SUBJECTS = {
    '100': { all: ['CSC101', 'MATH101', 'ITC101', 'ENG101', 'AFS101'], CS: ['CSC103'], SE: ['CSC103'], IT: ['CSC103'], CYS: ['CSC103'] },
    '200': { CS: ['CSC201', 'CSC203', 'CSC205', 'MATH201', 'STAT201'], SE: ['SEN201', 'CSC201', 'CSC203', 'CSC205', 'STAT201'], IT: ['ITC201', 'CSC203', 'CSC205', 'STAT201', 'BIS201'], CYS: ['CYS201', 'CSC201', 'CSC203', 'CSC205', 'STAT201'] },
    '300': { CS: ['CSC301', 'CSC303', 'CSC305', 'CSC307', 'ENT301'], SE: ['SEN301', 'CSC305', 'CSC301', 'CSC303', 'ENT301'], IT: ['IT301', 'CSC303', 'BIS203', 'CSC305', 'ENT301'] },
};
const PREVIOUS_SUBJECTS = { '200': ['CSC102', 'MATH102', 'CSC104', 'ENG102', 'AFS102'], '300': ['CSC202', 'CSC204', 'CSC206', 'MATH202', 'ITC202'] };
const subjectsFor = (program, level) => {
    const map = CURRENT_SUBJECTS[String(level)];
    return [...(map.all || []), ...(map[program] || [])];
};

const LECTURERS = [
    ['lecturer@educore.com', 'Kwame', 'Owusu-Ansah', 'Dr.', 'Computer Science', ['CSC201', 'CSC301', 'CSC101', 'CSC202']],
    ['a.mensah@educore.com', 'Abena', 'Mensah', 'Dr.', 'Computer Science', ['CSC203', 'CSC102', 'SEN301', 'CSC101']],
    ['s.adjei@educore.com', 'Samuel', 'Adjei', 'Prof.', 'Computer Science', ['CSC307', 'CSC305', 'CSC201', 'CSC202']],
    ['e.boateng@educore.com', 'Elikem', 'Boateng', 'Dr.', 'Information Technology', ['ITC101', 'ITC201', 'IT301', 'ITC202']],
    ['n.tetteh@educore.com', 'Nii Armah', 'Tetteh', 'Mr.', 'Information Technology', ['ITC101', 'CSC104', 'ITC201', 'CSC103']],
    ['n.quaye@educore.com', 'Naa Ayeley', 'Quaye', 'Mrs.', 'Communication Studies', ['ENG101', 'ENG102']],
    ['a.alhassan@educore.com', 'Abdul-Rahman', 'Alhassan', 'Mr.', 'Mathematics & Statistics', ['MATH101', 'MATH102', 'STAT201']],
    ['y.asante@educore.com', 'Yaw', 'Asante', 'Dr.', 'Mathematics & Statistics', ['MATH201', 'MATH202', 'MATH101']],
    ['d.agbeko@educore.com', 'Dzifa', 'Agbeko', 'Ms.', 'Computer Science', ['CSC205', 'CSC204', 'CSC103']],
    ['k.frimpong@educore.com', 'Kofi', 'Frimpong', 'Dr.', 'Cybersecurity', ['CYS201', 'CSC303', 'CSC204']],
    ['b.osei@educore.com', 'Bright', 'Osei', 'Mr.', 'Cybersecurity', ['CSC303', 'CYS201', 'IT301']],
    ['m.iddrisu@educore.com', 'Mariam', 'Iddrisu', 'Dr.', 'Business Studies', ['BIS201', 'BIS203', 'ENT301']],
    ['e.ofori@educore.com', 'Emmanuel', 'Ofori', 'Mr.', 'Business Studies', ['BIS203', 'ENT301', 'BIS201']],
    ['g.danso@educore.com', 'Gifty', 'Danso', 'Mrs.', 'Liberal Studies', ['AFS101', 'AFS102', 'ENG101']],
    ['p.amoah@educore.com', 'Prince', 'Amoah', 'Mr.', 'Software Engineering', ['SEN201', 'SEN301', 'CSC203', 'CSC206']],
    ['a.yeboah@educore.com', 'Akosua', 'Yeboah', 'Dr.', 'Software Engineering', ['SEN201', 'CSC305', 'CSC206']],
    ['i.darko@educore.com', 'Isaac', 'Darko', 'Mr.', 'Mathematics & Statistics', ['STAT201', 'MATH102', 'MATH201']],
    ['b.lamptey@educore.com', 'Benedicta', 'Lamptey', 'Ms.', 'Information Technology', ['CSC104', 'CSC101', 'ITC201', 'CSC205', 'ITC202']],
];
const STAFF = [
    ['superadmin@educore.com', 'SUPER_ADMIN'], ['admin@educore.com', 'ADMIN'], ['registrar@educore.com', 'ADMIN'],
    ['headmaster@educore.com', 'HEADMASTER'], ['accountant@educore.com', 'ACCOUNTANT'], ['bursar@educore.com', 'ACCOUNTANT'],
    ['librarian@educore.com', 'LIBRARIAN'], ['security@educore.com', 'GATEKEEPER'],
];
const ROOMS = [
    ['LT1 – Main Lecture Theatre', 220], ['LT2 – Kwame Nkrumah Hall', 150], ['A101', 45], ['A102', 45], ['A103', 40], ['B201', 40],
    ['B202', 38], ['Computer Lab 1', 40], ['Computer Lab 2', 40], ['Networking Lab', 32], ['Innovation Hub', 60], ['E12 – Engineering Block', 70],
];
const BOOKS = [
    ['Introduction to Algorithms', 'Thomas H. Cormen et al.', '9780262046305', 'Algorithms', 6], ['Clean Code', 'Robert C. Martin', '9780132350884', 'Software Engineering', 4],
    ['Design Patterns', 'Erich Gamma et al.', '9780201633610', 'Software Engineering', 3], ['The Pragmatic Programmer', 'David Thomas & Andrew Hunt', '9780135957059', 'Software Engineering', 4],
    ['Computer Networking: A Top-Down Approach', 'James F. Kurose & Keith W. Ross', '9780133594140', 'Networks', 5], ['Operating System Concepts', 'Abraham Silberschatz et al.', '9781119800361', 'Operating Systems', 5],
    ['Database System Concepts', 'Abraham Silberschatz et al.', '9780078022159', 'Databases', 5], ['Artificial Intelligence: A Modern Approach', 'Stuart Russell & Peter Norvig', '9780134610993', 'Artificial Intelligence', 4],
    ['Python Crash Course', 'Eric Matthes', '9781718502703', 'Programming', 6], ['Head First Java', 'Kathy Sierra & Bert Bates', '9781491910771', 'Programming', 5],
    ['Discrete Mathematics and Its Applications', 'Kenneth H. Rosen', '9781259676512', 'Mathematics', 6], ['Linear Algebra and Its Applications', 'David C. Lay et al.', '9780321982384', 'Mathematics', 4],
    ['Calculus: Early Transcendentals', 'James Stewart', '9781285741550', 'Mathematics', 5], ['Probability and Statistics for Engineers', 'Ronald E. Walpole et al.', '9780134115856', 'Statistics', 4],
    ['Computer Organization and Design', 'David A. Patterson & John L. Hennessy', '9780128201091', 'Computer Architecture', 3], ['Software Engineering', 'Ian Sommerville', '9780133943030', 'Software Engineering', 4],
    ['Cracking the Coding Interview', 'Gayle Laakmann McDowell', '9780984782857', 'Programming', 3], ['Eloquent JavaScript', 'Marijn Haverbeke', '9781593279509', 'Web Development', 4],
    ['Learning Web Design', 'Jennifer Robbins', '9781491960202', 'Web Development', 3], ['Security Engineering', 'Ross Anderson', '9781119642787', 'Cybersecurity', 2],
    ['The Web Application Hacker\'s Handbook', 'Dafydd Stuttard & Marcus Pinto', '9781118026472', 'Cybersecurity', 2], ['Hacking: The Art of Exploitation', 'Jon Erickson', '9781593271442', 'Cybersecurity', 2],
    ['UNIX and Linux System Administration Handbook', 'Evi Nemeth et al.', '9780134277554', 'Systems Administration', 2], ['Accounting Principles', 'Jerry J. Weygandt et al.', '9781119707110', 'Business', 3],
    ['E-Commerce 2021', 'Kenneth C. Laudon & Carol Guercio Traver', '9780136931805', 'Business', 2], ['The Lean Startup', 'Eric Ries', '9780307887894', 'Entrepreneurship', 3],
    ['Communication Skills for Tertiary Students', 'Kwasi Opoku-Agyemang (ed.)', '9789988647490', 'Communication', 6], ['African Studies: An Introduction', 'Kwame Anthony Appiah (ed.)', '9780195337709', 'African Studies', 4],
    ['Things Fall Apart', 'Chinua Achebe', '9780385474542', 'Literature', 3], ['Africa Must Unite', 'Kwame Nkrumah', '9780717802630', 'African Studies', 2],
    ['Grokking Algorithms', 'Aditya Bhargava', '9781617292231', 'Algorithms', 3], ['Refactoring', 'Martin Fowler', '9780134757599', 'Software Engineering', 2],
    ['Android Programming: The Big Nerd Ranch Guide', 'Bill Phillips et al.', '9780135245125', 'Mobile Development', 2], ['Numerical Analysis', 'Richard L. Burden & J. Douglas Faires', '9781305253667', 'Mathematics', 3],
    ['Designing Data-Intensive Applications', 'Martin Kleppmann', '9781449373320', 'Databases', 2], ['Network Security Essentials', 'William Stallings', '9780134527338', 'Cybersecurity', 3],
    ['Fluent Python', 'Luciano Ramalho', '9781492056355', 'Programming', 2], ['Structure and Interpretation of Computer Programs', 'Harold Abelson & Gerald Jay Sussman', '9780262510875', 'Programming', 2],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function insertMany(conn, sql, rows, chunk = 1500) {
    for (let i = 0; i < rows.length; i += chunk) {
        if (rows.slice(i, i + chunk).length) await conn.query(sql, [rows.slice(i, i + chunk)]);
    }
}
const log = (...a) => console.log('•', ...a);

async function main() {
    const started = Date.now();
    const conn = await db.getConnection();
    const passwordHash = await bcrypt.hash('password123', 10);

    // --- 1. Clear school data (keep roles and the grading scale) -------------------
    const [tables] = await conn.query(
        `SELECT TABLE_NAME AS t FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME NOT IN ('roles', 'grading_scale')`
    );
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const { t } of tables) await conn.query(`TRUNCATE TABLE \`${t}\``);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    log(`cleared ${tables.length} tables`);

    const [roleRows] = await conn.query('SELECT id, name FROM roles');
    const roleId = Object.fromEntries(roleRows.map((r) => [r.name, r.id]));

    // --- 2. Structure ------------------------------------------------------------------
    await insertMany(conn, 'INSERT INTO programs (name, code) VALUES ?', PROGRAMS.map((p) => [p.name, p.code]));
    const [programs] = await conn.query('SELECT id, code FROM programs');
    const programId = Object.fromEntries(programs.map((p) => [p.code, p.id]));
    await insertMany(conn, 'INSERT INTO streams (name, sort_order) VALUES ?', [['Gold', 0], ['Diamond', 1]]);
    const [streams] = await conn.query('SELECT id, name FROM streams');
    const streamId = Object.fromEntries(streams.map((s) => [s.name, s.id]));
    await insertMany(conn, 'INSERT INTO student_groups (name, level, program_id, stream_id) VALUES ?',
        CLASSES.map(([p, lvl, st]) => [`${p} L${lvl} ${st}`, `Level ${lvl}`, programId[p], streamId[st]]));
    const [groups] = await conn.query('SELECT id, name FROM student_groups');
    const classes = CLASSES.map(([program, level, stream]) => ({ program, level, stream, id: groups.find((g) => g.name === `${program} L${level} ${stream}`).id }));
    await insertMany(conn, 'INSERT INTO rooms (name, capacity) VALUES ?', ROOMS);
    await insertMany(conn, 'INSERT INTO courses (code, name, credit_hours, is_heavy) VALUES ?', COURSES.map(([c, n, cr, h]) => [c, n, cr, h ? 1 : 0]));
    const [courseRows] = await conn.query('SELECT id, code FROM courses');
    const courseId = Object.fromEntries(courseRows.map((c) => [c.code, c.id]));
    const courseInfo = Object.fromEntries(COURSES.map(([c, n, cr, h, diff]) => [c, { name: n, credits: cr, heavy: h, difficulty: diff }]));
    log(`${PROGRAMS.length} programmes, ${classes.length} classes, ${ROOMS.length} rooms, ${COURSES.length} courses`);

    // --- 3. Staff and lecturers ----------------------------------------------------------
    const created = (days) => `${addDays('2026-08-15', -days)} 09:${pad(between(0, 59))}:00`;
    for (const [email, role] of STAFF) {
        await conn.query('INSERT INTO users (role_id, email, password_hash, created_at) VALUES (?, ?, ?, ?)', [roleId[role], email, passwordHash, created(between(200, 900))]);
    }
    const lecturers = [];
    for (const [email, first, last, title, dept, skills] of LECTURERS) {
        const [u] = await conn.query('INSERT INTO users (role_id, email, password_hash, created_at) VALUES (?, ?, ?, ?)', [roleId.LECTURER, email, passwordHash, created(between(300, 1500))]);
        const [l] = await conn.query(
            'INSERT INTO lecturers (user_id, first_name, last_name, department, hire_date, max_periods_per_week, max_periods_per_day) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [u.insertId, `${title} ${first}`, last, dept, `${between(2009, 2024)}-${pad(between(1, 12))}-01`, 22, 6]
        );
        lecturers.push({ id: l.insertId, userId: u.insertId, email, skills });
    }
    await insertMany(conn, 'INSERT INTO lecturer_subjects (lecturer_id, course_id, proficiency) VALUES ?',
        lecturers.flatMap((l) => l.skills.map((code, i) => [l.id, courseId[code], i === 0 ? 3 : i === 1 ? 3 : 2])));
    log(`${STAFF.length} staff, ${lecturers.length} lecturers`);

    // --- 4. Students -----------------------------------------------------------------------
    const usedEmails = new Set();
    const indexSeq = { 2024: 0, 2025: 0, 2026: 0 };
    const students = [];
    for (const cls of classes) {
        const size = cls.level === 100 ? between(30, 36) : cls.level === 200 ? between(26, 32) : between(22, 28);
        for (let i = 0; i < size; i += 1) {
            const female = chance(cls.program === 'CS' || cls.program === 'CYS' ? 0.38 : 0.45);
            let first = pick(female ? FEMALE : MALE);
            let last = pick(SURNAMES);
            const intake = cls.level === 100 ? 2026 : cls.level === 200 ? 2025 : 2024;
            let email = `${slug(first)}.${slug(last)}@st.educore.com`;
            // The demo student login stays the same.
            if (cls.program === 'SE' && cls.level === 200 && i === 0) {
                first = 'Kwaku'; last = 'Agyeman'; email = 'student@educore.com';
            }
            for (let n = 2; usedEmails.has(email); n += 1) email = `${slug(first)}.${slug(last)}${n}@st.educore.com`;
            usedEmails.add(email);
            indexSeq[intake] += 1;
            const [area, city] = pick(AREAS);
            const birthYear = intake - between(18, 20);
            students.push({
                cls, email, first, last, female, intake,
                index: `EDU/${intake}/${pad(indexSeq[intake], 4)}`,
                dob: `${birthYear}-${pad(between(1, 12))}-${pad(between(1, 28))}`,
                address: `House No. ${between(1, 48)}${pick(['', 'A', 'B'])}, ${area}, ${city}`,
                guardian: `${pick(['Mr.', 'Mrs.', 'Mr.', 'Mrs.', 'Rev.', 'Dr.', 'Madam'])} ${pick(chance(0.5) ? MALE : FEMALE)} ${last}`,
                guardianPhone: phone(),
                medical: weighted([[null, 84], ['Asthma (carries an inhaler)', 4], ['Sickle cell trait (AS)', 4], ['Allergic to penicillin', 2], ['Short-sightedness (wears glasses)', 4], ['Peanut allergy', 1], ['Eczema', 1]]),
                blood: weighted([['O+', 53], ['A+', 20], ['B+', 18], ['AB+', 4], ['O-', 3], ['A-', 1], ['B-', 1]]),
                ability: clamp(normal(64, 11), 32, 95),
                attendanceHabit: clamp(normal(0.93, 0.05), 0.7, 0.995),
                created: `${intake}-${intake === 2026 ? '08-2' : '09-0'}${between(1, 8)} 10:${pad(between(0, 59))}:00`,
            });
        }
    }
    // The demo student is a steady, above-average student, so the showcase account reads well.
    const demo = students.find((s) => s.email === 'student@educore.com');
    demo.ability = 83;
    demo.attendanceHabit = 0.97;
    // A few realistic account states: deferred students, newly admitted ones.
    const deferred = new Set([students[45].email, students[220].email]);
    const newlyAdmitted = new Set(students.filter((s) => s.cls.level === 100).slice(-4).map((s) => s.email));
    await insertMany(conn, 'INSERT INTO users (role_id, email, password_hash, is_active, must_change_password, created_at) VALUES ?',
        students.map((s) => [roleId.STUDENT, s.email, passwordHash, deferred.has(s.email) ? 0 : 1, newlyAdmitted.has(s.email) ? 1 : 0, s.created]));
    const [userRows] = await conn.query('SELECT id, email FROM users');
    const userIdByEmail = new Map(userRows.map((u) => [u.email, u.id]));
    await insertMany(conn, `INSERT INTO students (user_id, first_name, last_name, enrollment_number, date_of_birth, gender, address,
        guardian_name, guardian_phone, medical_conditions, blood_group, student_group_id) VALUES ?`,
    students.map((s) => [userIdByEmail.get(s.email), s.first, s.last, s.index, s.dob, s.female ? 'Female' : 'Male', s.address, s.guardian, s.guardianPhone, s.medical, s.blood, s.cls.id]));
    const [studentRows] = await conn.query('SELECT id, user_id FROM students');
    const studentIdByUser = new Map(studentRows.map((r) => [r.user_id, r.id]));
    for (const s of students) { s.userId = userIdByEmail.get(s.email); s.id = studentIdByUser.get(s.userId); }
    log(`${students.length} students (${deferred.size} deferred, ${newlyAdmitted.size} newly admitted)`);

    // --- 5. Terms, exams, bell schedule, allocations --------------------------------------
    const [older] = await conn.query('INSERT INTO terms (name, start_date, end_date, is_current, ca_weight, results_released) VALUES (?, ?, ?, 0, 30, 1)', [OLDER_TERM.name, OLDER_TERM.start, OLDER_TERM.end]);
    const olderTermId = older.insertId;
    const [prev] = await conn.query('INSERT INTO terms (name, start_date, end_date, is_current, ca_weight, results_released) VALUES (?, ?, ?, 0, 30, 1)', [PREV_TERM.name, PREV_TERM.start, PREV_TERM.end]);
    const [curr] = await conn.query('INSERT INTO terms (name, start_date, end_date, is_current, ca_weight, results_released) VALUES (?, ?, ?, 1, 30, 0)', [CURR_TERM.name, CURR_TERM.start, CURR_TERM.end]);
    const prevTermId = prev.insertId;
    const currTermId = curr.insertId;
    await insertMany(conn, 'INSERT INTO exam_periods (term_id, name, start_date, end_date, alert_days, audience) VALUES ?', [
        [olderTermId, 'Mid-Semester Examinations', '2025-10-20', '2025-10-24', '7,1', 'ALL'],
        [olderTermId, 'End of First Semester Examinations', '2025-12-01', '2025-12-12', '14,7,1', 'ALL'],
        [prevTermId, 'Mid-Semester Examinations', '2026-03-16', '2026-03-20', '7,1', 'ALL'],
        [prevTermId, 'End of Second Semester Examinations', '2026-05-11', '2026-05-22', '14,7,1', 'ALL'],
        [currTermId, 'Mid-Semester Examinations', '2026-10-19', '2026-10-23', '7,1', 'ALL'],
        [currTermId, 'End of First Semester Examinations', '2026-12-07', '2026-12-18', '14,7,1', 'ALL'],
    ]);
    await insertMany(conn, 'INSERT INTO bell_periods (period_no, label, start_time, end_time, kind) VALUES ?', [
        [1, 'Period 1', '08:00', '08:55', 'LESSON'], [2, 'Period 2', '09:00', '09:55', 'LESSON'], [3, 'Break', '09:55', '10:15', 'BREAK'],
        [4, 'Period 3', '10:15', '11:10', 'LESSON'], [5, 'Period 4', '11:15', '12:10', 'LESSON'], [6, 'Lunch', '12:10', '13:00', 'BREAK'],
        [7, 'Period 5', '13:00', '13:55', 'LESSON'], [8, 'Period 6', '14:00', '14:55', 'LESSON'], [9, 'Period 7', '15:00', '15:55', 'LESSON'],
    ]);
    await insertMany(conn, 'INSERT INTO class_subjects (term_id, student_group_id, course_id, periods_per_week, lecturer_id) VALUES ?',
        classes.flatMap((cls) => subjectsFor(cls.program, cls.level).map((code) => [currTermId, cls.id, courseId[code], courseInfo[code].credits + (courseInfo[code].heavy ? 1 : 0), null])));
    log('3 semesters, 6 exam periods, bell schedule, class subject allocations');

    // --- 6. Timetable: generated by the app's own scheduler, then published ---------------
    const run = await scheduler.generate({ termId: currTermId, seed: 7, options: { timeLimitMs: 4000, improveMs: 2000 } });
    await scheduler.publish(run.id);
    log(`timetable generated and published: ${run.placed}/${run.required} lessons placed`);
    const [sessions] = await conn.query('SELECT student_group_id, course_id, lecturer_id, day_of_week FROM timetable_sessions');
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // --- 7. Attendance ---------------------------------------------------------------------
    const currDays = schoolDays(CURR_TERM.start, TODAY);
    const prevDays = schoolDays(PREV_TERM.start, PREV_TERM.end);
    const olderDays = schoolDays(OLDER_TERM.start, OLDER_TERM.end);
    const attendance = [];
    const register = (s, days) => {
        for (const day of days) {
            const sick = chance(0.012) ? between(1, 3) : 0; // occasional illness streaks are modelled loosely
            const status = sick || !chance(s.attendanceHabit) ? 'Absent' : chance(0.05) ? 'Late' : 'Present';
            attendance.push([s.id, s.cls.id, day, status, `${day} ${pad(between(8, 10))}:${pad(between(0, 59))}:00`]);
        }
    };
    for (const s of students) {
        if (deferred.has(s.email)) { register(s, currDays.slice(0, 20)); } else register(s, currDays);
        if (s.cls.level > 100) { register(s, prevDays); register(s, olderDays); }
    }
    await insertMany(conn, 'INSERT INTO attendance (student_id, student_group_id, date, status, created_at) VALUES ?', attendance);
    log(`${attendance.length.toLocaleString()} student attendance records`);

    // Lecturer check-ins at the gate.
    const staffAttendance = [];
    for (const l of lecturers) {
        for (const day of currDays) {
            const status = weighted([['Present', 94], ['On Leave', 3], ['Absent', 3]]);
            const late = chance(0.15);
            staffAttendance.push([l.id, day, status, status === 'Present' ? `${late ? '08' : '07'}:${pad(between(late ? 5 : 15, late ? 40 : 58))}:${pad(between(0, 59))}` : null, status === 'Present' && day < TODAY ? `${pad(between(15, 17))}:${pad(between(0, 59))}:00` : null]);
        }
    }
    await insertMany(conn, 'INSERT INTO lecturer_attendance (lecturer_id, date, status, check_in_time, check_out_time) VALUES ?', staffAttendance);
    log(`${staffAttendance.length.toLocaleString()} lecturer check-ins`);

    // --- 8. Marks --------------------------------------------------------------------------
    const affinity = new Map();
    const markFor = (s, code, shift = 0) => {
        const key = `${s.id}|${code}`;
        if (!affinity.has(key)) affinity.set(key, normal(0, 6));
        return clamp(s.ability + courseInfo[code].difficulty + affinity.get(key) + shift + normal(0, 8), 5, 100);
    };
    const score = (pct, max) => Math.round((pct / 100) * max * 2) / 2;
    const grades = [];
    const CURRENT_ASSESSMENTS = [['Quiz 1', 20, '2026-09-18'], ['Assignment 1', 30, '2026-10-02'], ['Mid-Semester Test', 50, '2026-10-21'], ['Quiz 2', 20, '2026-11-06']];
    const OLDER_ASSESSMENTS = [['Quiz 1', 20, '2025-09-19', 'CLASS'], ['Assignment 1', 30, '2025-10-03', 'CLASS'], ['Mid-Semester Test', 50, '2025-10-22', 'CLASS'], ['Presentation', 40, '2025-11-21', 'CLASS'], ['End of Semester Examination', 100, '2025-12-04', 'EXAM']];
    const PREVIOUS_ASSESSMENTS = [['Quiz 1', 20, '2026-02-06', 'CLASS'], ['Assignment 1', 30, '2026-02-27', 'CLASS'], ['Mid-Semester Test', 50, '2026-03-18', 'CLASS'], ['Group Project', 40, '2026-04-24', 'CLASS'], ['End of Semester Examination', 100, '2026-05-15', 'EXAM']];
    for (const s of students) {
        if (deferred.has(s.email)) continue;
        for (const code of subjectsFor(s.cls.program, s.cls.level)) {
            for (const [name, max, date] of CURRENT_ASSESSMENTS) {
                // Late-admitted students missed the first quiz.
                if (newlyAdmitted.has(s.email) && name === 'Quiz 1') continue;
                grades.push([s.id, s.cls.id, name, score(markFor(s, code), max), max, courseId[code], currTermId, 'CLASS', at(date, between(9, 16), between(0, 59))]);
            }
        }
        // The semester before last: the subjects of the level below (Level 100 subjects for today's Level 200, and so on).
        if (s.cls.level > 100) {
            for (const code of subjectsFor(s.cls.program, s.cls.level - 100)) {
                for (const [name, max, date, component] of OLDER_ASSESSMENTS) {
                    grades.push([s.id, s.cls.id, name, score(markFor(s, code, component === 'EXAM' ? -4 : 0), max), max, courseId[code], olderTermId, component, at(date, between(9, 16), between(0, 59))]);
                }
            }
        }
        const previous = PREVIOUS_SUBJECTS[String(s.cls.level)];
        if (previous) {
            for (const code of previous) {
                for (const [name, max, date, component] of PREVIOUS_ASSESSMENTS) {
                    grades.push([s.id, s.cls.id, name, score(markFor(s, code, component === 'EXAM' ? -3 : 1), max), max, courseId[code], prevTermId, component, at(date, between(9, 16), between(0, 59))]);
                }
            }
        }
    }
    await insertMany(conn, 'INSERT INTO grades (student_id, student_group_id, assessment_name, score, max_score, course_id, term_id, component, created_at) VALUES ?', grades);
    log(`${grades.length.toLocaleString()} marks across three semesters`);

    // --- 9. Fees and payments (GHS) ---------------------------------------------------------
    const FEES = [
        ['Tuition Fee – Fresh Students (Level 100)', 'Per semester, first-year students', 4250],
        ['Tuition Fee – Continuing Students', 'Per semester, Level 200 and above', 3980],
        ['Academic Facility User Fee', 'Lecture halls, labs and maintenance', 650],
        ['ICT & Internet Levy', 'Campus Wi-Fi, LMS and computer labs', 320],
        ['SRC & Student Services Dues', 'Students\' Representative Council and welfare', 150],
        ['Examination Fee', 'End of semester examinations', 280],
        ['Hostel Accommodation', 'Per semester, 4-in-a-room', 2600],
    ];
    await insertMany(conn, 'INSERT INTO fee_types (name, description, amount) VALUES ?', FEES);
    const [feeRows] = await conn.query('SELECT id, name, amount FROM fee_types');
    const fee = (prefix) => feeRows.find((f) => f.name.startsWith(prefix));
    const invoices = [];
    const plan = [];
    for (const s of students) {
        const boards = chance(0.38);
        const bill = (termId, fresh, due, created, payProfile) => {
            const items = [fresh ? fee('Tuition Fee – Fresh') : fee('Tuition Fee – Continuing'), fee('Academic Facility'), fee('ICT'), fee('SRC'), fee('Examination')];
            if (boards) items.push(fee('Hostel'));
            for (const item of items) {
                invoices.push([s.id, item.id, item.amount, item.name.startsWith('Tuition') ? due : addDays(due, 14), created]);
                plan.push({ student: s, amount: Number(item.amount), termId, profile: payProfile, start: created });
            }
        };
        if (s.cls.level > 100) bill(olderTermId, s.cls.level === 200, '2025-09-30', '2025-08-25 08:30:00', weighted([['paid', 96], ['partial', 3], ['none', 1]]));
        if (s.cls.level > 100) bill(prevTermId, false, '2026-02-27', '2026-01-12 08:30:00', weighted([['paid', 91], ['partial', 7], ['none', 2]]));
        if (!deferred.has(s.email)) bill(currTermId, s.cls.level === 100, '2026-09-30', '2026-08-24 08:30:00', weighted([['paid', 47], ['partial', 36], ['none', 17]]));
    }
    await insertMany(conn, 'INSERT INTO invoices (student_id, fee_type_id, amount_due, due_date, created_at) VALUES ?', invoices);
    const [invoiceRows] = await conn.query('SELECT id FROM invoices ORDER BY id');
    const payments = [];
    const statusUpdates = [];
    const methodRef = (date) => {
        const method = weighted([['Mobile Money', 55], ['Bank Transfer', 35], ['Cash', 7], ['Cheque', 3]]);
        const ymd = date.slice(2, 10).replace(/-/g, '');
        const ref = method === 'Mobile Money' ? `MP${ymd}.${pad(between(8, 20))}${pad(between(0, 59))}.C${between(10000, 99999)}`
            : method === 'Bank Transfer' ? `${pick(['GCB', 'ECOBANK', 'CAL', 'ADB', 'FIDELITY', 'STANBIC'])}-${ymd}-${between(100000, 999999)}`
                : method === 'Cash' ? `RCPT-${between(10000, 99999)}` : `CHQ ${between(100000, 999999)}`;
        return { method, ref };
    };
    plan.forEach((p, i) => {
        const invoiceId = invoiceRows[i].id;
        const lastDay = p.termId === olderTermId ? '2025-12-19' : p.termId === prevTermId ? '2026-05-29' : TODAY;
        const day = (offsetMin, offsetMax) => {
            const d = addDays(p.start.slice(0, 10), between(offsetMin, offsetMax));
            return d > lastDay ? lastDay : d;
        };
        let paid = 0;
        if (p.profile === 'paid') {
            const parts = p.amount > 1000 && chance(0.45) ? between(2, 3) : 1;
            for (let k = 0; k < parts; k += 1) {
                const amount = k === parts - 1 ? p.amount - paid : Math.round((p.amount / parts) / 10) * 10;
                const date = day(5 + k * 25, 20 + k * 30);
                const { method, ref } = methodRef(date);
                payments.push([invoiceId, amount, method, ref, `${date} ${pad(between(8, 16))}:${pad(between(0, 59))}:00`, parts > 1 ? `Instalment ${k + 1} of ${parts}` : null]);
                paid += amount;
            }
        } else if (p.profile === 'partial' && p.amount >= 300) {
            const amount = Math.round((p.amount * (0.25 + rand() * 0.5)) / 10) * 10;
            const date = day(10, 60);
            const { method, ref } = methodRef(date);
            payments.push([invoiceId, amount, method, ref, `${date} ${pad(between(8, 16))}:${pad(between(0, 59))}:00`, 'Part payment']);
            paid = amount;
        }
        statusUpdates.push([invoiceId, paid >= p.amount ? 'Paid' : paid > 0 ? 'Partial' : 'Pending']);
    });
    await insertMany(conn, 'INSERT INTO payments (invoice_id, amount_paid, payment_method, reference_number, payment_date, notes) VALUES ?', payments);
    for (const status of ['Paid', 'Partial']) {
        const ids = statusUpdates.filter(([, s]) => s === status).map(([id]) => id);
        for (let i = 0; i < ids.length; i += 1000) await conn.query('UPDATE invoices SET status = ? WHERE id IN (?)', [status, ids.slice(i, i + 1000)]);
    }
    log(`${FEES.length} fee types, ${invoices.length.toLocaleString()} invoices, ${payments.length.toLocaleString()} payments`);

    // --- 10. Library --------------------------------------------------------------------------
    await insertMany(conn, 'INSERT INTO books (title, author, isbn, category, total_copies, available_copies) VALUES ?', BOOKS.map(([t, a, i, c, n]) => [t, a, i, c, n, n]));
    const [bookRows] = await conn.query('SELECT id, total_copies FROM books');
    const onLoan = new Map();
    const loans = [];
    const borrowers = [...students.filter((s) => !deferred.has(s.email)).map((s) => s.userId), ...lecturers.map((l) => l.userId)];
    for (let i = 0; i < 95; i += 1) {
        const book = pick(bookRows);
        const issue = pick(currDays.slice(3));
        const due = addDays(issue, 14);
        const returned = due < TODAY ? chance(0.82) : chance(0.25);
        const active = (onLoan.get(book.id) || 0);
        if (!returned && active >= book.total_copies) continue;
        const returnDate = returned ? (() => { const r = addDays(issue, between(4, 18)); return r > TODAY ? TODAY : r; })() : null;
        if (!returned) onLoan.set(book.id, active + 1);
        loans.push([book.id, pick(borrowers), issue, due, returnDate, returned ? 'Returned' : due < TODAY ? 'Overdue' : 'Borrowed', `${issue} ${pad(between(9, 16))}:${pad(between(0, 59))}:00`]);
    }
    await insertMany(conn, 'INSERT INTO book_loans (book_id, user_id, issue_date, due_date, return_date, status, created_at) VALUES ?', loans);
    for (const [bookId, count] of onLoan) await conn.query('UPDATE books SET available_copies = total_copies - ? WHERE id = ?', [count, bookId]);
    const reading = [];
    const readingFor = { CS: ['Introduction to Algorithms', 'Operating System Concepts', 'Grokking Algorithms'], SE: ['Clean Code', 'The Pragmatic Programmer', 'Software Engineering'], IT: ['Learning Web Design', 'UNIX and Linux System Administration Handbook'], CYS: ['Security Engineering', 'Network Security Essentials'] };
    const [titled] = await conn.query('SELECT id, title FROM books');
    for (const cls of classes) {
        for (const title of readingFor[cls.program]) {
            const b = titled.find((x) => x.title === title);
            if (b) reading.push([b.id, cls.id]);
        }
    }
    await insertMany(conn, 'INSERT IGNORE INTO book_class_assignments (book_id, student_group_id) VALUES ?', reading);
    log(`${BOOKS.length} titles, ${loans.length} loans, ${reading.length} class reading assignments`);

    // --- 11. Learning materials (from who teaches what) ------------------------------------------
    const taught = new Map();
    for (const s of sessions) taught.set(`${s.student_group_id}|${s.course_id}`, s.lecturer_id);
    const codeById = Object.fromEntries(courseRows.map((c) => [c.id, c.code]));
    const TOPICS = ['Course outline and reading list', 'Week 2 lecture slides', 'Week 4 lecture slides', 'Tutorial sheet 1', 'Lab exercise 3', 'Mid-semester revision notes', 'Week 9 lecture slides', 'Past questions (2024/25)'];
    const materials = [];
    for (const [key, lecturerId] of taught) {
        const [groupId, cId] = key.split('|').map(Number);
        const code = codeById[cId];
        for (const [i, topic] of TOPICS.entries()) {
            if (i > 1 && chance(0.45)) continue;
            materials.push([groupId, lecturerId, `${code}: ${topic}`, `https://lms.educore.edu.gh/courses/${code.toLowerCase()}/${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`, at(currDays[Math.min(currDays.length - 1, i * 6)], between(8, 17), between(0, 59))]);
        }
    }
    await insertMany(conn, 'INSERT INTO materials (student_group_id, lecturer_id, title, file_url, created_at) VALUES ?', materials);
    log(`${materials.length} learning materials`);

    // --- 12. Announcements ------------------------------------------------------------------------
    const global = [
        ['Welcome to the 2026/27 academic year', 'Lectures for the First Semester begin on Monday, 31 August 2026. Fresh students should complete online registration and collect their ID cards from the Registry.', 'INFO', '2026-08-28 09:00:00'],
        ['Founders\' Day holiday', 'There will be no lectures on Monday, 21 September 2026 (Founders\' Day). Lectures resume on Tuesday.', 'INFO', '2026-09-17 10:30:00'],
        ['Mid-Semester Examination timetable released', 'Mid-semester examinations run from 19 to 23 October 2026. Check the noticeboards and your timetable for venues.', 'WARNING', '2026-10-05 14:00:00'],
        ['SRC Week celebrations', 'SRC Week runs from 2 to 6 November with a health walk, debate and a cultural night. All are welcome.', 'SUCCESS', '2026-10-27 11:00:00'],
        ['End of Semester Examinations begin 7 December', 'End of First Semester Examinations run from 7 to 18 December 2026. Students with outstanding fees must clear them to receive their examination permit.', 'ALERT', '2026-11-09 08:15:00'],
        ['Library extends opening hours', 'From 16 November the library will open until 10:00 pm on weekdays to support examination preparation.', 'INFO', '2026-11-10 16:00:00'],
    ];
    await insertMany(conn, 'INSERT INTO notifications (user_id, title, message, type, created_at) VALUES ?', global.map(([t, m, ty, c]) => [null, t, m, ty, c]));
    const personal = [];
    const owing = new Set(plan.filter((p, i) => p.termId === currTermId && statusUpdates[i][1] !== 'Paid').map((p) => p.student.userId));
    for (const userId of owing) personal.push([userId, 'Fees reminder', 'Our records show an outstanding balance on your First Semester fees. Please pay before 30 November 2026 to avoid delays with your examination permit.', 'WARNING', '2026-11-02 09:00:00']);
    for (const l of lecturers) personal.push([l.userId, 'Mid-semester marks due', 'Please enter all mid-semester test marks in the gradebook by Friday, 30 October 2026.', 'INFO', '2026-10-24 08:00:00']);
    await insertMany(conn, 'INSERT INTO notifications (user_id, title, message, type, created_at) VALUES ?', personal);
    log(`${global.length} announcements, ${personal.length} personal notifications`);

    conn.release();
    console.log(`\nEduCore University College is ready (${((Date.now() - started) / 1000).toFixed(1)} s). Every password is "password123".`);
    console.log('Try: superadmin@educore.com, admin@educore.com, headmaster@educore.com, accountant@educore.com, librarian@educore.com,');
    console.log('     lecturer@educore.com (Dr. Kwame Owusu-Ansah), security@educore.com, student@educore.com (Kwaku Agyeman, SE L200 Gold).');
}

main()
    .catch((error) => {
        console.error('Seeding failed:', error);
        process.exitCode = 1;
    })
    .finally(() => db.end());
