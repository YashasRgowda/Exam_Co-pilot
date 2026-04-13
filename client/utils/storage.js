// utils/storage.js
// Wrapper around AsyncStorage
// AsyncStorage = localStorage equivalent for React Native
// We use it to persist the auth token so user stays logged in

import AsyncStorage from '@react-native-async-storage/async-storage';

// Key names for stored values
const KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER_ID: 'user_id',
};

// Save auth token after login
const saveToken = async (token) => {
  await AsyncStorage.setItem(KEYS.ACCESS_TOKEN, token);
};

// Get saved token (used on app launch to check if user is logged in)
const getToken = async () => {
  return await AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
};

// Remove token on logout
const removeToken = async () => {
  await AsyncStorage.removeItem(KEYS.ACCESS_TOKEN);
};

// Save user ID
const saveUserId = async (userId) => {
  await AsyncStorage.setItem(KEYS.USER_ID, userId);
};

// Get saved user ID
const getUserId = async () => {
  return await AsyncStorage.getItem(KEYS.USER_ID);
};

// Clear everything on logout
const clearAll = async () => {
  await AsyncStorage.multiRemove([KEYS.ACCESS_TOKEN, KEYS.USER_ID]);
};

const storage = {
  saveToken,
  getToken,
  removeToken,
  saveUserId,
  getUserId,
  clearAll,
};

export default storage;