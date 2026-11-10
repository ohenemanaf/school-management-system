const { runMorningJobs } = require('./reminders');

// A tiny daily scheduler (no extra dependency). Times are the server's local
// time, so set TZ for the school (e.g. TZ=Africa/Accra).

/** Milliseconds from `now` until the next hh:mm. */
function msUntil(hour, minute, now = new Date()) {
    const next = new Date(now);
    next.setHours(hour, minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next - now;
}

/** Runs `task` every day at hh:mm. Returns a function that stops it. */
function everyDayAt(hour, minute, task) {
    let timer;
    const tick = async () => {
        try {
            await task();
        } catch (error) {
            console.error('Scheduled job failed:', error);
        } finally {
            timer = setTimeout(tick, msUntil(hour, minute));
            timer.unref?.();
        }
    };
    timer = setTimeout(tick, msUntil(hour, minute));
    timer.unref?.();
    return () => clearTimeout(timer);
}

/**
 * Starts the 07:00 reminders (REMINDER_TIME to change, ENABLE_SCHEDULED_JOBS=false
 * to turn off). If the server starts later in the morning, today's run happens
 * straight away; job_runs makes sure nothing is ever sent twice.
 */
function startScheduledJobs() {
    if (process.env.ENABLE_SCHEDULED_JOBS === 'false' || process.env.NODE_ENV === 'test') return () => {};
    const [hour, minute] = (process.env.REMINDER_TIME || '07:00').split(':').map(Number);
    const run = async () => {
        const result = await runMorningJobs();
        console.log('Morning reminders:', JSON.stringify(result));
    };
    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    if (minutesNow >= hour * 60 + minute && minutesNow < 12 * 60) {
        run().catch((error) => console.error('Catch-up reminders failed:', error));
    }
    console.log(`Reminders scheduled daily at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    return everyDayAt(hour, minute, run);
}

module.exports = { startScheduledJobs, everyDayAt, msUntil };
