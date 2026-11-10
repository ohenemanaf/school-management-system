import { useEffect, useState } from 'react';
import { IconCalendarExclamation } from '@tabler/icons-react';
import api from '../../utils/api';
import { localDateString } from '../../utils/format';

const daysUntil = (dateStr) => Math.round((Date.parse(`${dateStr}T00:00:00Z`) - Date.parse(`${localDateString()}T00:00:00Z`)) / 86400000);

/** Shows the next exam period of the current term when it is within three weeks (or under way). */
const ExamBanner = () => {
    const [exam, setExam] = useState(null);

    useEffect(() => {
        api.get('/terms/current').then(({ data }) => {
            const today = localDateString();
            const next = (data?.exams || []).find((e) => e.end_date >= today);
            if (next && daysUntil(next.start_date) <= 21) setExam(next);
        }).catch(() => {});
    }, []);

    if (!exam) return null;
    const days = daysUntil(exam.start_date);
    const when = days <= 0 ? 'under way now' : days === 1 ? 'start tomorrow' : `start in ${days} days`;

    return (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3" role="status">
            <IconCalendarExclamation size={22} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-sm">
                <p className="font-semibold text-amber-900 dark:text-amber-200">{exam.name} {when}</p>
                <p className="text-amber-800/80 dark:text-amber-200/80">{exam.start_date} to {exam.end_date}</p>
            </div>
        </div>
    );
};

export default ExamBanner;
