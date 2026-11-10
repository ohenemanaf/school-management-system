// Set VITE_CURRENCY (e.g. GHS) in frontend/.env to change the currency everywhere.
const CURRENCY = import.meta.env.VITE_CURRENCY || 'USD';

export const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(Number(amount) || 0);

export const formatPercent = (value) => (value === null || value === undefined || Number.isNaN(value) ? '—' : `${value}%`);

export const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');
