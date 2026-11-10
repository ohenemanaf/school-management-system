import { createContext, useContext } from 'react';

export const TourContext = createContext({
    startWorkshop: () => {},
    startPageTour: () => {},
    status: null,
    savedStep: 0,
    totalSteps: 0,
    hasPageTour: false,
});

export const useTour = () => useContext(TourContext);
