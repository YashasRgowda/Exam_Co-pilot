import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    StatusBar,
} from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useExamStore from '../../store/examStore';
import colors from '../../constants/colors';
import typography from '../../constants/typography';
import { formatDate, getDaysColor } from '../../utils/formatters';

export default function HomeScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { dashboardData, fetchDashboard, isLoading, isOffline } = useExamStore();
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => { fetchDashboard(); }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchDashboard();
        setRefreshing(false);
    };

    const upcomingExams = dashboardData?.upcoming_exams || [];
    const pastExams = dashboardData?.past_exams || [];
    const firstName = user?.full_name?.split(' ')[0] || 'Student';
    const nextExam = upcomingExams[0];

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Morning';
        if (h < 17) return 'Afternoon';
        return 'Evening';
    };

    const getDaysAccent = (days) => {
        if (days === undefined || days === null) return colors.textMuted;
        if (days <= 3) return colors.primary;
        if (days <= 7) return colors.neonAmber;
        return colors.neonGreen;
    };

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                >
                    {/* ── OFFLINE BANNER ── */}
                    {isOffline && (
                        <View style={styles.offlineBanner}>
                            <Ionicons name="cloud-offline-outline" size={14} color={colors.neonAmber} />
                            <Text style={styles.offlineBannerText}>
                                You're offline — showing saved exam data
                            </Text>
                        </View>
                    )}
                    <View style={styles.topBar}>
                        <View>
                            <Text style={styles.greetingSmall}>{getGreeting()}, {firstName}</Text>
                            <Text style={styles.appName}>ExamPilot</Text>
                        </View>
                        <TouchableOpacity style={styles.avatarCircle}>
                            <Text style={styles.avatarLetter}>{firstName.charAt(0).toUpperCase()}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ── NEXT EXAM HERO ── */}
                    {nextExam ? (
                        <TouchableOpacity
                            style={styles.heroCard}
                            onPress={() => router.push(`/exam/${nextExam.id}`)}
                            activeOpacity={0.88}
                        >
                            <View style={styles.heroStrip}>
                                <View style={styles.heroStripLeft}>
                                    <View style={styles.liveDot} />
                                    <Text style={styles.heroStripLabel}>NEXT EXAM</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" />
                            </View>
                            <View style={styles.heroBody}>
                                <Text style={styles.heroExamName} numberOfLines={2}>
                                    {nextExam.exam_name}
                                </Text>
                                <View style={styles.heroStatsRow}>
                                    <View style={styles.heroStat}>
                                        <Text style={[styles.heroStatBig, { color: getDaysAccent(nextExam.days_remaining) }]}>
                                            {nextExam.days_remaining ?? '—'}
                                        </Text>
                                        <Text style={styles.heroStatLabel}>DAYS LEFT</Text>
                                    </View>
                                    <View style={styles.heroStatDivider} />
                                    <View style={styles.heroStat}>
                                        <Text style={styles.heroStatMed}>
                                            {nextExam.exam_date
                                                ? new Date(nextExam.exam_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                                : '—'}
                                        </Text>
                                        <Text style={styles.heroStatLabel}>DATE</Text>
                                    </View>
                                    <View style={styles.heroStatDivider} />
                                    <View style={styles.heroStat}>
                                        <Text style={styles.heroStatMed}>
                                            {nextExam.reporting_time?.slice(0, 5) ?? '—'}
                                        </Text>
                                        <Text style={styles.heroStatLabel}>REPORT BY</Text>
                                    </View>
                                </View>
                                {nextExam.center_city && (
                                    <View style={styles.heroCenterRow}>
                                        <Ionicons name="location" size={11} color={colors.textMuted} />
                                        <Text style={styles.heroCenterText} numberOfLines={1}>
                                            {nextExam.center_city}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.emptyCard}
                            onPress={() => router.push('/(tabs)/upload')}
                            activeOpacity={0.88}
                        >
                            <View style={styles.emptyIconBox}>
                                <Ionicons name="document-attach-outline" size={26} color={colors.primary} />
                            </View>
                            <View style={styles.emptyTextBox}>
                                <Text style={styles.emptyTitle}>Upload Admit Card</Text>
                                <Text style={styles.emptySubtitle}>
                                    AI instantly reads date, center{'\n'}& all exam details
                                </Text>
                            </View>
                            <View style={styles.emptyArrow}>
                                <Ionicons name="arrow-forward" size={15} color={colors.primary} />
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* ── QUICK ACTIONS 2x2 ── */}
                    <View style={styles.actionsGrid}>
                        <View style={styles.actionsRow}>

                            <TouchableOpacity
                                style={styles.actionCard}
                                onPress={() => router.push('/(tabs)/upload')}
                                activeOpacity={0.85}
                            >
                                <View style={[styles.actionIconBox, { backgroundColor: colors.primaryGlow }]}>
                                    <Ionicons name="scan-outline" size={20} color={colors.primary} />
                                </View>
                                <Text style={styles.actionTitle}>Scan Card</Text>
                                <Text style={styles.actionSub}>AI parser</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionCard}
                                onPress={() => nextExam && router.push(`/exam/checklist/${nextExam.id}`)}
                                activeOpacity={0.85}
                            >
                                <View style={[styles.actionIconBox, { backgroundColor: colors.neonGreenDim }]}>
                                    <Ionicons name="checkbox-outline" size={20} color={colors.neonGreen} />
                                </View>
                                <Text style={styles.actionTitle}>Checklist</Text>
                                <Text style={styles.actionSub}>Exam prep</Text>
                            </TouchableOpacity>

                        </View>

                        <View style={styles.actionsRow}>

                            <TouchableOpacity
                                style={styles.actionCard}
                                activeOpacity={0.85}
                            >
                                <View style={[styles.actionIconBox, { backgroundColor: colors.neonBlueDim }]}>
                                    <Ionicons name="navigate-outline" size={20} color={colors.neonBlue} />
                                </View>
                                <Text style={styles.actionTitle}>Navigate</Text>
                                <Text style={styles.actionSub}>To center</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionCard}
                                onPress={() => router.push('/(tabs)/profile')}
                                activeOpacity={0.85}
                            >
                                <View style={[styles.actionIconBox, { backgroundColor: colors.neonAmberDim }]}>
                                    <Ionicons name="person-outline" size={20} color={colors.neonAmber} />
                                </View>
                                <Text style={styles.actionTitle}>Profile</Text>
                                <Text style={styles.actionSub}>My info</Text>
                            </TouchableOpacity>

                        </View>
                    </View>

                    {/* ── UPCOMING EXAMS ── */}
                    {upcomingExams.length > 1 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>UPCOMING</Text>
                            {upcomingExams.slice(1).map((exam) => (
                                <TouchableOpacity
                                    key={exam.id}
                                    style={styles.examRow}
                                    onPress={() => router.push(`/exam/${exam.id}`)}
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.examAccentBar, { backgroundColor: getDaysAccent(exam.days_remaining) }]} />
                                    <View style={styles.examRowInfo}>
                                        <Text style={styles.examRowName} numberOfLines={1}>{exam.exam_name}</Text>
                                        <Text style={styles.examRowDate}>{formatDate(exam.exam_date)}</Text>
                                    </View>
                                    <Text style={[styles.examDaysText, { color: getDaysAccent(exam.days_remaining) }]}>
                                        {exam.days_remaining}d
                                    </Text>
                                    <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* ── PAST EXAMS ── */}
                    {pastExams.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>PAST</Text>
                            {pastExams.map((exam) => (
                                <TouchableOpacity
                                    key={exam.id}
                                    style={[styles.examRow, styles.pastRow]}
                                    onPress={() => router.push(`/exam/${exam.id}`)}
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.examAccentBar, { backgroundColor: colors.textMuted }]} />
                                    <View style={styles.examRowInfo}>
                                        <Text style={[styles.examRowName, { color: colors.textSecondary }]} numberOfLines={1}>
                                            {exam.exam_name}
                                        </Text>
                                        <Text style={styles.examRowDate}>{formatDate(exam.exam_date)}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    greetingSmall: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        fontWeight: typography.medium,
        marginBottom: 2,
    },
    appName: {
        fontSize: typography.xxl,
        fontWeight: typography.black,
        color: colors.textPrimary,
        letterSpacing: -0.8,
    },
    avatarCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.primaryDim,
        borderWidth: 1.5,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarLetter: {
        fontSize: typography.base,
        fontWeight: typography.bold,
        color: colors.primary,
    },

    // Hero
    heroCard: {
        marginHorizontal: 20,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    heroStrip: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 9,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroStripLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.white,
        opacity: 0.9,
    },
    heroStripLabel: {
        fontSize: typography.xs,
        fontWeight: typography.bold,
        color: colors.white,
        letterSpacing: 1.5,
    },
    heroBody: { padding: 16 },
    heroExamName: {
        fontSize: typography.lg,
        fontWeight: typography.black,
        color: colors.textPrimary,
        letterSpacing: -0.3,
        lineHeight: 27,
        marginBottom: 14,
    },
    heroStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceRaised,
        borderRadius: 12,
        padding: 13,
        marginBottom: 10,
    },
    heroStat: { flex: 1, alignItems: 'center' },
    heroStatBig: {
        fontSize: typography.xxxl,
        fontWeight: typography.black,
        letterSpacing: -1,
        lineHeight: 38,
    },
    heroStatMed: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        letterSpacing: -0.3,
    },
    heroStatLabel: {
        fontSize: 9,
        fontWeight: typography.bold,
        color: colors.textMuted,
        letterSpacing: 1.2,
        marginTop: 3,
    },
    heroStatDivider: { width: 1, height: 32, backgroundColor: colors.border },
    heroCenterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    heroCenterText: {
        fontSize: typography.xs,
        color: colors.textMuted,
        flex: 1,
    },

    // Empty card
    emptyCard: {
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 18,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.borderBright,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    emptyIconBox: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: colors.primaryGlow,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primaryDim,
    },
    emptyTextBox: { flex: 1 },
    emptyTitle: {
        fontSize: typography.base,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        marginBottom: 3,
    },
    emptySubtitle: {
        fontSize: typography.xs,
        color: colors.textSecondary,
        lineHeight: 17,
    },
    emptyArrow: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.primaryGlow,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primaryDim,
    },

    // Actions
    actionsGrid: {
        paddingHorizontal: 20,
        gap: 10,
        marginBottom: 24,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    actionCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTitle: {
        fontSize: typography.base,
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },
    actionSub: {
        fontSize: typography.xs,
        color: colors.textMuted,
        fontWeight: typography.medium,
    },

    // Section
    section: { marginBottom: 20 },
    sectionLabel: {
        fontSize: 10,
        fontWeight: typography.bold,
        color: colors.textMuted,
        letterSpacing: 2,
        paddingHorizontal: 20,
        marginBottom: 10,
    },

    // Exam rows
    examRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        marginHorizontal: 20,
        marginBottom: 8,
        borderRadius: 12,
        paddingVertical: 13,
        paddingHorizontal: 14,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    pastRow: { opacity: 0.45 },
    examAccentBar: {
        width: 3,
        height: 32,
        borderRadius: 2,
    },
    examRowInfo: { flex: 1 },
    examRowName: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: 3,
    },
    examRowDate: {
        fontSize: typography.xs,
        color: colors.textMuted,
    },
    examDaysText: {
        fontSize: typography.sm,
        fontWeight: typography.bold,
    },

    // Offline banner
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,184,0,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,184,0,0.2)',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginHorizontal: 20,
        marginBottom: 12,
    },
    offlineBannerText: {
        fontSize: typography.xs,
        color: colors.neonAmber,
        fontWeight: typography.medium,
        flex: 1,
    },
});