import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for consistent error messaging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const customMessage = error.response?.data?.message || error.response?.data?.error || error.message;
    return Promise.reject(new Error(customMessage));
  }
);

export default api;
