/**
 * useAuth Hook
 * Provides authentication state and methods globally
 * Manages JWT tokens and user info
 */

import React from "react";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

/**
 * Zustand store for authentication state
 */
const useAuthStore = create(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        /**
         * Login with email and password
         */
        login: async (email, password) => {
          set({ isLoading: true, error: null });
          try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
              email,
              password,
            });

            const { token, refreshToken, user } = response.data.data;

            set({
              user,
              token,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            // Set axios default header for future requests
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

            return { success: true, user };
          } catch (error) {
            const errorMessage =
              error.response?.data?.message || "Login failed";
            set({
              isLoading: false,
              error: errorMessage,
              isAuthenticated: false,
            });
            throw new Error(errorMessage);
          }
        },

        /**
         * Register new user
         */
        register: async (email, password, name) => {
          set({ isLoading: true, error: null });
          try {
            const response = await axios.post(`${API_BASE_URL}/auth/register`, {
              email,
              password,
              name,
            });

            const { token, refreshToken, user } = response.data.data;

            set({
              user,
              token,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

            return { success: true, user };
          } catch (error) {
            const errorMessage =
              error.response?.data?.message || "Registration failed";
            set({
              isLoading: false,
              error: errorMessage,
            });
            throw new Error(errorMessage);
          }
        },

        /**
         * Refresh access token using refresh token
         */
        refreshAccessToken: async () => {
          const { refreshToken } = get();
          if (!refreshToken) {
            set({ isAuthenticated: false });
            return false;
          }

          try {
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            const { token } = response.data.data;

            set({ token });
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

            return true;
          } catch (error) {
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              refreshToken: null,
            });
            return false;
          }
        },

        /**
         * Logout and clear auth state
         */
        logout: async () => {
          set({ isLoading: true });
          try {
            await axios.post(`${API_BASE_URL}/auth/logout`);
          } catch (error) {
            // Proceed with logout even if API call fails
            console.error("Logout API error:", error);
          }

          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });

          delete axios.defaults.headers.common["Authorization"];
        },

        /**
         * Get current user profile
         */
        getProfile: async () => {
          try {
            const response = await axios.get(`${API_BASE_URL}/auth/me`);
            const { user } = response.data.data;
            set({ user });
            return user;
          } catch (error) {
            const errorMessage =
              error.response?.data?.message || "Failed to fetch profile";
            set({ error: errorMessage });
            throw new Error(errorMessage);
          }
        },

        /**
         * Clear error message
         */
        clearError: () => set({ error: null }),
      }),
      {
        name: "auth-storage",
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
        }),
      },
    ),
  ),
);

/**
 * Custom hook to use auth store
 */
export const useAuth = () => {
  const store = useAuthStore();

  // Initialize axios with token if available (runs on every render but only sets if token exists)
  React.useEffect(() => {
    if (store.token && store.isAuthenticated) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${store.token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [store.token, store.isAuthenticated]);

  return store;
};

export default useAuth;
