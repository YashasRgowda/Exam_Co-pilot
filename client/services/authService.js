// services/authService.js
// All authentication related API calls
// Talks to /api/v1/auth/* endpoints

// services/authService.js
import apiClient from './api';
import API from '../constants/api';
import storage from '../utils/storage';

const authService = {

  // Step 1 — sends OTP to email (free via Supabase)
  sendOTP: async (email) => {
    const response = await apiClient.post(API.ENDPOINTS.SEND_OTP, { email });
    return response.data;
  },

  // Step 2 — verifies OTP and saves token
  verifyOTP: async (email, token) => {
    const response = await apiClient.post(API.ENDPOINTS.VERIFY_OTP, {
      email,
      token,
    });
    const { access_token, user_id } = response.data;
    await storage.saveToken(access_token);
    await storage.saveUserId(user_id);
    return response.data;
  },

  // Get logged in user's profile
  getProfile: async () => {
    const response = await apiClient.get(API.ENDPOINTS.GET_PROFILE);
    return response.data;
  },

  // Update user's full name
  updateProfile: async (fullName) => {
    const response = await apiClient.patch(API.ENDPOINTS.UPDATE_PROFILE, {
      full_name: fullName,
    });
    return response.data;
  },

  // Logout
  logout: async () => {
    await storage.clearAll();
  },

  // Check if user is already logged in
  isLoggedIn: async () => {
    const token = await storage.getToken();
    return !!token;
  },

  // Upload profile picture
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name || 'avatar.jpg',
      type: file.mimeType || 'image/jpeg',
    });
    const response = await apiClient.post(
      API.ENDPOINTS.UPLOAD_AVATAR,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  // Delete profile picture
  deleteAvatar: async () => {
    const response = await apiClient.delete(API.ENDPOINTS.DELETE_AVATAR);
    return response.data;
  },
};

export default authService;