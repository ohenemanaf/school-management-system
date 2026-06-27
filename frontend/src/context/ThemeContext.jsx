import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const { user } = useAuth();
    
    // Fallbacks if user not logged in or no preferences set
    const defaultTheme = {
        themeOption: 'light',
        themeDirection: 'ltr',
        themeColor: 'blue',
        containerOption: 'boxed',
        sidebarType: 'full',
    };

    const preferences = user?.preferences || defaultTheme;

    useEffect(() => {
        const root = document.documentElement;

        // Apply theme color
        root.setAttribute('data-theme', preferences.themeColor || 'blue');

        // Apply dark mode
        if (preferences.themeOption === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Apply RTL/LTR
        root.setAttribute('dir', preferences.themeDirection || 'ltr');

    }, [preferences.themeColor, preferences.themeOption, preferences.themeDirection]);

    return (
        <ThemeContext.Provider value={{ preferences }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
