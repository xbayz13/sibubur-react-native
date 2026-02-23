import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/env';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor: add auth token from AsyncStorage
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Ignore storage errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Store keys for logout redirect - will be used by navigation
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(callback: () => void) {
  onUnauthorized = callback;
}

// Response interceptor: handle 401 - clear token and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';

    if (
      status === 401 ||
      (status === 404 && url.includes('/auth/profile'))
    ) {
      try {
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      } catch (e) {
        // Ignore
      }
      onUnauthorized?.();
    }
    // Preserve error for caller; network errors are handled via getErrorMessage
    return Promise.reject(error);
  }
);

export { TOKEN_KEY, USER_KEY };
export default apiClient;
