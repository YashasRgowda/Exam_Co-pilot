// app/(auth)/verify.jsx
// OTP VERIFICATION SCREEN
// User enters 6 digit OTP received on phone
// On success → navigates to home screen

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuthStore from '../../store/authStore';
import colors from '../../constants/colors';
import typography from '../../constants/typography';

export default function VerifyScreen() {
    const router = useRouter();

    // Get phone number passed from login screen
    const { phone } = useLocalSearchParams();

    // Get login action from global auth store
    const { login, isLoading, error, clearError } = useAuthStore();

    const [otp, setOtp] = useState('');

    const handleVerify = async () => {
        if (otp.length !== 6) {
            return;
        }

        // Call login action in store
        // It calls verifyOTP → saves token → fetches profile → updates state
        const result = await login(phone, otp);

        if (result.success) {
            // Auth guard in _layout.jsx will auto redirect to home
            // But we also push manually for reliability
            router.replace('/(tabs)/home');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                {/* Back button */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.emoji}>📱</Text>
                    <Text style={styles.title}>Verify OTP</Text>
                    <Text style={styles.subtitle}>
                        Enter the 6-digit OTP sent to{'\n'}
                        <Text style={styles.phone}>{phone}</Text>
                    </Text>
                </View>

                {/* OTP Input */}
                <View style={styles.form}>
                    <TextInput
                        style={styles.otpInput}
                        placeholder="000000"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={6}
                        value={otp}
                        onChangeText={(text) => {
                            setOtp(text);
                            clearError();
                        }}
                        textAlign="center"
                    />

                    {/* Error from store */}
                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    {/* Verify button */}
                    <TouchableOpacity
                        style={[
                            styles.button,
                            (isLoading || otp.length !== 6) && styles.buttonDisabled,
                        ]}
                        onPress={handleVerify}
                        disabled={isLoading || otp.length !== 6}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <Text style={styles.buttonText}>Verify & Login</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.footer}>
                    For testing use OTP: 123456
                </Text>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    inner: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 24,
    },
    backText: {
        fontSize: typography.base,
        color: colors.primary,
        fontWeight: typography.medium,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    emoji: {
        fontSize: 56,
        marginBottom: 12,
    },
    title: {
        fontSize: typography.xxl,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: typography.base,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    phone: {
        fontWeight: typography.bold,
        color: colors.primary,
    },
    form: {
        marginBottom: 24,
    },
    otpInput: {
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: colors.surface,
        paddingVertical: 18,
        fontSize: typography.xxl,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        letterSpacing: 8,
        marginBottom: 8,
    },
    error: {
        fontSize: typography.sm,
        color: colors.error,
        textAlign: 'center',
        marginBottom: 8,
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: typography.md,
        fontWeight: typography.bold,
        color: colors.white,
    },
    footer: {
        fontSize: typography.sm,
        color: colors.textMuted,
        textAlign: 'center',
    },
});