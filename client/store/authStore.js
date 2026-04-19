// store/authStore.js
// Global auth state using Zustand
// Zustand is like a global variable that any component can read or update
// Think of it like React useState but shared across ALL screens
// No prop drilling needed — any screen can access user info directly

import { create } from 'zustand';
import authService from '../services/authService';
import storage from '../utils/storage';

const useAuthStore = create((set) => ({
  // ---------------------------------------------------------------
  // STATE
  // These are the global variables any screen can read
  // ---------------------------------------------------------------
  user: null,           // logged in user's profile data
  isLoggedIn: false,    // is user authenticated?
  isLoading: true,      // true while checking token on app launch
  error: null,          // any auth error message

  // ---------------------------------------------------------------
  // ACTIONS
  // These are functions any screen can call to update state
  // ---------------------------------------------------------------

  // Called on app launch to check if user has a saved token
  // If token exists → user is already logged in → skip login screen
  checkAuthStatus: async () => {
    try {
      set({ isLoading: true });
      const loggedIn = await authService.isLoggedIn();

      if (loggedIn) {
        // Token exists → fetch fresh profile from backend
        const profileResponse = await authService.getProfile();
        set({
          isLoggedIn: true,
          user: profileResponse.profile,
          isLoading: false,
        });
      } else {
        set({ isLoggedIn: false, isLoading: false });
      }
    } catch (error) {
      // Token might be expired → clear it and send to login
      await storage.clearAll();
      set({ isLoggedIn: false, isLoading: false });
    }
  },

  // Called after OTP is verified successfully
  // Saves user profile to global state
  login: async (phone, otp) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authService.verifyOTP(phone, otp);

      // After login, fetch full profile
      const profileResponse = await authService.getProfile();
      set({
        isLoggedIn: true,
        user: profileResponse.profile,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.detail || 'Invalid OTP. Please try again.';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Called when user taps logout
  // Clears token from storage and resets state
  logout: async () => {
    await authService.logout();
    set({ user: null, isLoggedIn: false, error: null });
  },

  // Update profile in global state after editing name
  updateUser: (updatedProfile) => {
    set({ user: updatedProfile });
  },

  // Upload avatar
  uploadAvatar: async (file) => {
    try {
      const response = await authService.uploadAvatar(file);
      set((state) => ({
        user: { ...state.user, avatar_url: response.avatar_url },
      }));
      return { success: true, avatar_url: response.avatar_url };
    } catch (error) {
      return { success: false, error: 'Failed to upload avatar.' };
    }
  },

  // Delete avatar
  deleteAvatar: async () => {
    try {
      await authService.deleteAvatar();
      set((state) => ({
        user: { ...state.user, avatar_url: null },
      }));
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  // Clear any error messages
  clearError: () => set({ error: null }),
}));

export default useAuthStore;