const DashboardModel = require('./dashboard.model');
const { can } = require('../../config/permissions');

// Every section names the permission its data needs; a role's dashboard can
// only include sections its role holds (enforced below and by tests).
const SECTIONS = {
    overview: 'dashboard.stats',
    accounts: 'users.manage',
    today: 'timetable.manage',
    staff: 'staffAttendance.view',
    academic: 'grades.analytics',
    financeTotals: 'finance.summary',
    financeDesk: 'finance.records',
    library: 'library.manage',
    teaching: 'staffAttendance.checkIn',
    gate: 'gate.code',
};

// What each role's home screen shows, in order. Students keep their own dashboard.
const LAYOUTS = {
    SUPER_ADMIN: ['overview', 'accounts', 'academic', 'financeTotals'],
    ADMIN: ['today', 'overview', 'staff', 'financeTotals'],
    HEADMASTER: ['overview', 'academic', 'staff', 'financeTotals'],
    ACCOUNTANT: ['financeTotals', 'financeDesk'],
    LIBRARIAN: ['library'],
    LECTURER: ['teaching'],
    GATEKEEPER: ['gate'],
    STUDENT: [],
};

class DashboardController {
    static async get(req, res) {
        try {
            const layout = (LAYOUTS[req.user.role] || []).filter((name) => can(req.user.role, SECTIONS[name]));
            const values = await Promise.all(layout.map((name) => DashboardModel[name](req.user)));
            res.json({ role: req.user.role, layout, sections: Object.fromEntries(layout.map((name, i) => [name, values[i]])) });
        } catch (error) {
            console.error('Error building dashboard:', error);
            res.status(500).json({ message: 'Failed to load dashboard' });
        }
    }
}

module.exports = { DashboardController, SECTIONS, LAYOUTS };
