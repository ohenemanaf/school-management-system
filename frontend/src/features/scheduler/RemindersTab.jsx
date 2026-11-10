import { useState } from 'react';
import toast from 'react-hot-toast';
import { IconBell, IconEye, IconSend } from '@tabler/icons-react';
import api from '../../utils/api';
import { localDateString } from '../../utils/format';
import { Panel, Button, Input, Label, Badge, Note } from './ui';
import { errorMessage } from './constants';

// Explains the automatic 07:00 reminders and lets an admin preview or send them now.
const RemindersTab = () => {
    const [date, setDate] = useState(localDateString());
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);

    const run = async (preview) => {
        if (!preview && !window.confirm(`Send the reminders for ${date} now? Each one is only ever sent once per day.`)) return;
        setBusy(true);
        try {
            const { data } = await api.post('/reminders/run', { date, preview });
            setResult({ ...data, preview });
            if (!preview) toast.success('Reminders processed');
        } catch (error) {
            toast.error(errorMessage(error, 'Could not run reminders'));
        } finally {
            setBusy(false);
        }
    };

    const t = result?.timetable;
    const e = result?.exams;

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Panel title="Automatic reminders" subtitle="Sent by the server; no one needs to be logged in.">
                <ul className="flex flex-col gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex gap-2"><IconBell size={18} className="shrink-0 text-primary-600" /><span><strong>Every school day at 07:00</strong> each student gets their class&apos;s timetable for the day, and each lecturer gets their own lessons. Weekends and days outside the current term are skipped.</span></li>
                    <li className="flex gap-2"><IconBell size={18} className="shrink-0 text-amber-600" /><span><strong>Exam alerts</strong> go out on the &quot;alert days&quot; set for each exam period (by default 14, 7 and 1 days before it starts).</span></li>
                    <li className="flex gap-2"><IconBell size={18} className="shrink-0 text-slate-400" /><span>Each reminder is sent <strong>once</strong>, even if the server restarts. If the server starts after 07:00 in the morning, it sends that day&apos;s reminders straight away.</span></li>
                </ul>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">Reminders appear in the bell icon. Set REMINDER_EMAILS=true on the server to email them too, and REMINDER_TIME to change the time.</p>
            </Panel>

            <Panel title="Preview or send now">
                <div className="flex flex-wrap items-end gap-2 mb-4">
                    <div><Label>For date</Label><Input type="date" value={date} onChange={(ev) => setDate(ev.target.value)} /></div>
                    <Button disabled={busy} onClick={() => run(true)}><IconEye size={16} /> Preview</Button>
                    <Button variant="primary" disabled={busy} onClick={() => run(false)}><IconSend size={16} /> Send now</Button>
                </div>
                {!result ? <Note>Preview shows what would be sent without sending anything.</Note> : (
                    <div className="flex flex-col gap-4 text-sm">
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Daily timetable · {t.day} {t.date}</p>
                            {t.skipped ? <Badge tone="amber">Skipped: {t.skipped}</Badge> : (
                                <p className="text-slate-600 dark:text-slate-300">
                                    {t.classes} classes and {t.lecturers} lecturers have lessons.
                                    {result.preview ? ' Nothing was sent.' : ` ${t.notified} notifications sent.`}
                                </p>
                            )}
                            {t.sample && <pre className="mt-2 whitespace-pre-wrap text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-700 dark:text-slate-200">{t.title}{'\n'}{t.sample}</pre>}
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Exam alerts</p>
                            {result.preview
                                ? (e.alerts.length ? e.alerts.map((a) => <p key={`${a.examId}-${a.daysAway}`} className="text-slate-600 dark:text-slate-300">{a.title}</p>) : <Note>No exam alerts due on this date.</Note>)
                                : (e.sent.length ? <p className="text-slate-600 dark:text-slate-300">{e.sent.length} alert(s) sent.</p> : <Note>No new exam alerts to send.</Note>)}
                        </div>
                    </div>
                )}
            </Panel>
        </div>
    );
};

export default RemindersTab;
