import { can } from '../../config/permissions';

// The onboarding workshop: one chapter per part of the system, shown only to
// roles that can use that part (same page permissions as the menu). Each step
// points at something on screen (see findTarget.js) and explains it.
//
// Bump WORKSHOP_VERSION when the content changes enough that everyone should
// see it again.
export const WORKSHOP_VERSION = 1;

const ROLE_NAMES = {
    SUPER_ADMIN: 'super admin', ADMIN: 'administrator', HEADMASTER: 'headmaster', ACCOUNTANT: 'accountant',
    LIBRARIAN: 'librarian', LECTURER: 'lecturer', STUDENT: 'student', GATEKEEPER: 'gatekeeper',
};

/** Picks text for the user's role; `default` covers everyone else. */
const byRole = (user, texts) => texts[user.role] ?? texts.default ?? '';

const ROLE_INTRO = {
    SUPER_ADMIN: 'As super admin you oversee everything: you are the only one who manages system accounts and roles, and you see school-wide results and finances.',
    ADMIN: 'As administrator you run the school day to day: students, lecturers, classes, the timetable and attendance. You can see the fees picture, but changing fees belongs to the accountant.',
    HEADMASTER: 'As headmaster you see how the whole school is doing. Almost everything is view-only for you, so you can explore without worrying about changing anything.',
    ACCOUNTANT: 'As accountant you own the school fees: fee types, invoices and payments. You also see the student list with guardian contacts for follow-up.',
    LIBRARIAN: 'As librarian you run the library: the book catalogue, issuing and returning books, and reading lists for classes.',
    LECTURER: 'As a lecturer you work with the classes you teach: your timetable, attendance, grades and learning materials.',
    STUDENT: 'As a student you can see your timetable, results, fees, library and class materials, all in one place.',
    GATEKEEPER: 'As gatekeeper you show the check-in code that lecturers enter when they arrive.',
};

function chapters(user) {
    const manage = (permission) => can(user, permission);
    return [
        {
            id: 'welcome',
            title: 'Welcome',
            steps: [{
                title: `Welcome to the school system, ${user.name || 'there'}!`,
                body: `This short workshop walks you through every part of the system you can use, one page at a time, like a training session.\n\n${ROLE_INTRO[user.role] || ''}\n\nUse Next and Back (or the arrow keys). Press Pause (or Esc) at any time and continue later from the ? button at the top.`,
            }],
        },
        {
            id: 'layout',
            title: 'Finding your way',
            route: '/admin',
            when: user.role !== 'GATEKEEPER',
            steps: [
                {
                    target: '[data-tour="sidebar"]',
                    title: 'The menu',
                    body: `Everything you can open is listed here. The menu only shows what a ${ROLE_NAMES[user.role]} needs, so other roles see different items.\n\nOn a phone, open it with the ☰ button at the top left.`,
                },
                {
                    target: '[data-tour="notifications"]',
                    title: 'Notifications',
                    body: byRole(user, {
                        STUDENT: 'Announcements from the school arrive here. Every school morning at 7:00 you also get your class timetable for the day, and you are warned ahead of exam weeks.',
                        LECTURER: 'Announcements arrive here. Every school morning at 7:00 you get your own lessons for the day, and you are warned ahead of exam weeks.',
                        default: 'Announcements and alerts arrive here. A red dot means something is unread; click an item to mark it read.',
                    }),
                },
                {
                    target: '[data-tour="help"]',
                    title: 'Help is always here',
                    body: 'Click ? on any page to have that page explained, or to continue or restart this workshop.',
                },
            ],
        },
        {
            id: 'dashboard',
            title: 'Your dashboard',
            route: '/admin',
            perm: 'page.dashboard',
            steps: [
                {
                    target: '.page h1',
                    title: 'Your home screen',
                    body: byRole(user, {
                        SUPER_ADMIN: 'Your dashboard shows the whole school at a glance: students, lecturers, attendance, system accounts by role, academic results and the fees picture.',
                        ADMIN: "Your dashboard starts with today: every class on the timetable and whether its attendance has been taken. Below are the school's numbers, staff present today and fees.",
                        HEADMASTER: 'Your dashboard is a summary of how the school is doing: attendance, academic results (strongest and weakest classes), staff attendance and fees collected.',
                        ACCOUNTANT: "Your dashboard shows fees at a glance: what is billed, collected and outstanding, what is overdue, this week's payments and the largest balances.",
                        LIBRARIAN: 'Your dashboard shows the library at a glance: books, books on loan, overdue loans and the latest issues.',
                        LECTURER: "Your dashboard shows your classes and students, and today's lessons with a link to take attendance for each.",
                        STUDENT: 'Your dashboard brings together your timetable, results, fee balance and library reading.',
                        default: 'Your home screen.',
                    }),
                },
                ...(user.role === 'LECTURER' ? [{
                    target: { text: 'Gate check-in', selector: 'h3' },
                    title: 'Checking in when you arrive',
                    body: 'When you arrive at school, the gatekeeper shows a 6-character code. Type it here and press Check in to record that you are present. Each code works once and changes every few minutes.',
                }] : []),
                ...(['SUPER_ADMIN', 'ADMIN', 'HEADMASTER', 'ACCOUNTANT', 'LIBRARIAN'].includes(user.role) ? [{
                    target: { text: 'Shortcuts', selector: 'h3' },
                    title: 'Shortcuts',
                    body: 'Quick links to the jobs you do most often. They only include pages your role can use.',
                }] : []),
            ],
        },
        {
            id: 'timetable',
            title: 'Timetable',
            route: '/admin/timetable',
            perm: 'page.timetable',
            steps: [{
                target: '.page h1',
                title: 'The timetable',
                body: byRole(user, {
                    STUDENT: 'This is your class timetable for the week: subject, lecturer and room for every period.',
                    LECTURER: 'This is your teaching timetable: which class, subject and room you have, every day.',
                    default: manage('timetable.manage')
                        ? 'The live timetable for every class. You can filter by class, room or lecturer, and add or delete single slots by hand. For a whole term, use the Timetable Generator instead.'
                        : 'The live timetable for every class. Filter by class, room or lecturer to see one schedule.',
                }),
            }],
        },
        {
            id: 'scheduler',
            title: 'Timetable Generator',
            route: '/admin/scheduler',
            perm: 'page.scheduler',
            steps: [
                {
                    target: '[role="tablist"]',
                    title: 'Six steps to a full timetable',
                    body: 'The generator builds a clash-free timetable for every class and stream. Work through the tabs in order:\n\n• Calendar: the term, exam weeks and the bell schedule\n• Classes & streams: Gold, Diamond and so on\n• Subjects & teachers: heavy subjects, and what each teacher can teach\n• Allocations: each class\'s subjects and periods a week\n• Generate: build, check and publish\n• Reminders: the 7:00 messages and exam alerts',
                },
                {
                    target: '.page h1',
                    title: 'What the generator guarantees',
                    body: 'No class, teacher or room is ever double-booked, and teachers stay within their limits. It also keeps heavy subjects in the morning, spreads each subject across the week and shares the work fairly.\n\nA run is only a draft. Nothing changes for anyone until you press Publish.',
                },
            ],
        },
        {
            id: 'students',
            title: 'Students',
            route: '/admin/students',
            perm: 'page.students',
            steps: [
                {
                    target: '.page h1',
                    title: 'Student records',
                    body: byRole(user, {
                        LECTURER: 'You see the students in the classes you teach: names, index numbers and class. Home and health details are kept private.',
                        ACCOUNTANT: 'You see every student with their class and guardian contact, so you can follow up on fees. Home address and health details are kept private.',
                        HEADMASTER: 'You can look through every student record. This page is view-only for you.',
                        default: 'Every student, with their class, contacts and records. You are one of the few roles that can see medical details, so handle them with care.',
                    }),
                },
                ...(manage('students.manage') ? [
                    { target: { text: 'Add New Student' }, title: 'Adding a student', body: 'Add one student at a time here. If you leave the password empty, the system makes a temporary one and emails it; the student must choose their own password at first login. An index number is created automatically if you leave it blank.' },
                    { target: { text: 'Bulk Upload' }, title: 'Importing many students', body: 'Upload a CSV file (First Name, Last Name, Email, Index Number, Date of Birth, Gender) to enrol a whole class at once. Rows with problems are skipped and reported, and the rest are still added.' },
                ] : []),
            ],
        },
        {
            id: 'attendance',
            title: 'Student attendance',
            route: '/admin/attendance',
            perm: 'page.attendance',
            steps: [
                ...(manage('attendance.record') ? [{
                    target: { text: 'Load Students' },
                    title: 'Taking a register',
                    body: 'Pick the class and date, press Load Students, tap anyone who is absent, then submit. The whole register is saved in one go.' + (user.role === 'LECTURER' ? ' You can only take attendance for the classes you teach.' : ''),
                }] : []),
                {
                    target: { text: 'Attendance Records' },
                    title: 'Attendance history',
                    body: manage('attendance.record')
                        ? 'Recent registers are listed here. Saving a register again for the same class and day simply updates it.'
                        : 'Recent registers from every class. This is view-only for you.',
                },
            ],
        },
        {
            id: 'gradebook',
            title: 'Gradebook',
            route: '/admin/grades',
            perm: 'page.gradebook',
            steps: [{
                target: { text: 'Input Grade' },
                title: 'Entering grades',
                body: 'Choose one of your classes, the student, the assessment name and the score out of the maximum. Only you, as the class lecturer, and the student themself can see named grades. School leaders only see averages.',
            }],
        },
        {
            id: 'performance',
            title: 'Academic performance',
            route: '/admin/performance',
            perm: 'page.performance',
            steps: [{
                target: '.page h1',
                title: 'Results without names',
                body: 'Average scores, pass rates and how marks are spread, by class and by assessment. No student is named here. A class with fewer than 3 graded students is hidden, so nobody\'s mark can be worked out from an average.',
            }],
        },
        {
            id: 'results',
            title: 'My results',
            route: '/admin/results',
            perm: 'page.results',
            steps: [{ target: '.page h1', title: 'Your results', body: 'Every graded assessment, with your score and percentage. Only you and your lecturer can see these.' }],
        },
        {
            id: 'materials',
            title: 'Learning materials',
            route: '/admin/materials',
            perm: 'page.materials',
            steps: [{
                target: '.page h1',
                title: 'Learning materials',
                body: manage('materials.manage')
                    ? 'Share notes, slides and links with the classes you teach. Students of that class see them straight away.'
                    : user.role === 'STUDENT' ? 'Notes, slides and links your lecturers share with your class.' : 'Everything lecturers have shared with their classes.',
            }],
        },
        {
            id: 'finance',
            title: 'Fees and finance',
            route: '/admin/finance',
            perm: 'page.finance',
            steps: [
                {
                    target: '.page h1',
                    title: 'School fees',
                    body: byRole(user, {
                        STUDENT: 'Your invoices, what you have paid and what is still due.',
                        HEADMASTER: 'You see the totals: collected and still due. Individual fee records are kept by the accountant.',
                        ADMIN: 'You can see every invoice and who has paid, but you cannot change anything. Creating fees and recording payments is the accountant\'s job.',
                        default: 'Totals at the top, then invoices, fee types and the list of students who owe.',
                    }),
                },
                ...(manage('finance.manage') ? [
                    { target: { text: 'New Fee Type' }, title: 'Step 1: fee types', body: 'First create the kinds of fees you charge (for example, Tuition or Exam fee) with their usual amount.' },
                    { target: { text: 'Generate Invoice' }, title: 'Step 2: invoices', body: 'Then bill a student: pick the student, the fee type, the amount and the due date.' },
                    { target: { text: 'Defaulters', selector: 'button' }, title: 'Step 3: payments and follow-up', body: 'Press Record Payment on an invoice whenever money comes in (cash, bank transfer, mobile money or cheque). The status updates by itself, and Defaulters lists who still owes, largest balance first.' },
                ] : []),
            ],
        },
        {
            id: 'library',
            title: 'Library',
            route: '/admin/library',
            perm: 'page.library',
            steps: [
                {
                    target: '.page h1',
                    title: 'The library',
                    body: manage('library.manage')
                        ? 'You run the catalogue, the loans and the reading lists for classes.'
                        : 'Browse the catalogue, read PDF books and see the books you have borrowed.',
                },
                ...(manage('library.manage') ? [
                    { target: { text: 'Add New Book' }, title: 'Adding books', body: 'Add a title with its number of copies. Attach a PDF and anyone can read it online.' },
                    { target: { text: 'Circulation' }, title: 'Lending and returns', body: 'Issue a book to a student with a due date, and mark it returned when it comes back. Overdue loans show up on your dashboard.' },
                ] : []),
            ],
        },
        {
            id: 'lecturers',
            title: 'Lecturers',
            route: '/admin/lecturers',
            perm: 'page.lecturers',
            steps: [{
                target: '.page h1',
                title: 'Lecturers',
                body: manage('lecturers.manage')
                    ? 'Add lecturers with their name, department and a starting password (they must change it at first login), or import many at once from a CSV file.'
                    : 'Every lecturer and their department. View-only for you.',
            }],
        },
        {
            id: 'staff',
            title: 'Staff attendance',
            route: '/admin/staff-attendance',
            perm: 'page.staffAttendance',
            steps: [{
                target: { text: 'Attendance Log' },
                title: 'Who came in',
                body: 'Lecturers check in with the gatekeeper\'s code when they arrive, and each check-in is logged here.' + (manage('staffAttendance.manage') ? ' You can also record leave or absence by hand.' : ' This is view-only for you.'),
            }],
        },
        {
            id: 'classes',
            title: 'Classes',
            route: '/admin/student-groups',
            perm: 'page.groups',
            steps: [{
                target: '.page h1',
                title: 'Classes',
                body: user.role === 'LECTURER'
                    ? 'The classes you teach. They come from the timetable.'
                    : 'Every class (for example, Form 1 Gold) with its level and program. Students, timetables and attendance are all organised by class.',
            }],
        },
        {
            id: 'academics',
            title: 'Courses, programs and rooms',
            route: '/admin/courses',
            perm: 'page.academics',
            steps: [{
                target: '.page h1',
                title: 'The building blocks',
                body: 'Courses are the subjects you teach. Programs group classes (for example, a degree or track), and Rooms list where lessons happen with their capacity. The timetable is built from these.' + (manage('academics.manage') ? '' : ' View-only for you.'),
            }],
        },
        {
            id: 'broadcast',
            title: 'Announcements',
            route: '/admin/broadcast',
            perm: 'page.broadcast',
            steps: [{
                target: '.page h1',
                title: 'Sending an announcement',
                body: (manage('broadcast.anyAudience')
                    ? 'Send a message to everyone, or only to students, lecturers or administrators.'
                    : 'Send a message to all students, for example a fee reminder.')
                    + ' It appears in their notifications, and you can also email it.',
            }],
        },
        {
            id: 'users',
            title: 'System accounts',
            route: '/admin/users',
            perm: 'page.users',
            steps: [{
                target: '.page h1',
                title: 'Accounts and roles',
                body: 'Every login in the system. Only you can change someone\'s role, deactivate an account (they are signed out straight away) or delete one. For safety you cannot change or remove your own account here.',
            }],
        },
        {
            id: 'settings',
            title: 'Settings',
            route: '/admin/settings',
            when: user.role !== 'GATEKEEPER',
            steps: [{
                target: '.page h1',
                title: 'Your settings',
                body: 'Change your password (at least 12 characters), switch between light and dark mode, and set how you receive notifications.',
            }],
        },
        {
            id: 'gate',
            title: 'Gate check-in',
            route: '/gatekeeper',
            when: user.role === 'GATEKEEPER',
            steps: [
                { target: '[data-tour="gate-code"]', title: 'The check-in code', body: 'Lecturers type this code on their dashboard when they arrive. Each code works once and a new one appears by itself, so just keep this screen visible at the gate.' },
                { target: '[data-tour="gate-list"]', title: 'Who has checked in', body: 'Everyone who has checked in today, with the time, updated every 30 seconds.' },
            ],
        },
        {
            id: 'finish',
            title: 'Done',
            steps: [{
                title: 'You have finished the workshop',
                body: 'That is everything you can do in the system. You can open this workshop again at any time, or have a single page explained, from the ? button at the top of the screen.',
            }],
        },
    ];
}

/** The workshop for this user: chapters they can use, flattened into steps. */
export function buildWorkshop(user) {
    if (!user) return [];
    const visible = chapters(user).filter((c) => (c.perm ? can(user, c.perm) : true) && c.when !== false && c.steps.length > 0);
    return visible.flatMap((chapter, chapterIndex) => chapter.steps.map((step) => ({
        ...step,
        route: step.route ?? chapter.route ?? null,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterIndex,
        chapterCount: visible.length,
    })));
}

/** Steps explaining the page at `pathname` (used by "Explain this page"). */
// Pages that share another page's chapter.
const PAGE_ALIASES = { '/admin/programs': '/admin/courses', '/admin/rooms': '/admin/courses' };

export function pageTour(user, pathname) {
    const route = PAGE_ALIASES[pathname] || pathname;
    return buildWorkshop(user)
        .filter((s) => s.route === route && !['welcome', 'finish', 'layout'].includes(s.chapterId))
        .map((s) => ({ ...s, route: pathname }));
}
