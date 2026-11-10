// Display name for a lecturer row, falling back to the email prefix for
// lecturers created before names were recorded.
export const lecturerName = (lecturer) =>
    [lecturer?.first_name, lecturer?.last_name].filter(Boolean).join(' ')
    || lecturer?.email?.split('@')[0]
    || '';
