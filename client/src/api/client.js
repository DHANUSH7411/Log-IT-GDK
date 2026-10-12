import axios from 'axios';

// In production, VITE_API_URL points to the backend (e.g. https://log-it-gdk.onrender.com/api)
// In local development, it defaults to '/api' which is proxied to http://localhost:5001 by Vite
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper to safely extract a readable string error message
function extractErrorMessage(error) {
  const data = error.response?.data;
  if (data) {
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
    if (data.error && typeof data.error.message === 'string') return data.error.message;
    if (typeof data === 'string') return data;
  }
  if (error.message) {
    if (error.message === 'Network Error') {
      return 'Network Error: Unable to reach the backend server. Please verify your connection or CORS settings.';
    }
    return error.message;
  }
  return 'An unexpected error occurred';
}

// Response interceptor for consistent readable error messaging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const readableMessage = extractErrorMessage(error);
    return Promise.reject(new Error(readableMessage));
  }
);

export default api;
