import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Global response error handler
api.interceptors.response.use(
    (response) => response,
    (err) => {
        // If the server explicitly returned success: false, surface the message
        const serverMsg = err.response?.data?.message;
        if (serverMsg) {
            err.message = serverMsg;
        }
        return Promise.reject(err);
    }
);

export default api;
