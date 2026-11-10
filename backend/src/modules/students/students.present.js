const { can } = require('../../config/permissions');
const { signFields } = require('../../utils/signedUploads');

// Fields every role allowed to list students may see.
const BASIC = [
    'id', 'user_id', 'first_name', 'last_name', 'enrollment_number', 'gender', 'profile_image_url',
    'student_group_id', 'student_group_name', 'level', 'email', 'is_active',
];
const GUARDIAN = ['guardian_name', 'guardian_phone'];
const PERSONAL = ['date_of_birth', 'address', ...GUARDIAN];
const MEDICAL = ['medical_conditions', 'blood_group'];

/** The student fields a role may receive. Anything not listed is dropped. */
function studentFieldsFor(role) {
    const fields = new Set(BASIC);
    if (can(role, 'students.guardianContact')) GUARDIAN.forEach((f) => fields.add(f));
    if (can(role, 'students.personal')) PERSONAL.forEach((f) => fields.add(f));
    if (can(role, 'students.medical')) MEDICAL.forEach((f) => fields.add(f));
    return fields;
}

/** Strips fields the role may not see and signs photo links. Accepts one row or a list. */
function presentStudents(rows, role) {
    const fields = studentFieldsFor(role);
    const present = (row) => Object.fromEntries(Object.entries(row).filter(([key]) => fields.has(key)));
    const shaped = Array.isArray(rows) ? rows.map(present) : present(rows);
    return signFields(shaped, 'profile_image_url');
}

module.exports = { presentStudents, studentFieldsFor };
