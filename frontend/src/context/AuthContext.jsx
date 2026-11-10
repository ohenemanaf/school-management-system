import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const response = await api.get('/users/profile');
                    setUser(response.data.user);
                } catch (error) {
                    console.error('Auth check failed', error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const loadProfile = async () => {
        const response = await api.get('/users/profile');
        setUser(response.data.user);
        return response.data.user;
    };

    const refreshUser = async () => {
        try {
            return await loadProfile();
        } catch (error) {
            console.error('Failed to refresh user', error);
        }
    };

    const login = async (email, password) => {
        const response = await api.post('/users/login', { email, password });
        localStorage.setItem('token', response.data.token);
        return loadProfile();
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    // Apply global preferences
    useEffect(() => {
        if (user?.preferences) {
            const root = document.documentElement;
            // Dark mode
            if (user.preferences.themeOption === 'dark') {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
            
            // RTL direction
            if (user.preferences.themeDirection === 'rtl') {
                root.setAttribute('dir', 'rtl');
            } else {
                root.setAttribute('dir', 'ltr');
            }
        }
    }, [user?.preferences]);

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};
