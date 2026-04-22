// app/(auth)/index.jsx
// LOGIN SCREEN — Phone number entry
// First screen user sees when not logged in
// User enters phone number → OTP is sent


import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import authService from '../../services/authService';
import colors from '../../constants/colors';
import typography from '../../constants/typography';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendOTP = async () => {
        if (!email.includes('@') || !email.includes('.')) {
            setError('Please enter a valid email address');
            return;
        }
        try {
            setLoading(true);
            setError('');
            await authService.sendOTP(email.trim().toLowerCase());
            router.push({
                pathname: '/(auth)/verify',
                params: { email: email.trim().toLowerCase() },
            });
        } catch (err) {
            setError('Failed to send OTP. Please check your email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                <View style={styles.header}>
                    <Text style={styles.emoji}>🎯</Text>
                    <Text style={styles.title}>ExamPilot</Text>
                    <Text style={styles.subtitle}>Never miss your exam again</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Enter your email address</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="you@example.com"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={email}
                        onChangeText={(text) => { setEmail(text); setError(''); }}
                    />
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSendOTP}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color={colors.white} />
                            : <Text style={styles.buttonText}>Send OTP</Text>
                        }
                    </TouchableOpacity>
                </View>

                <Text style={styles.footer}>
                    We'll send a 6-digit OTP to your email
                </Text>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: 48 },
    emoji: { fontSize: 56, marginBottom: 12 },
    title: {
        fontSize: typography.xxxl,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: typography.base,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    form: { marginBottom: 24 },
    label: {
        fontSize: typography.sm,
        fontWeight: typography.medium,
        color: colors.textSecondary,
        marginBottom: 10,
    },
    input: {
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: typography.md,
        color: colors.textPrimary,
        marginBottom: 8,
    },
    error: { fontSize: typography.sm, color: colors.error, marginBottom: 8 },
    button: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: { opacity: 0.6 },
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