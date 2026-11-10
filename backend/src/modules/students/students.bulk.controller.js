const { bulkUploadHandler, pick } = require('../../utils/bulkImport');

const GENDERS = { male: 'Male', female: 'Female', other: 'Other' };

// Expected CSV headers: First Name, Last Name, Email, Index Number, Date of Birth, Gender
// (camelCase and snake_case spellings are accepted too).
const toRecord = (row) => {
    const record = {
        firstName: pick(row, 'First Name', 'firstName', 'first_name'),
        lastName: pick(row, 'Last Name', 'lastName', 'last_name'),
        email: pick(row, 'Email', 'email'),
        enrollmentNumber: pick(row, 'Index Number', 'enrollmentNumber', 'enrollment_number'),
        dateOfBirth: pick(row, 'Date of Birth', 'dateOfBirth', 'date_of_birth'),
        gender: GENDERS[(pick(row, 'Gender', 'gender') || 'other').toLowerCase()] || 'Other',
    };
    if (!record.firstName || !record.lastName || !record.email || !record.enrollmentNumber) {
        return { error: 'Missing required fields (First Name, Last Name, Email, or Index Number)' };
    }
    if (!record.email.includes('@')) return { error: 'Invalid email address' };
    record.uniqueKeys = [`enrollment:${record.enrollmentNumber.toLowerCase()}`];
    return record;
};

const insertProfile = (connection, userId, r) => connection.execute(
    'INSERT INTO students (user_id, first_name, last_name, enrollment_number, date_of_birth, gender) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, r.firstName, r.lastName, r.enrollmentNumber, r.dateOfBirth, r.gender]
);

module.exports = {
    uploadBulk: bulkUploadHandler({
        roleName: 'STUDENT',
        toRecord,
        insertProfile,
        welcomeArgs: (r, password) => [r.email, r.firstName, r.enrollmentNumber, password],
    }),
};
