import axios from 'axios';

// Resolve consistent API base URL adhering to VITE_API_URL rules
const rawApiUrl = import.meta.env.VITE_API_URL || '';
const baseApiUrl = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`)
  : '/api';

const api = axios.create({
  baseURL: baseApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to attach JWT auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('droplink_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Intercept responses for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
    }
    return Promise.reject(error);
  }
);

export default api;
