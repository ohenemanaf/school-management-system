// Shared values for the scheduler screens.

export const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
export const SKILLS = [
    { value: 0, label: '—' },
    { value: 1, label: '1 Can teach' },
    { value: 2, label: '2 Good' },
    { value: 3, label: '3 Specialist' },
];
