import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { TourContext } from './tourContext';
import { buildWorkshop, pageTour, WORKSHOP_VERSION } from './workshop';
import TourOverlay from './TourOverlay';

// Runs the onboarding workshop (first login, or from the ? menu) and single-page
// tours. Progress is stored in the user's preferences on the server, so it
// follows them to any device.
const TourProvider = ({ children }) => {
    const { user, savePreferences } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [tour, setTour] = useState(null); // { mode: 'workshop' | 'page', steps, index }
    const autoStarted = useRef(false);

    const workshopSteps = useMemo(() => buildWorkshop(user), [user]);
    const saved = user?.preferences?.workshop;
    const current = saved?.version === WORKSHOP_VERSION ? saved : null;
    const onAppPage = location.pathname.startsWith('/admin') || location.pathname === '/gatekeeper';

    const persist = useCallback((status, step) => {
        savePreferences({ workshop: { version: WORKSHOP_VERSION, status, step, updatedAt: new Date().toISOString() } })
            .catch(() => { /* progress is a convenience; never block the tour */ });
    }, [savePreferences]);

    const startWorkshop = useCallback((fromStep = 0) => {
        if (!workshopSteps.length) return;
        const index = Math.min(Math.max(fromStep, 0), workshopSteps.length - 1);
        setTour({ mode: 'workshop', steps: workshopSteps, index });
        persist('in_progress', index);
    }, [workshopSteps, persist]);

    const startPageTour = useCallback(() => {
        const steps = pageTour(user, location.pathname);
        if (!steps.length) {
            toast('There is no guide for this page yet. Try the full workshop from the ? menu.');
            return;
        }
        setTour({ mode: 'page', steps, index: 0 });
    }, [user, location.pathname]);

    // A different person signed in: forget the previous tour.
    const lastUserId = useRef(user?.id);
    useEffect(() => {
        if (lastUserId.current === user?.id) return;
        lastUserId.current = user?.id;
        autoStarted.current = false;
        setTour(null);
    }, [user?.id]);

    // First visit: start the workshop once the user is signed in and on an app page.
    useEffect(() => {
        if (autoStarted.current || tour || !user || user.mustChangePassword || current || !onAppPage || !workshopSteps.length) return;
        autoStarted.current = true;
        const timer = setTimeout(() => startWorkshop(0), 900);
        return () => clearTimeout(timer);
    }, [user, current, onAppPage, tour, workshopSteps.length, startWorkshop]);

    const step = tour ? tour.steps[tour.index] : null;

    // Walk to the step's page, like a trainer moving the class to the next room.
    useEffect(() => {
        if (step?.route && tour.mode === 'workshop' && location.pathname !== step.route) navigate(step.route);
    }, [step, tour?.mode, location.pathname, navigate]);

    // Side effects (saving, messages) stay outside state updates so they run once.
    const tourRef = useRef(tour);
    tourRef.current = tour;

    const go = useCallback((delta) => {
        const t = tourRef.current;
        if (!t) return;
        const index = t.index + delta;
        if (index < 0) return;
        if (index >= t.steps.length) {
            if (t.mode === 'workshop') {
                persist('completed', t.steps.length - 1);
                toast.success('Workshop complete. Replay it any time from the ? button.');
            }
            setTour(null);
            return;
        }
        if (t.mode === 'workshop') persist('in_progress', index);
        setTour({ ...t, index });
    }, [persist]);

    const pause = useCallback(() => {
        const t = tourRef.current;
        if (t?.mode === 'workshop') {
            persist('paused', t.index);
            toast('Workshop paused. Continue from the ? button whenever you like.');
        }
        setTour(null);
    }, [persist]);

    const value = useMemo(() => ({
        startWorkshop,
        startPageTour,
        status: current?.status || null,
        savedStep: current?.step || 0,
        totalSteps: workshopSteps.length,
        hasPageTour: pageTour(user, location.pathname).length > 0,
    }), [startWorkshop, startPageTour, current, workshopSteps.length, user, location.pathname]);

    return (
        <TourContext.Provider value={value}>
            {children}
            {step && (
                <TourOverlay
                    key={`${tour.mode}-${tour.index}`}
                    step={step}
                    index={tour.index}
                    total={tour.steps.length}
                    chapterIndex={step.chapterIndex}
                    chapterCount={step.chapterCount}
                    mode={tour.mode}
                    onNext={() => go(1)}
                    onBack={() => go(-1)}
                    onPause={pause}
                />
            )}
        </TourContext.Provider>
    );
};

export default TourProvider;
