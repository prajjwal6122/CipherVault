/**
 * API Client Configuration
 * Axios instance with interceptors for token refresh and error handling
 */

import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

// Create axios instance
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

/**
 * Request interceptor - add token to headers
 */
apiClient.interceptors.request.use(
  (config) => {
    try {
      const authStorage = localStorage.getItem("auth-storage");
      if (authStorage) {
        const authData = JSON.parse(authStorage);
        // Zustand persist middleware stores data in 'state' property
        const token = authData.state?.token || authData.token;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error("Error reading auth token:", error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * Response interceptor - handle errors and token refresh
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const authData = localStorage.getItem("auth-storage");
        if (!authData) {
          return Promise.reject(error);
        }

        const parsedAuth = JSON.parse(authData);
        const refreshToken =
          parsedAuth.state?.refreshToken || parsedAuth.refreshToken;

        if (!refreshToken) {
          return Promise.reject(error);
        }

        // Try to refresh token
        const response = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {
            refreshToken,
          },
        );

        const { token: newToken } = response.data.data;

        // Update stored token in Zustand format
        const updatedAuth = JSON.parse(localStorage.getItem("auth-storage"));
        if (updatedAuth.state) {
          updatedAuth.state.token = newToken;
        } else {
          updatedAuth.token = newToken;
        }
        localStorage.setItem("auth-storage", JSON.stringify(updatedAuth));

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, logout user
        localStorage.removeItem("auth-storage");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
