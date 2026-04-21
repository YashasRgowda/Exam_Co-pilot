// services/notificationService.js
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import apiClient from './api';
import API from '../constants/api';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

const notificationService = {

    registerForPushNotifications: async () => {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Notification permission denied');
                return null;
            }

            // Note: For production EAS build, add to app.json:
            // "extra": { "eas": { "projectId": "your-actual-eas-uuid" } }
            // Then pass: projectId: Constants.expoConfig?.extra?.eas?.projectId
            const tokenData = await Notifications.getExpoPushTokenAsync();
            return tokenData.data;

        } catch (error) {
            console.log('Push token error:', error);
            return null;
        }
    },

    registerExamReminders: async (examId) => {
        try {
            const token = await notificationService.registerForPushNotifications();

            if (!token) {
                console.log('No push token — skipping reminder registration');
                return { success: false };
            }

            const response = await apiClient.post(
                API.ENDPOINTS.REGISTER_PUSH_TOKEN,
                { expo_push_token: token, exam_id: examId }
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