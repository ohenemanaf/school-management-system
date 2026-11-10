import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { IconPrinter, IconReportAnalytics, IconLock } from '@tabler/icons-react';
import api from '../../utils/api';
import { SCHOOL_NAME } from '../../utils/format';
import ResultStatement from './ResultStatement';

// A student's semester results: choose a released term, read the statement,
// print it or save it as PDF from the print dialog.
const StudentResults = () => {
    const [terms, setTerms] = useState(null);
    const [termId, setTermId] = useState('');
    const [statement, setStatement] = useState(null);
    const [state, setState] = useState('idle'); // idle | loading | ready | not-released
    const [showBreakdown, setShowBreakdown] = useState(false);

    useEffect(() => {
        api.get('/results/terms')
            .then(({ data }) => {
                setTerms(data);
                const first = data.find((t) => t.results_released && t.graded > 0) || data.find((t) => t.results_released) || data[0];
                if (first) setTermId(String(first.id));
            })
            .catch(() => { setTerms([]); toast.error('Could not load your terms'); });
    }, []);

    useEffect(() => {
        if (!termId) return;
        setState('loading');
        setStatement(null);
        api.get('/results/statement', { params: { term_id: termId } })
            .then(({ data }) => { setStatement(data); setState('ready'); })
            .catch((error) => {
                if (error.response?.data?.code === 'NOT_RELEASED') setState('not-released');
                else { setState('idle'); toast.error(error.response?.data?.message || 'Could not load your results'); }
            });
    }, [termId]);

    const selected = terms?.find((t) => String(t.id) === termId);

    return (
        <div className="page w-full box-border">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <IconReportAnalytics size={28} className="text-primary-600" /> Semester Results
                    </h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Your full statement for each term: marks, grades, GPA and attendance.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {terms?.length > 0 && (
                        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            Term
                            <select value={termId} onChange={(e) => setTermId(e.target.value)} className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100">
                                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}{t.results_released ? '' : ' (not released)'}</option>)}
                            </select>
                        </label>
                    )}
                    {state === 'ready' && (
                        <>
                            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <input type="checkbox" checked={showBreakdown} onChange={(e) => setShowBreakdown(e.target.checked)} />
                                Show each assessment
                            </label>
                            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold cursor-pointer">
                                <IconPrinter size={18} /> Print / Save PDF
                            </button>
                        </>
                    )}
                </div>
            </div>

            {terms === null || state === 'loading' ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
            ) : terms.length === 0 ? (
                <Message title="No terms yet">Your results will appear here once the school sets up a term.</Message>
            ) : state === 'not-released' ? (
                <Message title={`${selected?.name || 'This term'}: results not released yet`} icon>
                    Your results will appear here as soon as the school releases them. Your lecturers may already have entered marks.
                </Message>
            ) : state === 'ready' && statement ? (
                <>
                    <div className="overflow-x-auto pb-4">
                        <ResultStatement data={statement} schoolName={SCHOOL_NAME} showBreakdown={showBreakdown} />
                    </div>
                    {/* Printed copy, outside the app layout so menus never print. */}
                    {createPortal(
                        <div className="print-only">
                            <ResultStatement data={statement} schoolName={SCHOOL_NAME} showBreakdown={showBreakdown} />
                        </div>,
                        document.body
                    )}
                </>
            ) : null}
        </div>
    );
};

const Message = ({ title, children, icon }) => (
    <div className="max-w-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl p-6 shadow-sm">
        <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">{icon && <IconLock size={18} className="text-slate-400" />}{title}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{children}</p>
    </div>
);

export default StudentResults;
