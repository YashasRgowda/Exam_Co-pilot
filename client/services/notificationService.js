// services/notificationService.js
// Handles Expo push token registration
// Called after admit card is parsed

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import apiClient from './api';
import API from '../constants/api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

const notificationService = {

    // Request permission + get Expo push token
    // Returns token string or null if permission denied
    registerForPushNotifications: async () => {
        try {
            // Check existing permission
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            // Ask if not already granted
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Notification permission denied');
                return null;
            }

            // Get Expo push token
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: 'exampilot',
            });

            return tokenData.data;

        } catch (error) {
            console.log('Push token error:', error);
            return null;
        }
    },

    // Register token + exam_id with backend
    // Backend saves scheduled notification times in DB
    registerExamReminders: async (examId) => {
        try {
            const token = await notificationService.registerForPushNotifications();

            if (!token) {
                console.log('No push token — skipping reminder registration');
                return { success: false };
            }

            const response = await apiClient.post(
                API.ENDPOINTS.REGISTER_PUSH_TOKEN,
                {
                    expo_push_token: token,
                    exam_id: examId,
                }
            );

            console.log('Reminders registered:', response.data);
            return { success: true, data: response.data };

        } catch (error) {
            console.log('Reminder registration error:', error);
            return { success: false };
        }
    },
};

export default notificationService;