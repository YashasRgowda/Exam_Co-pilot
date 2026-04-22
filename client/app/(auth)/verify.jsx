// app/(auth)/verify.jsx
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuthStore from '../../store/authStore';
import colors from '../../constants/colors';
import typography from '../../constants/typography';

export default function VerifyScreen() {
    const router = useRouter();
    const { email } = useLocalSearchParams();
    const { login, isLoading, error, clearError } = useAuthStore();
    const [otp, setOtp] = useState('');

    const handleVerify = async () => {
        if (otp.length !== 6) return;
        const result = await login(email, otp);
        if (result.success) {
            router.replace('/(tabs)/home');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.emoji}>📧</Text>
                    <Text style={styles.title}>Check your email</Text>
                    <Text style={styles.subtitle}>
                        We sent a 6-digit OTP to{'\n'}
                        <Text style={styles.email}>{email}</Text>
                    </Text>
                </View>

                <View style={styles.form}>
                    <TextInput
                        style={styles.otpInput}
                        placeholder="000000"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={6}
                        value={otp}
                        onChangeText={(text) => { setOtp(text); clearError(); }}
                        textAlign="center"
                    />
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <TouchableOpacity
                        style={[
                            styles.button,
                            (isLoading || otp.length !== 6) && styles.buttonDisabled,
                        ]}
                        onPress={handleVerify}
                        disabled={isLoading || otp.length !== 6}
                    >
                        {isLoading
                            ? <ActivityIndicator color={colors.white} />
                            : <Text style={styles.buttonText}>Verify & Login</Text>
                        }
                    </TouchableOpacity>
                </View>

                <Text style={styles.footer}>
                    Didn't receive it? Check your spam folder
                </Text>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
    backButton: { position: 'absolute', top: 20, left: 24 },
    backText: {
        fontSize: typography.base,
        color: colors.primary,
        fontWeight: typography.medium,
    },
    header: { alignItems: 'center', marginBottom: 40 },
    emoji: { fontSize: 56, marginBottom: 12 },
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
    email: { fontWeight: typography.bold, color: colors.primary },
    form: { marginBottom: 24 },
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
    buttonDisabled: { opacity: 0.5 },
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