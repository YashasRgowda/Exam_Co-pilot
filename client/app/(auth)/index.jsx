// app/(auth)/index.jsx
// LOGIN SCREEN — Phone number entry
// First screen user sees when not logged in
// User enters phone number → OTP is sent


// app/(auth)/index.jsx
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
    Dimensions,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import authService from '../../services/authService';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [focused, setFocused] = useState(false);

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

    const isValid = email.includes('@') && email.includes('.');

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#06060E" />
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    {/* ── BACKGROUND GLOW ── */}
                    <View style={styles.glowTop} />
                    <View style={styles.glowBottom} />

                    <View style={styles.inner}>

                        {/* ── BRAND SECTION ── */}
                        <View style={styles.brandSection}>
                            {/* Logo mark */}
                            <View style={styles.logoWrap}>
                                <View style={styles.logoOuter}>
                                    <View style={styles.logoInner}>
                                        <Text style={styles.logoIcon}>🎯</Text>
                                    </View>
                                </View>
                                {/* Decorative ring */}
                                <View style={styles.logoRing} />
                            </View>

                            <Text style={styles.brandName}>ExamPilot</Text>
                            <Text style={styles.tagline}>Never miss your exam again</Text>

                            {/* Feature pills */}
                            <View style={styles.pillRow}>
                                {['AI Parsing', 'Navigation', 'Reminders'].map((pill) => (
                                    <View key={pill} style={styles.pill}>
                                        <Text style={styles.pillText}>{pill}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* ── FORM SECTION ── */}
                        <View style={styles.formSection}>
                            <Text style={styles.formTitle}>Get started</Text>
                            <Text style={styles.formSubtitle}>
                                Enter your email to receive a login code
                            </Text>

                            {/* Email input */}
                            <View style={[
                                styles.inputWrap,
                                focused && styles.inputWrapFocused,
                                error && styles.inputWrapError,
                            ]}>
                                <View style={styles.inputIconBox}>
                                    <Ionicons
                                        name="mail-outline"
                                        size={16}
                                        color={focused ? '#C41E3A' : '#38384A'}
                                    />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="you@gmail.com"
                                    placeholderTextColor="#252538"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    value={email}
                                    onChangeText={(text) => { setEmail(text); setError(''); }}
                                    onFocus={() => setFocused(true)}
                                    onBlur={() => setFocused(false)}
                                    returnKeyType="done"
                                    onSubmitEditing={handleSendOTP}
                                />
                                {isValid && (
                                    <View style={styles.validDot} />
                                )}
                            </View>

                            {/* Error */}
                            {error ? (
                                <View style={styles.errorRow}>
                                    <Ionicons name="alert-circle-outline" size={13} color="#C41E3A" />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : null}

                            {/* CTA Button */}
                            <TouchableOpacity
                                style={[
                                    styles.ctaBtn,
                                    (!isValid || loading) && styles.ctaBtnDisabled,
                                ]}
                                onPress={handleSendOTP}
                                disabled={!isValid || loading}
                                activeOpacity={0.88}
                            >
                                {loading ? (
                                    <View style={styles.ctaBtnInner}>
                                        <ActivityIndicator color="#fff" size="small" />
                                        <Text style={styles.ctaBtnText}>Sending...</Text>
                                    </View>
                                ) : (
                                    <View style={styles.ctaBtnInner}>
                                        <Text style={styles.ctaBtnText}>Send OTP</Text>
                                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Footer note */}
                            <View style={styles.footerNote}>
                                <Ionicons name="shield-checkmark-outline" size={12} color="#252538" />
                                <Text style={styles.footerText}>
                                    We'll email you a 6-digit code. No password needed.
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
    keyboardView: {
        flex: 1,
    },

    // ── BACKGROUND GLOWS ──
    glowTop: {
        position: 'absolute',
        top: -80,
        left: -60,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(196,30,58,0.06)',
    },
    glowBottom: {
        position: 'absolute',
        bottom: -60,
        right: -40,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(196,30,58,0.04)',
    },

    inner: {
        flex: 1,
        paddingHorizontal: 28,
        justifyContent: 'center',
        gap: 44,
    },

    // ── BRAND ──
    brandSection: {
        alignItems: 'center',
        gap: 12,
    },
    logoWrap: {
        position: 'relative',
        width: 88,
        height: 88,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    logoOuter: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: '#0B0B17',
        borderWidth: 1,
        borderColor: '#1A1A2E',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoInner: {
        width: 64,
        height: 64,
        borderRadius: 18,
        backgroundColor: 'rgba(196,30,58,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(196,30,58,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoIcon: {
        fontSize: 32,
    },
    logoRing: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#C41E3A',
        borderWidth: 3,
        borderColor: '#06060E',
    },
    brandName: {
        fontSize: 36,
        fontWeight: '800',
        color: '#F0F0F8',
        letterSpacing: -1.2,
    },
    tagline: {
        fontSize: 14,
        color: '#38384A',
        fontWeight: '500',
        letterSpacing: 0.2,
    },
    pillRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    pill: {
        backgroundColor: '#0B0B17',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: '#141428',
    },
    pillText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#38384A',
        letterSpacing: 0.3,
    },

    // ── FORM ──
    formSection: {
        gap: 12,
    },
    formTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#F0F0F8',
        letterSpacing: -0.5,
    },
    formSubtitle: {
        fontSize: 13,
        color: '#38384A',
        fontWeight: '500',
        lineHeight: 19,
        marginBottom: 4,
    },

    // Input
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0B0B17',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#141428',
        overflow: 'hidden',
    },
    inputWrapFocused: {
        borderColor: '#C41E3A',
        backgroundColor: '#0E0B0C',
    },
    inputWrapError: {
        borderColor: 'rgba(196,30,58,0.5)',
    },
    inputIconBox: {
        paddingLeft: 16,
        paddingRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        paddingRight: 16,
        fontSize: 15,
        color: '#F0F0F8',
        fontWeight: '500',
    },
    validDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#00E676',
        marginRight: 16,
    },

    // Error
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

    // CTA
    ctaBtn: {
        backgroundColor: '#C41E3A',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 4,
    },
    ctaBtnDisabled: {
        opacity: 0.4,
    },
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

    // Footer
    footerNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 4,
    },
    footerText: {
        fontSize: 11,
        color: '#252538',
        fontWeight: '500',
        flex: 1,
        lineHeight: 16,
    },
});