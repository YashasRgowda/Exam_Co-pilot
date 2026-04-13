// services/api.js
// Axios instance — the single HTTP client for the entire app
// Every API call goes through this file
// It automatically attaches the auth token to every request

import axios from 'axios';
import API from '../constants/api';
import storage from '../utils/storage';

// Create axios instance with base URL pointing to our FastAPI backend
const apiClient = axios.create({
  baseURL: API.BASE_URL,
  timeout: 30000, // 30 seconds — important for AI parsing which takes time
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------
// REQUEST INTERCEPTOR
// Runs before every API call
// Automatically reads token from storage and attaches it
// So we never have to manually pass token in each service file
// ---------------------------------------------------------------
apiClient.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------
// RESPONSE INTERCEPTOR
// Runs after every API response
// If backend returns 401 (token expired) → clear storage
// This handles session expiry automatically
// ---------------------------------------------------------------
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid → clear everything
      await storage.clearAll();
    }
    return Promise.reject(error);
  }
);

export default apiClient;