// Small, consistent controls for the scheduler screens.

export const Panel = ({ title, subtitle, action, children }) => (
    <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5 shadow-sm min-w-0">
        {(title || action) && (
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                    {title && <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>}
                    {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
                </div>
                {action}
            </div>
        )}
        {children}
    </section>
);

const BUTTON = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white border-transparent',
    secondary: 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600',
    danger: 'bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30',
};

export const Button = ({ variant = 'secondary', className = '', ...props }) => (
    <button
        type="button"
        {...props}
        className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${BUTTON[variant]} ${className}`}
    />
);

const FIELD = 'w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15';

export const Input = ({ className = '', ...props }) => <input {...props} className={`${FIELD} ${className}`} />;

export const Select = ({ className = '', children, ...props }) => (
    <select {...props} className={`${FIELD} ${className}`}>{children}</select>
);

export const Label = ({ children }) => (
    <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{children}</span>
);

export const Badge = ({ tone = 'slate', children }) => {
    const tones = {
        slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
        green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
        amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
        red: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
        blue: 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300',
    };
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
};

export const Note = ({ children }) => <p className="text-sm text-slate-500 dark:text-slate-400">{children}</p>;
