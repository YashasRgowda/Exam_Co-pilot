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
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendOTP = async () => {
        if (phone.length < 10) {
            setError('Please enter a valid 10 digit phone number');
            return;
        }
        try {
            setLoading(true);
            setError('');
            // Add +91 country code for India (E.164 format required by Supabase)
            const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
            await authService.sendOTP(formattedPhone);
            router.push({
                pathname: '/(auth)/verify',
                params: { phone: formattedPhone },
            });
        } catch (err) {
            setError('Failed to send OTP. Please check your number.');
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
                    <Text style={styles.label}>Enter your phone number</Text>
                    <View style={styles.inputRow}>
                        <View style={styles.prefix}>
                            <Text style={styles.prefixText}>+91</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="9999999999"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={phone}
                            onChangeText={(text) => { setPhone(text); setError(''); }}
                        />
                    </View>
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
                    We'll send a 6-digit OTP to verify your number
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
    title: { fontSize: typography.xxxl, fontWeight: typography.bold, color: colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: typography.base, color: colors.textSecondary, textAlign: 'center' },
    form: { marginBottom: 24 },
    label: { fontSize: typography.sm, fontWeight: typography.medium, color: colors.textSecondary, marginBottom: 10 },
    inputRow: {
        flexDirection: 'row', borderWidth: 1.5, borderColor: colors.border,
        borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface, marginBottom: 8,
    },
    prefix: {
        backgroundColor: colors.primaryGlow, paddingHorizontal: 14,
        justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.border,
    },
    prefixText: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.primary },
    input: { flex: 1, paddingHorizontal: 14, paddingVertical: 16, fontSize: typography.md, color: colors.textPrimary },
    error: { fontSize: typography.sm, color: colors.error || '#C41E3A', marginBottom: 8 },
    button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { fontSize: typography.md, fontWeight: typography.bold, color: colors.white },
    footer: { fontSize: typography.sm, color: colors.textMuted, textAlign: 'center' },
});