// app/(auth)/verify.jsx
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';

export default function VerifyScreen() {
    const router = useRouter();
    const { email } = useLocalSearchParams();
    const { login, isLoading, error, clearError } = useAuthStore();
    const [otp, setOtp] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        // Auto focus input
        setTimeout(() => inputRef.current?.focus(), 400);
    }, []);

    const handleVerify = async () => {
        if (otp.length !== 6) return;
        const result = await login(email, otp);
        if (result.success) {
            router.replace('/(tabs)/home');
        }
    };

    const handleOtpChange = (text) => {
        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
        setOtp(cleaned);
        clearError();
        // Auto submit when 6 digits entered
        if (cleaned.length === 6) {
            setTimeout(() => handleVerifyWithOtp(cleaned), 100);
        }
    };

    const handleVerifyWithOtp = async (code) => {
        const result = await login(email, code);
        if (result.success) {
            router.replace('/(tabs)/home');
        }
    };

    // Mask email for display
    const maskedEmail = email
        ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 4)) + c)
        : '';

    // Render individual OTP boxes
    const renderOtpBoxes = () => {
        return Array.from({ length: 6 }).map((_, i) => {
            const char = otp[i] || '';
            const isCurrent = otp.length === i;
            const isFilled = otp.length > i;

            return (
                <TouchableOpacity
                    key={i}
                    style={[
                        styles.otpBox,
                        isCurrent && styles.otpBoxActive,
                        isFilled && styles.otpBoxFilled,
                        error && styles.otpBoxError,
                    ]}
                    onPress={() => inputRef.current?.focus()}
                    activeOpacity={1}
                >
                    <Text style={[
                        styles.otpChar,
                        isFilled && styles.otpCharFilled,
                    ]}>
                        {char || (isCurrent ? '|' : '')}
                    </Text>
                </TouchableOpacity>
            );
        });
    };

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#06060E" />
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    {/* Background glow */}
                    <View style={styles.glow} />

                    {/* Hidden real input */}
                    <TextInput
                        ref={inputRef}
                        style={styles.hiddenInput}
                        value={otp}
                        onChangeText={handleOtpChange}
                        keyboardType="number-pad"
                        maxLength={6}
                        caretHidden
                    />

                    <View style={styles.inner}>

                        {/* ── BACK ── */}
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                            <View style={styles.backIconBox}>
                                <Ionicons name="arrow-back" size={16} color="#E0E0EC" />
                            </View>
                        </TouchableOpacity>

                        {/* ── HEADER ── */}
                        <View style={styles.header}>
                            <View style={styles.emailIconWrap}>
                                <View style={styles.emailIconBox}>
                                    <Ionicons name="mail" size={28} color="#C41E3A" />
                                </View>
                                <View style={styles.emailIconBadge}>
                                    <Text style={styles.emailIconBadgeText}>6</Text>
                                </View>
                            </View>

                            <Text style={styles.title}>Check your inbox</Text>
                            <Text style={styles.subtitle}>
                                We sent a 6-digit code to
                            </Text>
                            <View style={styles.emailPill}>
                                <Ionicons name="mail-outline" size={12} color="#C41E3A" />
                                <Text style={styles.emailText}>{maskedEmail}</Text>
                            </View>
                        </View>

                        {/* ── OTP BOXES ── */}
                        <View style={styles.otpSection}>
                            <TouchableOpacity
                                style={styles.otpRow}
                                onPress={() => inputRef.current?.focus()}
                                activeOpacity={1}
                            >
                                {renderOtpBoxes()}
                            </TouchableOpacity>

                            {/* Error */}
                            {error && (
                                <View style={styles.errorRow}>
                                    <Ionicons name="alert-circle-outline" size={13} color="#C41E3A" />
                                    <Text style={styles.errorText}>Invalid code. Please try again.</Text>
                                </View>
                            )}

                            {/* Progress indicator */}
                            {otp.length > 0 && otp.length < 6 && !error && (
                                <Text style={styles.progressText}>
                                    {6 - otp.length} digit{6 - otp.length !== 1 ? 's' : ''} remaining
                                </Text>
                            )}
                        </View>

                        {/* ── CTA ── */}
                        <View style={styles.ctaSection}>
                            <TouchableOpacity
                                style={[
                                    styles.ctaBtn,
                                    (isLoading || otp.length !== 6) && styles.ctaBtnDisabled,
                                ]}
                                onPress={handleVerify}
                                disabled={isLoading || otp.length !== 6}
                                activeOpacity={0.88}
                            >
                                {isLoading ? (
                                    <View style={styles.ctaBtnInner}>
                                        <ActivityIndicator color="#fff" size="small" />
                                        <Text style={styles.ctaBtnText}>Verifying...</Text>
                                    </View>
                                ) : (
                                    <View style={styles.ctaBtnInner}>
                                        <Text style={styles.ctaBtnText}>Verify & Login</Text>
                                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Resend / spam note */}
                            <View style={styles.helpRow}>
                                <Ionicons name="information-circle-outline" size={13} color="#252538" />
                                <Text style={styles.helpText}>
                                    Didn't receive it? Check spam or{' '}
                                    <Text
                                        style={styles.resendText}
                                        onPress={() => router.back()}
                                    >
                                        try again
                                    </Text>
                                </Text>
                            </View>
                        </View>

                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#06060E',
    },
    keyboardView: { flex: 1 },
    hiddenInput: {
        position: 'absolute',
        opacity: 0,
        width: 1,
        height: 1,
    },

    // Glow
    glow: {
        position: 'absolute',
        top: -100,
        right: -60,
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: 'rgba(196,30,58,0.05)',
    },

    inner: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 16,
        justifyContent: 'center',
        gap: 36,
    },

    // Back
    backBtn: { position: 'absolute', top: 16, left: 28 },
    backIconBox: {
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: '#0B0B17',
        borderWidth: 1,
        borderColor: '#1A1A2E',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Header
    header: {
        alignItems: 'center',
        gap: 10,
        marginTop: 40,
    },
    emailIconWrap: {
        position: 'relative',
        marginBottom: 4,
    },
    emailIconBox: {
        width: 72,
        height: 72,
        borderRadius: 22,
        backgroundColor: '#0B0B17',
        borderWidth: 1,
        borderColor: '#1A1A2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emailIconBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#C41E3A',
        borderWidth: 2.5,
        borderColor: '#06060E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emailIconBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#fff',
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#F0F0F8',
        letterSpacing: -0.6,
    },
    subtitle: {
        fontSize: 14,
        color: '#38384A',
        fontWeight: '500',
    },
    emailPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(196,30,58,0.08)',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: 'rgba(196,30,58,0.15)',
    },
    emailText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#C41E3A',
    },

    // OTP
    otpSection: {
        gap: 12,
        alignItems: 'center',
    },
    otpRow: {
        flexDirection: 'row',
        gap: 10,
    },
    otpBox: {
        width: 46,
        height: 56,
        borderRadius: 14,
        backgroundColor: '#0B0B17',
        borderWidth: 1.5,
        borderColor: '#141428',
        justifyContent: 'center',
        alignItems: 'center',
    },
    otpBoxActive: {
        borderColor: '#C41E3A',
        backgroundColor: '#0E0B0C',
    },
    otpBoxFilled: {
        borderColor: '#252538',
        backgroundColor: '#0F0F1E',
    },
    otpBoxError: {
        borderColor: 'rgba(196,30,58,0.5)',
        backgroundColor: 'rgba(196,30,58,0.05)',
    },
    otpChar: {
        fontSize: 22,
        fontWeight: '700',
        color: '#C41E3A',
        letterSpacing: 0,
    },
    otpCharFilled: {
        color: '#F0F0F8',
    },
    errorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    errorText: {
        fontSize: 12,
        color: '#C41E3A',
        fontWeight: '500',
    },
    progressText: {
        fontSize: 11,
        color: '#252538',
        fontWeight: '500',
    },

    // CTA
    ctaSection: { gap: 14 },
    ctaBtn: {
        backgroundColor: '#C41E3A',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    ctaBtnDisabled: { opacity: 0.35 },
    ctaBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ctaBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.1,
    },
    helpRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    helpText: {
        fontSize: 12,
        color: '#252538',
        fontWeight: '500',
    },
    resendText: {
        color: '#C41E3A',
        fontWeight: '600',
    },
});