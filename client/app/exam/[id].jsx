import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Linking,
} from 'react-native';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useExamStore from '../../store/examStore';
import colors from '../../constants/colors';
import typography from '../../constants/typography';

export default function ExamDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { fetchExamDashboard, currentExam, currentChecklist, isLoading } = useExamStore();

    useEffect(() => {
        if (id) fetchExamDashboard(id);
    }, [id]);

    if (isLoading || !currentExam) {
        return (
            <View style={styles.loadingScreen}>
                <StatusBar barStyle="light-content" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    const checkedCount = currentChecklist.filter((i) => i.is_checked).length;
    const totalCount = currentChecklist.length;
    const progressPercent = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

    const openMaps = () => {
        if (currentExam.center_address) {
            Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentExam.center_address)}`
            );
        }
    };

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />
            <SafeAreaView style={styles.container} edges={['top']}>

                {/* ── HEADER ── */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerLabel}>EXAM DETAILS</Text>
                    <View style={{ width: 36 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* ── EXAM NAME + STATS ── */}
                    <View style={styles.heroCard}>

                        {/* Exam name */}
                        <Text style={styles.examName}>{currentExam.exam_name}</Text>

                        {/* Thin red accent line */}
                        <View style={styles.heroAccentLine} />

                        {/* Stats row */}
                        <View style={styles.statsBlock}>
                            <View style={styles.statItem}>
                                <Text style={styles.statBig}>
                                    {currentExam.exam_date
                                        ? new Date(currentExam.exam_date).toLocaleDateString('en-IN', {
                                            day: 'numeric', month: 'short',
                                        })
                                        : '—'}
                                </Text>
                                <Text style={styles.statSub}>DATE</Text>
                            </View>

                            <View style={styles.statDivider} />

                            <View style={styles.statItem}>
                                <Text style={styles.statBig}>
                                    {currentExam.reporting_time?.slice(0, 5) ?? '—'}
                                </Text>
                                <Text style={styles.statSub}>REPORT BY</Text>
                            </View>

                            <View style={styles.statDivider} />

                            <View style={styles.statItem}>
                                <Text style={[styles.statBig, { color: colors.primary }]}>
                                    {currentExam.gate_closing_time?.slice(0, 5) ?? '—'}
                                </Text>
                                <Text style={styles.statSub}>GATE CLOSES</Text>
                            </View>
                        </View>

                    </View>

                    {/* ── DETAILS LIST ── */}
                    <View style={styles.detailsCard}>

                        <View style={styles.detailItem}>
                            <Text style={styles.detailKey}>Roll Number</Text>
                            <Text style={styles.detailVal}>{currentExam.roll_number ?? '—'}</Text>
                        </View>

                        <View style={styles.detailItem}>
                            <Text style={styles.detailKey}>Exam Center</Text>
                            <Text style={styles.detailVal} numberOfLines={2}>
                                {currentExam.center_name ?? '—'}
                            </Text>
                        </View>

                        <View style={styles.detailItemRow}>
                            <View style={styles.detailHalf}>
                                <Text style={styles.detailKey}>City</Text>
                                <Text style={styles.detailVal}>{currentExam.center_city ?? '—'}</Text>
                            </View>
                            <View style={styles.detailHalfDivider} />
                            <TouchableOpacity style={styles.detailHalf} onPress={openMaps}>
                                <Text style={styles.detailKey}>Address</Text>
                                <Text style={[styles.detailVal, { color: colors.textSecondary }]} numberOfLines={2}>
                                    {currentExam.center_address ?? '—'}
                                </Text>
                                <Text style={styles.detailLink}>Open in Maps →</Text>
                            </TouchableOpacity>
                        </View>

                    </View>

                    {/* ── GET THERE ── */}
                    <Text style={styles.sectionLabel}>GET THERE</Text>
                    <View style={styles.transportGrid}>

                        <TouchableOpacity style={styles.transportMainBtn} onPress={openMaps} activeOpacity={0.85}>
                            <View style={styles.transportMainLeft}>
                                <View style={styles.transportMainIcon}>
                                    <Ionicons name="navigate" size={20} color={colors.white} />
                                </View>
                                <View>
                                    <Text style={styles.transportMainTitle}>Open in Maps</Text>
                                    <Text style={styles.transportMainSub}>{currentExam.center_city ?? 'Exam Center'}</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>

                        <View style={styles.transportSmallRow}>
                            <TouchableOpacity
                                style={styles.transportSmallBtn}
                                onPress={() => Linking.openURL('https://m.uber.com/ul/')}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.transportSmallEmoji}>🚗</Text>
                                <Text style={styles.transportSmallLabel}>Uber</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.transportSmallBtn}
                                onPress={() => Linking.openURL('https://book.olacabs.com/')}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.transportSmallEmoji}>🛺</Text>
                                <Text style={styles.transportSmallLabel}>Ola</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.transportSmallBtn}
                                onPress={() => Linking.openURL('https://rapido.bike/')}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.transportSmallEmoji}>🏍️</Text>
                                <Text style={styles.transportSmallLabel}>Rapido</Text>
                            </TouchableOpacity>
                        </View>

                    </View>

                    {/* ── CHECKLIST ── */}
                    {totalCount > 0 && (
                        <>
                            <Text style={styles.sectionLabel}>CHECKLIST</Text>
                            <TouchableOpacity
                                style={styles.checklistCard}
                                onPress={() => router.push(`/exam/checklist/${id}`)}
                                activeOpacity={0.85}
                            >
                                {/* Progress ring placeholder — just big number */}
                                <View style={styles.checklistNumBox}>
                                    <Text style={styles.checklistNum}>{checkedCount}</Text>
                                    <View style={styles.checklistNumDivider} />
                                    <Text style={styles.checklistDen}>{totalCount}</Text>
                                </View>

                                {/* Info */}
                                <View style={styles.checklistInfo}>
                                    <Text style={styles.checklistTitle}>
                                        {checkedCount === totalCount
                                            ? 'All set for exam day! ✓'
                                            : `${totalCount - checkedCount} items left to pack`}
                                    </Text>
                                    <View style={styles.progressTrack}>
                                        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                                    </View>
                                    <Text style={styles.checklistHint}>Tap to open checklist →</Text>
                                </View>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* ── NOT ALLOWED ── */}
                    <Text style={styles.sectionLabel}>NOT ALLOWED IN HALL</Text>
                    <View style={styles.notAllowedCard}>
                        {[
                            { icon: '📵', label: 'Mobile Phone' },
                            { icon: '⌚', label: 'Smartwatch' },
                            { icon: '🧮', label: 'Calculator' },
                            { icon: '🎧', label: 'Bluetooth devices' },
                            { icon: '🎒', label: 'Bags or pouches' },
                            { icon: '📄', label: 'Loose papers' },
                        ].map((item, i, arr) => (
                            <View key={item.label}>
                                <View style={styles.notAllowedRow}>
                                    <Text style={styles.notAllowedEmoji}>{item.icon}</Text>
                                    <Text style={styles.notAllowedText}>{item.label}</Text>
                                    <View style={styles.notAllowedBadge}>
                                        <Text style={styles.notAllowedBadgeText}>NOT ALLOWED</Text>
                                    </View>
                                </View>
                                {i < arr.length - 1 && <View style={styles.rowDivider} />}
                            </View>
                        ))}
                    </View>

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
    loadingScreen: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: colors.textMuted,
        fontSize: typography.base,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerLabel: {
        fontSize: 11,
        fontWeight: typography.bold,
        color: colors.textMuted,
        letterSpacing: 2,
    },

    // Hero
    heroCard: {
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 18,
        padding: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    heroAccentLine: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 16,
    },
    examName: {
        fontSize: typography.xl,
        fontWeight: typography.black,
        color: colors.textPrimary,
        letterSpacing: -0.5,
        lineHeight: 30,
    },
    statsBlock: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceRaised,
        borderRadius: 12,
        padding: 14,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statBig: {
        fontSize: typography.md,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        marginBottom: 4,
    },
    statSub: {
        fontSize: 9,
        fontWeight: typography.bold,
        color: colors.textMuted,
        letterSpacing: 1,
    },
    statDivider: {
        width: 1,
        backgroundColor: colors.border,
    },

    // Details card
    detailsCard: {
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 24,
        overflow: 'hidden',
    },
    detailItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    detailItemRow: {
        flexDirection: 'row',
    },
    detailHalf: {
        flex: 1,
        padding: 16,
    },
    detailHalfDivider: {
        width: 1,
        backgroundColor: colors.border,
    },
    detailKey: {
        fontSize: 10,
        fontWeight: typography.bold,
        color: colors.textMuted,
        letterSpacing: 1.5,
        marginBottom: 6,
    },
    detailVal: {
        fontSize: typography.sm,
        color: colors.textPrimary,
        fontWeight: typography.semibold,
        lineHeight: 20,
    },
    detailLink: {
        fontSize: 10,
        color: colors.primary,
        fontWeight: typography.bold,
        marginTop: 6,
        letterSpacing: 0.3,
    },
    addressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 16,
    },
    addressRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        marginLeft: 12,
        justifyContent: 'flex-end',
    },
    rowDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: 16,
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

    // Transport
    transportGrid: {
        marginHorizontal: 20,
        gap: 8,
        marginBottom: 24,
    },
    transportMainBtn: {
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: colors.border,
    },
    transportMainLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    transportMainIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transportMainTitle: {
        fontSize: typography.sm,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    transportMainSub: {
        fontSize: 11,
        color: colors.textMuted,
        fontWeight: typography.medium,
    },
    transportSmallRow: {
        flexDirection: 'row',
        gap: 8,
    },
    transportSmallBtn: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    transportSmallEmoji: {
        fontSize: 24,
    },
    transportSmallLabel: {
        fontSize: 11,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
    },

    // Checklist
    checklistCard: {
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 24,
    },
    checklistNumBox: {
        alignItems: 'center',
        gap: 2,
    },
    checklistNum: {
        fontSize: typography.xxxl,
        fontWeight: typography.black,
        color: colors.textPrimary,
        lineHeight: 38,
        letterSpacing: -1,
    },
    checklistNumDivider: {
        width: 24,
        height: 1.5,
        backgroundColor: colors.borderBright,
        borderRadius: 1,
    },
    checklistDen: {
        fontSize: typography.base,
        fontWeight: typography.bold,
        color: colors.textMuted,
    },
    checklistInfo: {
        flex: 1,
        gap: 8,
    },
    checklistTitle: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        lineHeight: 20,
    },
    progressTrack: {
        height: 3,
        backgroundColor: colors.border,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: 3,
        backgroundColor: colors.neonGreen,
        borderRadius: 2,
    },
    checklistHint: {
        fontSize: 11,
        color: colors.primary,
        fontWeight: typography.bold,
    },

    // Not allowed
    notAllowedCard: {
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        marginBottom: 24,
    },
    notAllowedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 16,
        gap: 12,
    },
    notAllowedEmoji: {
        fontSize: 18,
        width: 28,
        textAlign: 'center',
    },
    notAllowedText: {
        flex: 1,
        fontSize: typography.sm,
        color: colors.textSecondary,
        fontWeight: typography.medium,
    },
    notAllowedBadge: {
        backgroundColor: colors.primaryDim,
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    notAllowedBadgeText: {
        fontSize: 8,
        fontWeight: typography.bold,
        color: colors.primary,
        letterSpacing: 0.5,
    },
});