import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Uploaded files share the API origin, including when hosted behind HTTPS.
export const fileUrl = (value) => {
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    const origin = new URL(api.defaults.baseURL, window.location.origin).origin;
    return new URL(value.startsWith('/') ? value : `/${value}`, origin).href;
};

export default api;
