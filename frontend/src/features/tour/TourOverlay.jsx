import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconArrowLeft, IconArrowRight, IconPlayerPause, IconSchool, IconCheck } from '@tabler/icons-react';
import { waitForTarget } from './findTarget';

const PAD = 8;
const GAP = 14;
const MARGIN = 16;

/** Renders a body string: blank lines split paragraphs, lines starting with "• " become a list. */
function Body({ text }) {
    return text.split('\n\n').map((block, i) => {
        const lines = block.split('\n');
        if (lines.every((l) => l.startsWith('• '))) {
            return (
                <ul key={i} className="list-disc pl-5 space-y-1 mt-2">
                    {lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}
                </ul>
            );
        }
        return <p key={i} className={i ? 'mt-2' : ''}>{block}</p>;
    });
}

/**
 * Spotlight + explanation card for one tour step. The rest of the screen is
 * dimmed and not clickable while the tour runs; Esc pauses, arrows move.
 */
const TourOverlay = ({ step, index, total, chapterIndex, chapterCount, onNext, onBack, onPause, mode }) => {
    const [rect, setRect] = useState(null);
    const [searching, setSearching] = useState(true);
    const [position, setPosition] = useState(null);
    const cardRef = useRef(null);
    const targetRef = useRef(null);
    const nextRef = useRef(null);

    const measure = useCallback(() => {
        const el = targetRef.current;
        if (!el || !el.isConnected) {
            setRect(null);
            return;
        }
        const r = el.getBoundingClientRect();
        setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
    }, []);

    // Find the step's target (waiting for lazy pages), scroll it into view, measure.
    useEffect(() => {
        let cancelled = false;
        setSearching(true);
        setRect(null);
        targetRef.current = null;
        waitForTarget(step.target).then((el) => {
            if (cancelled) return;
            targetRef.current = el;
            if (el) {
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
                setTimeout(() => { if (!cancelled) { measure(); setSearching(false); } }, 380);
            } else {
                setSearching(false);
            }
        });
        return () => { cancelled = true; };
    }, [step, measure]);

    useEffect(() => {
        const update = () => measure();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [measure]);

    // Place the card next to the spotlight, or centred when there is no target.
    useLayoutEffect(() => {
        const card = cardRef.current;
        if (!card) return;
        const w = card.offsetWidth;
        const h = card.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const clampX = (x) => Math.min(Math.max(x, MARGIN), vw - w - MARGIN);
        const clampY = (y) => Math.min(Math.max(y, MARGIN), vh - h - MARGIN);
        if (!rect) {
            setPosition({ top: clampY((vh - h) / 2), left: clampX((vw - w) / 2) });
            return;
        }
        const centreX = rect.left + rect.width / 2 - w / 2;
        if (rect.top + rect.height + GAP + h <= vh - MARGIN) {
            setPosition({ top: rect.top + rect.height + GAP, left: clampX(centreX) });
        } else if (rect.top - GAP - h >= MARGIN) {
            setPosition({ top: rect.top - GAP - h, left: clampX(centreX) });
        } else if (rect.left + rect.width + GAP + w <= vw - MARGIN) {
            setPosition({ top: clampY(rect.top), left: rect.left + rect.width + GAP });
        } else if (rect.left - GAP - w >= MARGIN) {
            setPosition({ top: clampY(rect.top), left: rect.left - GAP - w });
        } else {
            setPosition({ top: vh - h - MARGIN, left: clampX((vw - w) / 2) });
        }
    }, [rect, step, searching]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onPause();
            else if (e.key === 'ArrowRight') onNext();
            else if (e.key === 'ArrowLeft' && index > 0) onBack();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onNext, onBack, onPause, index]);

    useEffect(() => { if (!searching) nextRef.current?.focus({ preventScroll: true }); }, [searching, step]);

    const last = index === total - 1;
    const progress = Math.round(((index + 1) / total) * 100);

    return (
        <div data-tour-ui className="fixed inset-0 z-[1000]" aria-live="polite">
            {/* Blocks clicks on the page while the tour runs. */}
            <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
            {rect ? (
                <div
                    className="absolute rounded-xl ring-2 ring-primary-400 transition-all duration-300 pointer-events-none"
                    style={{ ...rect, boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.62)' }}
                />
            ) : (
                <div className="absolute inset-0 bg-slate-900/60 pointer-events-none" />
            )}

            <div
                ref={cardRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="tour-title"
                className="absolute w-[min(380px,calc(100vw-32px))] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-5 transition-[top,left] duration-200"
                style={position ? { top: position.top, left: position.left } : { visibility: 'hidden' }}
            >
                <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                        <IconSchool size={14} />
                        {mode === 'workshop' ? `Workshop · ${step.chapterTitle}` : step.chapterTitle}
                    </span>
                    {mode === 'workshop' && <span className="text-[11px] text-slate-400 tabular-nums">Chapter {chapterIndex + 1} of {chapterCount}</span>}
                </div>
                <h2 id="tour-title" className="text-base font-semibold text-slate-900 dark:text-white">{step.title}</h2>
                <div className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed"><Body text={step.body} /></div>

                <div className="mt-4 h-1 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Tour progress">
                    <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${progress}%` }} />
                </div>

                <div className="flex items-center justify-between gap-2 mt-4">
                    <button type="button" onClick={onPause} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">
                        <IconPlayerPause size={14} /> {mode === 'workshop' ? 'Pause' : 'Close'}
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 tabular-nums mr-1">{index + 1} / {total}</span>
                        {index > 0 && (
                            <button type="button" onClick={onBack} aria-label="Previous step" className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                                <IconArrowLeft size={16} />
                            </button>
                        )}
                        <button ref={nextRef} type="button" onClick={onNext} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold cursor-pointer">
                            {last ? <>Finish <IconCheck size={16} /></> : <>{index === 0 && mode === 'workshop' ? 'Start' : 'Next'} <IconArrowRight size={16} /></>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TourOverlay;
