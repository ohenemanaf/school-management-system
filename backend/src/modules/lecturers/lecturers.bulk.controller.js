const { bulkUploadHandler, pick } = require('../../utils/bulkImport');

// Expected CSV headers: Email, Department, Hire Date (First Name and Last Name optional)
const toRecord = (row) => {
    const record = {
        firstName: pick(row, 'First Name', 'firstName', 'first_name'),
        lastName: pick(row, 'Last Name', 'lastName', 'last_name'),
        email: pick(row, 'Email', 'email'),
        department: pick(row, 'Department', 'department'),
        hireDate: pick(row, 'Hire Date', 'hireDate', 'hire_date'),
    };
    if (!record.email || !record.department) return { error: 'Missing required fields (Email, Department)' };
    if (!record.email.includes('@')) return { error: 'Invalid email address' };
    return record;
};

const insertProfile = (connection, userId, r) => connection.execute(
    'INSERT INTO lecturers (user_id, first_name, last_name, department, hire_date) VALUES (?, ?, ?, ?, ?)',
    [userId, r.firstName, r.lastName, r.department, r.hireDate]
);

module.exports = {
    uploadBulk: bulkUploadHandler({
        roleName: 'LECTURER',
        toRecord,
        insertProfile,
        welcomeArgs: (r, password) => [r.email, r.firstName || 'Lecturer', null, password],
    }),
};
