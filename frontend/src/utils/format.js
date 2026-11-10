// Set VITE_CURRENCY (e.g. GHS) in frontend/.env to change the currency everywhere.
const CURRENCY = import.meta.env.VITE_CURRENCY || 'USD';

export const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(Number(amount) || 0);

export const formatPercent = (value) => (value === null || value === undefined || Number.isNaN(value) ? '—' : `${value}%`);

/** Today (or `date`) as YYYY-MM-DD in the viewer's time zone. */
export const localDateString = (date = new Date()) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

export const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
};
