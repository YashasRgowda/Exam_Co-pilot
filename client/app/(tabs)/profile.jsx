import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import colors from '../../constants/colors';
import typography from '../../constants/typography';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout } = useAuthStore();

    const firstName = user?.full_name?.split(' ')[0] || 'Student';
    const phone = user?.phone ? `+91 ${user.phone}` : '—';
    const isPremium = user?.is_premium || false;

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/(auth)');
                    },
                },
            ]
        );
    };

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* ── HEADER ── */}
                    <View style={styles.header}>
                        <Text style={styles.headerSmall}>My</Text>
                        <Text style={styles.headerBig}>Profile</Text>
                    </View>

                    {/* ── AVATAR + NAME ── */}
                    <View style={styles.avatarCard}>
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarLetter}>
                                {firstName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.avatarInfo}>
                            <Text style={styles.avatarName}>
                                {user?.full_name || 'Student'}
                            </Text>
                            <Text style={styles.avatarPhone}>{phone}</Text>
                        </View>
                        {isPremium && (
                            <View style={styles.premiumBadge}>
                                <Text style={styles.premiumText}>PRO</Text>
                            </View>
                        )}
                    </View>

                    {/* ── ACCOUNT INFO ── */}
                    <Text style={styles.sectionLabel}>ACCOUNT</Text>
                    <View style={styles.menuCard}>

                        <View style={styles.menuRow}>
                            <View style={[styles.menuIcon, { backgroundColor: colors.primaryGlow }]}>
                                <Ionicons name="call-outline" size={16} color={colors.primary} />
                            </View>
                            <View style={styles.menuInfo}>
                                <Text style={styles.menuLabel}>Phone Number</Text>
                                <Text style={styles.menuValue}>{phone}</Text>
                            </View>
                        </View>

                        <View style={styles.menuDivider} />

                        <View style={styles.menuRow}>
                            <View style={[styles.menuIcon, { backgroundColor: colors.neonGreenDim }]}>
                                <Ionicons name="shield-checkmark-outline" size={16} color={colors.neonGreen} />
                            </View>
                            <View style={styles.menuInfo}>
                                <Text style={styles.menuLabel}>Plan</Text>
                                <Text style={styles.menuValue}>
                                    {isPremium ? 'Premium' : 'Free — 3 parses/day'}
                                </Text>
                            </View>
                        </View>

                    </View>

                    {/* ── APP INFO ── */}
                    <Text style={styles.sectionLabel}>APP</Text>
                    <View style={styles.menuCard}>

                        <TouchableOpacity style={styles.menuRow} activeOpacity={0.85}>
                            <View style={[styles.menuIcon, { backgroundColor: colors.neonBlueDim }]}>
                                <Ionicons name="information-circle-outline" size={16} color={colors.neonBlue} />
                            </View>
                            <View style={styles.menuInfo}>
                                <Text style={styles.menuLabel}>Version</Text>
                                <Text style={styles.menuValue}>1.0.0</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                        </TouchableOpacity>

                        <View style={styles.menuDivider} />

                        <TouchableOpacity style={styles.menuRow} activeOpacity={0.85}>
                            <View style={[styles.menuIcon, { backgroundColor: colors.neonAmberDim }]}>
                                <Ionicons name="star-outline" size={16} color={colors.neonAmber} />
                            </View>
                            <View style={styles.menuInfo}>
                                <Text style={styles.menuLabel}>Rate ExamPilot</Text>
                                <Text style={styles.menuValue}>Leave a review</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                        </TouchableOpacity>

                        <View style={styles.menuDivider} />

                        <TouchableOpacity style={styles.menuRow} activeOpacity={0.85}>
                            <View style={[styles.menuIcon, { backgroundColor: colors.surfaceHighlight }]}>
                                <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
                            </View>
                            <View style={styles.menuInfo}>
                                <Text style={styles.menuLabel}>Send Feedback</Text>
                                <Text style={styles.menuValue}>Help us improve</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                        </TouchableOpacity>

                    </View>

                    {/* ── UPGRADE BANNER (free users only) ── */}
                    {!isPremium && (
                        <>
                            <Text style={styles.sectionLabel}>UPGRADE</Text>
                            <View style={styles.upgradeCard}>
                                <View style={styles.upgradeLeft}>
                                    <Text style={styles.upgradeTitle}>Go Premium</Text>
                                    <Text style={styles.upgradeSub}>
                                        20 parses/day · Priority support · No limits
                                    </Text>
                                </View>
                                <TouchableOpacity style={styles.upgradeBtn} activeOpacity={0.85}>
                                    <Text style={styles.upgradeBtnText}>Upgrade</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {/* ── LOGOUT ── */}
                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={handleLogout}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="log-out-outline" size={18} color={colors.primary} />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>

                    {/* Footer */}
                    <Text style={styles.footer}>ExamPilot · Never miss your exam again</Text>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 24,
    },
    headerSmall: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        fontWeight: typography.medium,
    },
    headerBig: {
        fontSize: typography.xxl,
        fontWeight: typography.black,
        color: colors.textPrimary,
        letterSpacing: -0.8,
        marginTop: 2,
    },

    // Avatar card
    avatarCard: {
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 18,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        marginBottom: 24,
    },
    avatarCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.primaryDim,
        borderWidth: 2,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarLetter: {
        fontSize: typography.xl,
        fontWeight: typography.black,
        color: colors.primary,
    },
    avatarInfo: {
        flex: 1,
    },
    avatarName: {
        fontSize: typography.md,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        marginBottom: 3,
    },
    avatarPhone: {
        fontSize: typography.sm,
        color: colors.textMuted,
        fontWeight: typography.medium,
    },
    premiumBadge: {
        backgroundColor: colors.neonAmberDim,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: colors.neonAmber,
    },
    premiumText: {
        fontSize: 10,
        fontWeight: typography.black,
        color: colors.neonAmber,
        letterSpacing: 1,
    },

    // Section label
    sectionLabel: {
        fontSize: 10,
        fontWeight: typography.bold,
        color: colors.textMuted,
        letterSpacing: 2,
        paddingHorizontal: 20,
        marginBottom: 10,
    },

    // Menu card
    menuCard: {
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        marginBottom: 24,
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        gap: 14,
    },
    menuDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: 16,
    },
    menuIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuInfo: {
        flex: 1,
    },
    menuLabel: {
        fontSize: 11,
        color: colors.textMuted,
        fontWeight: typography.medium,
        marginBottom: 2,
    },
    menuValue: {
        fontSize: typography.sm,
        color: colors.textPrimary,
        fontWeight: typography.semibold,
    },

    // Upgrade banner
    upgradeCard: {
        marginHorizontal: 20,
        backgroundColor: colors.primaryDim,
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderWidth: 1,
        borderColor: colors.primary,
        marginBottom: 24,
    },
    upgradeLeft: {
        flex: 1,
    },
    upgradeTitle: {
        fontSize: typography.base,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        marginBottom: 4,
    },
    upgradeSub: {
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 16,
    },
    upgradeBtn: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 9,
    },
    upgradeBtnText: {
        fontSize: typography.sm,
        fontWeight: typography.bold,
        color: colors.white,
    },

    // Logout
    logoutBtn: {
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: colors.primaryDim,
        marginBottom: 20,
    },
    logoutText: {
        fontSize: typography.base,
        fontWeight: typography.bold,
        color: colors.primary,
    },

    // Footer
    footer: {
        textAlign: 'center',
        fontSize: 11,
        color: colors.textMuted,
        fontWeight: typography.medium,
        paddingHorizontal: 20,
    },
});