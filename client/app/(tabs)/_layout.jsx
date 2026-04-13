// app/(tabs)/_layout.jsx
// TAB BAR LAYOUT
// Defines the bottom tab navigation
// Three tabs: Home, Upload, Profile

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                // Hide default header — we build our own in each screen
                headerShown: false,

                // Tab bar styling
                tabBarActiveTintColor: colors.tabActive,
                tabBarInactiveTintColor: colors.tabInactive,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    height: 85,
                    paddingBottom: 25,
                    paddingTop: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '500',
                },
            }}
        >
            {/* HOME TAB — Dashboard with upcoming exams */}
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />

            {/* UPLOAD TAB — Upload admit card */}
            <Tabs.Screen
                name="upload"
                options={{
                    title: 'Upload',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="cloud-upload" size={size} color={color} />
                    ),
                }}
            />

            {/* PROFILE TAB — User profile */}
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}