import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Alert,
    TextInput,
    Image,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import useAuthStore from '../../store/authStore';
import useExamStore from '../../store/examStore';
import offlineStorage from '../../utils/offlineStorage';
import authService from '../../services/authService';
import colors from '../../constants/colors';
import typography from '../../constants/typography';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout, uploadAvatar, deleteAvatar, updateUser } = useAuthStore();
    const { dashboardData } = useExamStore();

    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(user?.full_name || '');
    const [savingName, setSavingName] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [clearingData, setClearingData] = useState(false);

    const firstName = user?.full_name?.split(' ')[0] || 'Student';
    const phone = user?.phone ? `+91 ${user.phone}` : '—';
    const isPremium = user?.is_premium || false;
    const avatarUrl = user?.avatar_url || null;

    // Live exam data from dashboard
    const upcomingExams = dashboardData?.upcoming_exams || [];
    const upcomingCount = upcomingExams.length;
    const pastCount = dashboardData?.past_exams?.length || 0;
    const totalCount = upcomingCount + pastCount;

    // Parse limit
    const dailyLimit = isPremium ? 20 : 3;
    const parsesUsed = user?.daily_parse_count || 0;
    const parsesLeft = Math.max(0, dailyLimit - parsesUsed);
    const parsePercent = Math.min(100, (parsesUsed / dailyLimit) * 100);

    const handleSaveName = async () => {
        if (!nameInput.trim()) return;
        try {
            setSavingName(true);
            await authService.updateProfile(nameInput.trim());
            updateUser({ ...user, full_name: nameInput.trim() });
            setEditingName(false);
        } catch {
            Alert.alert('Error', 'Failed to update name.');
        } finally {
            setSavingName(false);
        }
    };

    const handleAvatarPress = () => {
        Alert.alert(
            'Profile Photo',
            'Choose an option',
            [
                {
                    text: 'Take Photo',
                    onPress: handleTakePhoto,
                },
                {
                    text: 'Choose from Library',
                    onPress: handlePickImage,
                },
                avatarUrl ? {
                    text: 'Remove Photo',
                    style: 'destructive',
                    onPress: handleDeleteAvatar,
                } : null,
                { text: 'Cancel', style: 'cancel' },
            ].filter(Boolean)
        );
    };

    const handlePickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission needed', 'Please allow photo access.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            await handleUploadAvatar(result.assets[0]);
        }
    };

    const handleTakePhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission needed', 'Please allow camera access.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            await handleUploadAvatar(result.assets[0]);
        }
    };

    const handleUploadAvatar = async (asset) => {
        try {
            setUploadingAvatar(true);
            const file = {
                uri: asset.uri,
                name: 'avatar.jpg',
                mimeType: 'image/jpeg',
            };
            const result = await uploadAvatar(file);
            if (!result.success) {
                Alert.alert('Error', 'Failed to upload photo.');
            }
        } catch {
            Alert.alert('Error', 'Failed to upload photo.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleDeleteAvatar = async () => {
        try {
            setUploadingAvatar(true);
            await deleteAvatar();
        } catch {
            Alert.alert('Error', 'Failed to remove photo.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleClearOfflineData = async () => {
        Alert.alert(
            'Clear Offline Data',
            'This will remove all saved exam data from this device. You\'ll need internet to reload it.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setClearingData(true);
                            await offlineStorage.clearAll();
                            Alert.alert('Done', 'Offline data cleared successfully.');
                        } catch {
                            Alert.alert('Error', 'Failed to clear data.');
                        } finally {
                            setClearingData(false);
                        }
                    },
                },
            ]
        );
    };

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

                    {/* ── AVATAR + NAME CARD ── */}
                    <View style={styles.avatarCard}>

                        {/* Avatar */}
                        <TouchableOpacity
                            style={styles.avatarWrapper}
                            onPress={handleAvatarPress}
                            activeOpacity={0.85}
                        >
                            {uploadingAvatar ? (
                                <View style={styles.avatarCircle}>
                                    <ActivityIndicator color={colors.primary} />
                                </View>
                            ) : avatarUrl ? (
                                <Image
                                    source={{ uri: avatarUrl }}
                                    style={styles.avatarImage}
                                />
                            ) : (
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarLetter}>
                                        {firstName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.avatarEditBadge}>
                                <Ionicons name="camera" size={11} color={colors.white} />
                            </View>
                        </TouchableOpacity>

                        {/* Name + phone */}
                        <View style={styles.avatarInfo}>
                            {editingName ? (
                                <View style={styles.nameEditRow}>
                                    <TextInput
                                        style={styles.nameInput}
                                        value={nameInput}
                                        onChangeText={setNameInput}
                                        autoFocus
                                        placeholder="Your name"
                                        placeholderTextColor={colors.textMuted}
                                        returnKeyType="done"
                                        onSubmitEditing={handleSaveName}
                                    />
                                    <TouchableOpacity
                                        style={styles.nameSaveBtn}
                                        onPress={handleSaveName}
                                        disabled={savingName}
                                    >
                                        {savingName ? (
                                            <ActivityIndicator size="small" color={colors.white} />
                                        ) : (
                                            <Ionicons name="checkmark" size={16} color={colors.white} />
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.nameCancelBtn}
                                        onPress={() => {
                                            setEditingName(false);
                                            setNameInput(user?.full_name || '');
                                        }}
                                    >
                                        <Ionicons name="close" size={16} color={colors.textMuted} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.nameRow}
                                    onPress={() => setEditingName(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.avatarName}>
                                        {user?.full_name || 'Tap to add name'}
                                    </Text>
                                    <Ionicons name="pencil" size={13} color={colors.textMuted} />
                                </TouchableOpacity>
                            )}
                            <Text style={styles.avatarPhone}>{phone}</Text>
                        </View>

                        {/* Premium badge */}
                        {isPremium && (
                            <View style={styles.premiumBadge}>
                                <Text style={styles.premiumText}>PRO</Text>
                            </View>
                        )}
                    </View>

                    {/* ── YOUR EXAMS ── */}
                    <Text style={styles.sectionLabel}>YOUR EXAMS</Text>

                    {upcomingExams.length === 0 ? (
                        <View style={styles.noExamCard}>
                            <Ionicons name="calendar-outline" size={24} color={colors.textMuted} />
                            <Text style={styles.noExamTitle}>No upcoming exams</Text>
                            <Text style={styles.noExamSub}>Upload your admit card to get started</Text>
                        </View>
                    ) : (
                        <View style={styles.examsList}>
                            {upcomingExams.map((exam) => {
                                const days = exam.days_remaining;
                                const isUrgent = days <= 7;
                                const isSoon = days > 7 && days <= 15;
                                const accentColor = isUrgent
                                    ? colors.primary
                                    : isSoon
                                        ? colors.neonAmber
                                        : colors.neonGreen;

                                const details = [
                                    exam.exam_date
                                        ? new Date(exam.exam_date).toLocaleDateString('en-IN', {
                                            day: 'numeric', month: 'short'
                                        })
                                        : null,
                                    exam.reporting_time
                                        ? exam.reporting_time.slice(0, 5)
                                        : null,
                                    exam.center_city || null,
                                ].filter(Boolean).join('  ·  ');

                                return (
                                    <TouchableOpacity
                                        key={exam.id}
                                        style={styles.examCleanCard}
                                        onPress={() => router.push(`/exam/${exam.id}`)}
                                        activeOpacity={0.82}
                                    >
                                        {/* Left accent */}
                                        <View style={[styles.examCleanAccent, { backgroundColor: accentColor }]} />

                                        {/* Content */}
                                        <View style={styles.examCleanContent}>
                                            <Text style={styles.examCleanName} numberOfLines={1}>
                                                {exam.exam_name}
                                            </Text>
                                            <Text style={styles.examCleanDetails} numberOfLines={1}>
                                                {details}
                                            </Text>
                                        </View>

                                        {/* Days */}
                                        <View style={styles.examCleanDaysBox}>
                                            <Text style={[styles.examCleanDaysNum, { color: accentColor }]}>
                                                {days}
                                            </Text>
                                            <Text style={[styles.examCleanDaysLabel, { color: accentColor }]}>
                                                {days === 1 ? 'day' : 'days'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* ── DAILY USAGE ── */}
                    <Text style={styles.sectionLabel}>TODAY'S USAGE</Text>
                    <View style={styles.usageCard}>
                        <View style={styles.usageTop}>
                            <View style={styles.usageLeft}>
                                <Ionicons name="scan-outline" size={16} color={colors.primary} />
                                <Text style={styles.usageTitle}>AI Parses</Text>
                            </View>
                            <Text style={styles.usageCount}>
                                <Text style={styles.usageUsed}>{parsesUsed}</Text>
                                <Text style={styles.usageTotal}> / {dailyLimit}</Text>
                            </Text>
                        </View>
                        <View style={styles.usageTrack}>
                            <View style={[
                                styles.usageFill,
                                {
                                    width: `${parsePercent}%`,
                                    backgroundColor: parsePercent >= 100
                                        ? colors.primary
                                        : parsePercent >= 60
                                            ? colors.neonAmber
                                            : colors.neonGreen,
                                }
                            ]} />
                        </View>
                        <Text style={styles.usageHint}>
                            {parsesLeft === 0
                                ? 'Daily limit reached — resets at midnight'
                                : `${parsesLeft} parse${parsesLeft === 1 ? '' : 's'} remaining today`}
                        </Text>
                    </View>

                    {/* ── DATA & STORAGE ── */}
                    <Text style={styles.sectionLabel}>DATA & STORAGE</Text>
                    <View style={styles.menuCard}>
                        <TouchableOpacity
                            style={styles.menuRow}
                            onPress={handleClearOfflineData}
                            activeOpacity={0.85}
                            disabled={clearingData}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: colors.neonBlueDim }]}>
                                {clearingData ? (
                                    <ActivityIndicator size="small" color={colors.neonBlue} />
                                ) : (
                                    <Ionicons name="trash-outline" size={16} color={colors.neonBlue} />
                                )}
                            </View>
                            <View style={styles.menuInfo}>
                                <Text style={styles.menuLabel}>Clear Offline Data</Text>
                                <Text style={styles.menuValue}>Remove saved exam data from device</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* ── ACCOUNT ── */}
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
                                    {isPremium ? '✨ Premium — 20 parses/day' : 'Free — 3 parses/day'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* ── UPGRADE BANNER ── */}
                    {!isPremium && (
                        <>
                            <Text style={styles.sectionLabel}>UPGRADE</Text>
                            <View style={styles.upgradeCard}>
                                <View style={styles.upgradeLeft}>
                                    <Text style={styles.upgradeTitle}>✨ Go Premium</Text>
                                    <Text style={styles.upgradeSub}>
                                        20 parses/day · AI Doubt Assistant · Smart Alerts
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
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 24,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatarCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primaryDim,
        borderWidth: 1.5,
        borderColor: colors.borderBright,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 1.5,
        borderColor: colors.borderBright,
    },
    avatarLetter: {
        fontSize: typography.xl,
        fontWeight: typography.black,
        color: colors.primary,
    },
    avatarEditBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    avatarInfo: {
        flex: 1,
        gap: 4,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    avatarName: {
        fontSize: typography.md,
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },
    nameEditRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    nameInput: {
        flex: 1,
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        borderBottomWidth: 1,
        borderBottomColor: colors.primary,
        paddingVertical: 2,
    },
    nameSaveBtn: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nameCancelBtn: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
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

    // Stats card
    statsCard: {
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 24,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        gap: 6,
    },
    statNum: {
        fontSize: typography.xxxl,
        fontWeight: typography.black,
        color: colors.textPrimary,
        letterSpacing: -1,
        lineHeight: 40,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: typography.bold,
        color: colors.textMuted,
        letterSpacing: 1.5,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.border,
    },

    // Usage card
    usageCard: {
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 24,
        gap: 10,
    },
    usageTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    usageLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    usageTitle: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },
    usageCount: {
        fontSize: typography.sm,
    },
    usageUsed: {
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },
    usageTotal: {
        color: colors.textMuted,
    },
    usageTrack: {
        height: 6,
        backgroundColor: colors.border,
        borderRadius: 3,
        overflow: 'hidden',
    },
    usageFill: {
        height: 6,
        borderRadius: 3,
    },
    usageHint: {
        fontSize: typography.xs,
        color: colors.textMuted,
        fontWeight: typography.medium,
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

    // Upgrade
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
    upgradeLeft: { flex: 1 },
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
    footer: {
        textAlign: 'center',
        fontSize: 11,
        color: colors.textMuted,
        fontWeight: typography.medium,
        paddingHorizontal: 20,
    },
    // No exam empty state
    noExamCard: {
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 14,
        paddingVertical: 32,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 24,
    },
    noExamTitle: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
        marginTop: 4,
    },
    noExamSub: {
        fontSize: typography.xs,
        color: colors.textMuted,
        textAlign: 'center',
    },

    // Clean exam cards
    examsList: {
        marginHorizontal: 20,
        gap: 8,
        marginBottom: 24,
    },
    examCleanCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        minHeight: 64,
        paddingVertical: 14,
        paddingHorizontal: 14,
        gap: 12,
    },
    examCleanAccent: {
        width: 3,
        height: 32,
        borderRadius: 2,
    },
    examCleanContent: {
        flex: 1,
        gap: 5,
    },
    examCleanName: {
        fontSize: typography.sm,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        letterSpacing: -0.2,
    },
    examCleanDetails: {
        fontSize: 11,
        color: colors.textMuted,
        fontWeight: typography.medium,
        letterSpacing: 0.1,
    },
    examCleanDaysBox: {
        paddingRight: 16,
        paddingLeft: 8,
        alignItems: 'center',
    },
    examCleanDaysNum: {
        fontSize: typography.xl,
        fontWeight: typography.black,
        letterSpacing: -0.5,
        lineHeight: 26,
    },
    examCleanDaysLabel: {
        fontSize: 10,
        fontWeight: typography.medium,
        letterSpacing: 0.3,
    },
});