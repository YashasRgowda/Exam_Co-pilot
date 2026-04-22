// store/authStore.js
import { create } from 'zustand';
import authService from '../services/authService';
import storage from '../utils/storage';

const useAuthStore = create((set) => ({
  user: null,
  isLoggedIn: false,
  isLoading: true,
  error: null,

  checkAuthStatus: async () => {
    try {
      set({ isLoading: true });
      const loggedIn = await authService.isLoggedIn();
      if (loggedIn) {
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
      await storage.clearAll();
      set({ isLoggedIn: false, isLoading: false });
    }
  },

  // email replaces phone here
  login: async (email, otp) => {
    try {
      set({ isLoading: true, error: null });
      await authService.verifyOTP(email, otp);
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

  logout: async () => {
    await authService.logout();
    set({ user: null, isLoggedIn: false, error: null });
  },

  updateUser: (updatedProfile) => {
    set({ user: updatedProfile });
  },

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

  deleteAvatar: async () => {
    try {
      await authService.deleteAvatar();
      set((state) => ({ user: { ...state.user, avatar_url: null } }));
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;