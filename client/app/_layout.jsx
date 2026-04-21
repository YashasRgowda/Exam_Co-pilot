// app/_layout.jsx
// ROOT LAYOUT — This is the entry point of the entire app
// Expo Router reads this file first when app launches
// 
// Two jobs:
// 1. Check if user is logged in on app launch
// 2. Redirect to correct screen based on auth status
//    → logged in  : show main app (tabs)
//    → logged out : show auth screens (login)

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import useAuthStore from '../store/authStore';
import { useRouter, useSegments } from 'expo-router';

// This component protects routes
// If user is not logged in and tries to access a protected screen
// → automatically redirects to login
function AuthGuard({ children }) {
    const { isLoggedIn, isLoading, checkAuthStatus } = useAuthStore();
    const segments = useSegments();  // current route segments
    const router = useRouter();

    // On app launch → check if token exists in storage
    useEffect(() => {
        checkAuthStatus();
    }, []);

    // After auth check completes → redirect if needed
    useEffect(() => {
        if (isLoading) return; // wait until check is done

        const inAuthGroup = segments[0] === '(auth)';

        if (!isLoggedIn && !inAuthGroup) {
            // Not logged in but trying to access protected screen → go to login
            router.replace('/(auth)');
        } else if (isLoggedIn && inAuthGroup) {
            // Already logged in but on login screen → go to home
            router.replace('/(tabs)/home');
        }
    }, [isLoggedIn, isLoading, segments]);

    return children;
}

export default function RootLayout() {
    return (
        // SafeAreaProvider ensures content doesn't go under notch or home bar
        <SafeAreaProvider>
            <AuthGuard>
                {/* Stack = screen stack navigator
            Each screen slides in from the right by default */}
                <Stack screenOptions={{ headerShown: false }}>
                    {/* Auth screens group — login, OTP */}
                    <Stack.Screen name="(auth)" />

                    {/* Main app screens group — tabs */}
                    <Stack.Screen name="(tabs)" />

                    {/* Exam detail screen */}
                    <Stack.Screen name="exam/[id]" options={{ headerShown: false }} />

                    {/* Checklist screen */}
                    <Stack.Screen name="exam/checklist/[id]" options={{ headerShown: false }} />

                </Stack>
            </AuthGuard>
            <StatusBar style="light" />
        </SafeAreaProvider>
    );
}