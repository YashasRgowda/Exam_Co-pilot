import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    StatusBar,
    Image,
    Dimensions,
} from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useExamStore from '../../store/examStore';
import colors from '../../constants/colors';
import typography from '../../constants/typography';
import { formatDate } from '../../utils/formatters';
import { AppState } from 'react-native';
import { useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

const { width } = Dimensions.get('window');
const TILE_SIZE = (width - 20 * 2 - 10) / 2;

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
        if (days <= 3) return '#C41E3A';
        if (days <= 7) return '#FFB800';
        return '#00E676';
    };

    const appState = useRef(AppState.currentState);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                fetchDashboard();
            }
            appState.current = nextAppState;
        });
        return () => subscription.remove();
    }, []);

    // Refresh dashboard every time home tab comes into focus
    // This ensures next_session data is always current
    useFocusEffect(
        useCallback(() => {
            fetchDashboard();
        }, [])
    );

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                        />
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

                    {/* ── TOP BAR ── */}
                    <View style={styles.topBar}>
                        <View style={styles.topBarLeft}>
                            <Text style={styles.greetingSmall}>{getGreeting()}, {firstName}</Text>
                            <Text style={styles.appName}>ExamPilot</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.avatarCircle}
                            onPress={() => router.push('/(tabs)/profile')}
                            activeOpacity={0.85}
                        >
                            {user?.avatar_url ? (
                                <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarLetter}>
                                    {firstName.charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* ── NEXT EXAM HERO ── */}
                    {nextExam ? (
                        <TouchableOpacity
                            style={styles.heroCard}
                            onPress={() => router.push(`/exam/${nextExam.id}`)}
                            activeOpacity={0.88}
                        >
                            <View style={styles.heroTopRow}>
                                <Text style={styles.heroLabel}>NEXT EXAM</Text>
                                <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
                            </View>
                            <Text style={styles.heroExamName} numberOfLines={1}>
                                {nextExam.exam_name}
                            </Text>
                            <View style={styles.heroDivider} />
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
                                        {(nextExam.next_session?.exam_date || nextExam.exam_date)
                                            ? new Date(nextExam.next_session?.exam_date || nextExam.exam_date)
                                                .toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                            : '—'}
                                    </Text>
                                    <Text style={styles.heroStatLabel}>DATE</Text>
                                </View>
                                <View style={styles.heroStatDivider} />
                                <View style={styles.heroStat}>
                                    <Text style={styles.heroStatMed}>
                                        {nextExam.next_session?.start_time?.slice(0, 5) ?? '—'}
                                    </Text>
                                    <Text style={styles.heroStatLabel}>START</Text>
                                </View>
                                <View style={styles.heroStatDivider} />
                                <View style={styles.heroStat}>
                                    <Text style={styles.heroStatMed}>
                                        {nextExam.next_session?.end_time?.slice(0, 5) ?? '—'}
                                    </Text>
                                    <Text style={styles.heroStatLabel}>END</Text>
                                </View>
                            </View>
                            {nextExam.center_city && (
                                <View style={styles.heroCenterRow}>
                                    <Ionicons name="location-outline" size={11} color={colors.textMuted} />
                                    <Text style={styles.heroCenterText}>{nextExam.center_city}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.emptyHeroCard}
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

                    {/* ── QUICK ACTIONS ── */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => router.push('/(tabs)/profile')}
                            activeOpacity={0.85}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: colors.primaryGlow }]}>
                                <Ionicons name="albums-outline" size={20} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={styles.actionTitle}>My Exams</Text>
                                <Text style={styles.actionSub}>All exams</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => nextExam
                                ? router.push(`/exam/checklist/${nextExam.id}`)
                                : router.push('/(tabs)/upload')
                            }
                            activeOpacity={0.85}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: colors.neonGreenDim }]}>
                                <Ionicons name="checkbox-outline" size={20} color={colors.neonGreen} />
                            </View>
                            <View>
                                <Text style={styles.actionTitle}>Checklist</Text>
                                <Text style={styles.actionSub}>{nextExam ? 'Exam prep' : 'Upload first'}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* ── EMPTY STATE ── */}
                    {upcomingExams.length === 0 && pastExams.length === 0 && (
                        <>
                            {/* ── SECTION BREAK ── */}
                            <View style={styles.sectionBreak}>
                                <View style={styles.sectionBreakLine} />
                                <Text style={styles.sectionBreakLabel}>WHAT YOU GET</Text>
                                <View style={styles.sectionBreakLine} />
                            </View>

                            <View style={styles.emptyState}>

                                {/* Headline */}
                                <View style={styles.headlineBlock}>
                                    <Text style={styles.headline}>
                                        Exam day,{'\n'}sorted.
                                    </Text>
                                    <Text style={styles.headlineSub}>
                                        Upload your admit card — get your center, timings, checklist and reminders. All in one place.
                                    </Text>
                                </View>

                                {/* ── MOSAIC GRID ── */}
                                <View style={styles.mosaicGrid}>

                                    {/* Tile 1 — tall left — AI Parsing */}
                                    <View style={[styles.tile, styles.tileTallLeft, { backgroundColor: '#0E0810' }]}>
                                        <View style={[styles.tileIconWrap, { backgroundColor: 'rgba(196,30,58,0.12)' }]}>
                                            <Ionicons name="scan-outline" size={22} color="#C41E3A" />
                                        </View>
                                        <View style={styles.tileTextWrap}>
                                            <Text style={styles.tileTitle}>AI Parsing</Text>
                                            <Text style={styles.tileSub}>
                                                Reads every detail from your admit card instantly
                                            </Text>
                                        </View>
                                        <View style={styles.tileBadge}>
                                            <Text style={styles.tileBadgeText}>INSTANT</Text>
                                        </View>
                                    </View>

                                    {/* Right column */}
                                    <View style={styles.tileRightCol}>

                                        {/* Tile 2 — Navigation */}
                                        <View style={[styles.tile, styles.tileSmall, { backgroundColor: '#080E0A' }]}>
                                            <View style={[styles.tileIconWrap, { backgroundColor: 'rgba(0,230,118,0.1)' }]}>
                                                <Ionicons name="navigate-outline" size={18} color="#00E676" />
                                            </View>
                                            <Text style={styles.tileTitle}>Navigation</Text>
                                            <Text style={styles.tileSub}>Route + cab links</Text>
                                        </View>

                                        {/* Tile 3 — Reminders */}
                                        <View style={[styles.tile, styles.tileSmall, { backgroundColor: '#080A0E' }]}>
                                            <View style={[styles.tileIconWrap, { backgroundColor: 'rgba(77,159,255,0.1)' }]}>
                                                <Ionicons name="alarm-outline" size={18} color="#4D9FFF" />
                                            </View>
                                            <Text style={styles.tileTitle}>Reminders</Text>
                                            <Text style={styles.tileSub}>Night & morning alerts</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* ── WIDE TILE — Smart Checklist ── */}
                                <View style={[styles.tile, styles.tileWide, { backgroundColor: '#0C0A06' }]}>
                                    <View style={[styles.tileIconWrap, { backgroundColor: 'rgba(255,184,0,0.1)' }]}>
                                        <Ionicons name="checkbox-outline" size={18} color="#FFB800" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.tileTitle}>Smart Checklist</Text>
                                        <Text style={styles.tileSub}>
                                            Auto-generated — admit card, ID, pens, water bottle
                                        </Text>
                                    </View>
                                    <View style={[styles.tileTag, { backgroundColor: 'rgba(255,184,0,0.1)', borderColor: 'rgba(255,184,0,0.2)' }]}>
                                        <Text style={[styles.tileTagText, { color: '#FFB800' }]}>AUTO</Text>
                                    </View>
                                </View>

                            </View>
                        </>
                    )}

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

    // ── TOP BAR ──
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 22,
        paddingTop: 18,
        paddingBottom: 26,
    },
    topBarLeft: { gap: 3 },
    greetingSmall: {
        fontSize: 14,
        color: '#52526A',
        fontWeight: '500',
        letterSpacing: 0.1,
    },
    appName: {
        fontSize: 34,
        fontWeight: '800',
        color: '#F0F0F8',
        letterSpacing: -1.2,
        lineHeight: 38,
    },
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#0F0F1E',
        borderWidth: 2,
        borderColor: '#C41E3A',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 3,
    },
    avatarLetter: { fontSize: 17, fontWeight: '700', color: '#C41E3A' },
    avatarImage: { width: 44, height: 44, borderRadius: 22 },

    // ── HERO CARD ──
    heroCard: {
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        gap: 12,
    },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroLabel: { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 2 },
    heroDivider: { height: 1, backgroundColor: colors.border },
    heroExamName: { fontSize: typography.lg, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 },
    heroStatsRow: { flexDirection: 'row', alignItems: 'center' },
    heroStat: { flex: 1, alignItems: 'center', gap: 4 },
    heroStatBig: { fontSize: typography.xxxl, fontWeight: '900', letterSpacing: -1, lineHeight: 38 },
    heroStatMed: { fontSize: typography.md, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3 },
    heroStatLabel: { fontSize: 9, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.2 },
    heroStatDivider: { width: 1, height: 32, backgroundColor: colors.border },
    heroCenterRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    heroCenterText: { fontSize: typography.xs, color: colors.textMuted, fontWeight: '500' },

    // ── EMPTY HERO ──
    emptyHeroCard: {
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
    emptyTitle: { fontSize: typography.base, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
    emptySubtitle: { fontSize: typography.xs, color: colors.textSecondary, lineHeight: 17 },
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

    // ── QUICK ACTIONS ──
    actionsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
    actionCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    actionTitle: { fontSize: typography.sm, fontWeight: '700', color: colors.textPrimary },
    actionSub: { fontSize: typography.xs, color: colors.textMuted, fontWeight: '500', marginTop: 1 },

    // ── SECTION BREAK ──
    // The separator between quick actions and the empty state below
    sectionBreak: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 28,
    },
    sectionBreakLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#141428',
    },
    sectionBreakLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#252538',
        letterSpacing: 2.5,
    },

    // ── EMPTY STATE ──
    emptyState: {
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 24,
    },

    // Headline
    headlineBlock: { gap: 8, marginBottom: 4 },
    headline: {
        fontSize: 30,
        fontWeight: '800',
        color: '#F0F0F8',
        letterSpacing: -0.8,
        lineHeight: 36,
    },
    headlineSub: {
        fontSize: 13,
        color: '#3A3A52',
        fontWeight: '500',
        lineHeight: 20,
    },

    // ── MOSAIC GRID ──
    mosaicGrid: {
        flexDirection: 'row',
        gap: 10,
        height: TILE_SIZE * 1.1,
    },

    // Base tile
    tile: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#141428',
        padding: 14,
        overflow: 'hidden',
    },
    tileTallLeft: {
        flex: 1,
        justifyContent: 'space-between',
    },
    tileRightCol: {
        flex: 1,
        gap: 10,
    },
    tileSmall: {
        flex: 1,
        gap: 6,
    },
    tileWide: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    tileIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tileTextWrap: {
        flex: 1,
        gap: 4,
        marginTop: 10,
    },
    tileTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#E0E0EC',
        letterSpacing: -0.2,
    },
    tileSub: {
        fontSize: 11,
        color: '#323244',
        fontWeight: '500',
        lineHeight: 16,
    },
    tileBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(196,30,58,0.12)',
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: 'rgba(196,30,58,0.2)',
    },
    tileBadgeText: {
        fontSize: 8,
        fontWeight: '800',
        color: '#C41E3A',
        letterSpacing: 1.2,
    },
    tileTag: {
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderWidth: 1,
    },
    tileTagText: {
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 1.2,
    },

    // ── SECTIONS ──
    section: { marginBottom: 20 },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textMuted,
        letterSpacing: 2,
        paddingHorizontal: 20,
        marginBottom: 10,
    },

    // ── EXAM ROWS ──
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
    examAccentBar: { width: 3, height: 32, borderRadius: 2 },
    examRowInfo: { flex: 1 },
    examRowName: { fontSize: typography.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 3 },
    examRowDate: { fontSize: typography.xs, color: colors.textMuted },
    examDaysText: { fontSize: typography.sm, fontWeight: '700' },

    // ── OFFLINE BANNER ──
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
        fontWeight: '500',
        flex: 1,
    },
});