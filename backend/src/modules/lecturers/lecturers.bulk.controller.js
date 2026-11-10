const { bulkUploadHandler, pick } = require('../../utils/bulkImport');

// Expected CSV headers: Email, Department, Hire Date
const toRecord = (row) => {
    const record = {
        email: pick(row, 'Email', 'email'),
        department: pick(row, 'Department', 'department'),
        hireDate: pick(row, 'Hire Date', 'hireDate', 'hire_date'),
    };
    if (!record.email || !record.department) return { error: 'Missing required fields (Email, Department)' };
    if (!record.email.includes('@')) return { error: 'Invalid email address' };
    return record;
};

const insertProfile = (connection, userId, r) => connection.execute(
    'INSERT INTO lecturers (user_id, department, hire_date) VALUES (?, ?, ?)',
    [userId, r.department, r.hireDate]
);

module.exports = {
    uploadBulk: bulkUploadHandler({
        roleName: 'LECTURER',
        toRecord,
        insertProfile,
        welcomeArgs: (r, password) => [r.email, 'Lecturer', null, password],
    }),
};
