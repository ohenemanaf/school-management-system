import { Link } from 'react-router-dom';
import { IconCircleCheck, IconClock } from '@tabler/icons-react';

// Small building blocks shared by the role dashboards.

export const Tile = ({ label, value, hint, icon, tone = 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400' }) => (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 min-w-0 shadow-sm">
        <div className="flex items-center justify-between mb-3 min-w-0 gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{label}</span>
            {icon && <div className={`p-1.5 rounded-lg shrink-0 ${tone}`}>{icon}</div>}
        </div>
        <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100 truncate tabular-nums">{value}</p>
        {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{hint}</p>}
    </div>
);

export const TileRow = ({ children }) => <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>;

export const Card = ({ title, action, children, className = '' }) => (
    <section className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5 min-w-0 shadow-sm ${className}`}>
        <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
            {action}
        </div>
        {children}
    </section>
);

export const CardLink = ({ to, children }) => (
    <Link to={to} className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline whitespace-nowrap">{children}</Link>
);

export const Empty = ({ children }) => <p className="text-sm text-slate-500 dark:text-slate-400">{children}</p>;

/** Status chip: never colour alone, always an icon and a word. */
export const AttendanceChip = ({ taken }) => (taken ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        <IconCircleCheck size={14} /> Attendance taken
    </span>
) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        <IconClock size={14} /> Not taken yet
    </span>
));

/** One line per item: main text, secondary text, and a right-hand value. */
export const ListRow = ({ primary, secondary, right }) => (
    <li className="flex items-center justify-between gap-3 py-2.5 min-w-0">
        <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{primary}</p>
            {secondary && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{secondary}</p>}
        </div>
        <div className="shrink-0 text-right">{right}</div>
    </li>
);

export const List = ({ children }) => <ul className="divide-y divide-slate-100 dark:divide-slate-700/60 -my-2.5">{children}</ul>;

/** A simple meter: how much of a whole is done (e.g. fees collected). */
export const Meter = ({ value, label }) => (
    <div>
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span>{label}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{value === null ? '—' : `${value}%`}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden" role="meter" aria-valuenow={value ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(value ?? 0, 100)}%`, background: 'var(--viz-series-1)' }} />
        </div>
    </div>
);
