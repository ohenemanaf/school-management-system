import { useEffect, useRef, useState } from 'react';
import { IconHelp, IconBulb, IconPlayerPlay, IconRefresh } from '@tabler/icons-react';
import { useTour } from './tourContext';

/** The ? button in the top bar: explain this page, continue or restart the workshop. */
const HelpMenu = ({ className = '', tone = 'light' }) => {
    const { startWorkshop, startPageTour, status, savedStep, totalSteps, hasPageTour } = useTour();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const canContinue = (status === 'paused' || status === 'in_progress') && savedStep > 0;
    const choose = (fn) => { setOpen(false); fn(); };
    const item = 'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer';
    const buttonTone = tone === 'dark'
        ? 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10'
        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700';

    return (
        <div className={`relative ${className}`} ref={ref}>
            <button
                type="button"
                data-tour="help"
                aria-label="Help and guided tour"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${open ? 'bg-primary-50 text-primary-600' : buttonTone}`}
            >
                <IconHelp size={20} />
            </button>
            {open && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 z-50">
                    {hasPageTour && (
                        <button type="button" className={item} onClick={() => choose(startPageTour)}>
                            <IconBulb size={18} className="text-amber-500 shrink-0 mt-0.5" />
                            <span><span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Explain this page</span><span className="block text-xs text-slate-500 dark:text-slate-400">A short tour of what you see here</span></span>
                        </button>
                    )}
                    {canContinue && (
                        <button type="button" className={item} onClick={() => choose(() => startWorkshop(savedStep))}>
                            <IconPlayerPlay size={18} className="text-primary-600 shrink-0 mt-0.5" />
                            <span><span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Continue the workshop</span><span className="block text-xs text-slate-500 dark:text-slate-400">Step {savedStep + 1} of {totalSteps}</span></span>
                        </button>
                    )}
                    <button type="button" className={item} onClick={() => choose(() => startWorkshop(0))}>
                        <IconRefresh size={18} className="text-slate-500 shrink-0 mt-0.5" />
                        <span><span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{status ? 'Restart the workshop' : 'Start the workshop'}</span><span className="block text-xs text-slate-500 dark:text-slate-400">A guided walk through everything you can do</span></span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default HelpMenu;
