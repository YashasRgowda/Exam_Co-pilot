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
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import useAuthStore from '../../store/authStore';
import useExamStore from '../../store/examStore';
import offlineStorage from '../../utils/offlineStorage';
import authService from '../../services/authService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PREMIUM_PERKS = [
    { icon: 'scan-outline', label: '20 AI parses per day', sub: 'vs 3 on free plan' },
    { icon: 'chatbubble-ellipses-outline', label: 'AI Doubt Assistant', sub: 'Ask anything about your exam' },
    { icon: 'notifications-outline', label: 'Smart Leave-Home Alert', sub: 'Never be late to your exam' },
    { icon: 'flash-outline', label: 'Emergency Navigation', sub: 'Panic button with fastest route' },
    { icon: 'people-outline', label: 'Exam Center Reality Check', sub: 'Crowd insights from past students' },
];

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout, uploadAvatar, deleteAvatar, updateUser } = useAuthStore();
    const { dashboardData } = useExamStore();

    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(user?.full_name || '');
    const [savingName, setSavingName] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [clearingData, setClearingData] = useState(false);
    const [premiumExpanded, setPremiumExpanded] = useState(false);

    const fullName = user?.full_name || '';
    // Supabase stores phone in E.164 format (+91XXXXXXXXXX)
    // Strip +91 for display since we show '+91' as prefix already
    const email = user?.email || '';

    const isPremium = user?.is_premium || false;
    const avatarUrl = user?.avatar_url || null;

    const upcomingExams = dashboardData?.upcoming_exams || [];
    const pastCount = dashboardData?.past_exams?.length || 0;
    const nextExam = upcomingExams[0];

    const dailyLimit = isPremium ? 20 : 3;
    const parsesUsed = user?.daily_parse_count || 0;
    const parsesLeft = Math.max(0, dailyLimit - parsesUsed);
    const parsePercent = Math.min(100, (parsesUsed / dailyLimit) * 100);
    const limitReached = parsesLeft === 0;

    const togglePremium = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setPremiumExpanded(v => !v);
    };

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
        Alert.alert('Profile Photo', 'Choose an option', [
            { text: 'Take Photo', onPress: handleTakePhoto },
            { text: 'Choose from Library', onPress: handlePickImage },
            avatarUrl ? { text: 'Remove Photo', style: 'destructive', onPress: handleDeleteAvatar } : null,
            { text: 'Cancel', style: 'cancel' },
        ].filter(Boolean));
    };

    const handlePickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) { Alert.alert('Permission needed', 'Please allow photo access.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
        if (!result.canceled && result.assets[0]) await handleUploadAvatar(result.assets[0]);
    };

    const handleTakePhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { Alert.alert('Permission needed', 'Please allow camera access.'); return; }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
        if (!result.canceled && result.assets[0]) await handleUploadAvatar(result.assets[0]);
    };

    const handleUploadAvatar = async (asset) => {
        try {
            setUploadingAvatar(true);
            const result = await uploadAvatar({ uri: asset.uri, name: 'avatar.jpg', mimeType: 'image/jpeg' });
            if (!result.success) Alert.alert('Error', 'Failed to upload photo.');
        } catch { Alert.alert('Error', 'Failed to upload photo.'); }
        finally { setUploadingAvatar(false); }
    };

    const handleDeleteAvatar = async () => {
        try { setUploadingAvatar(true); await deleteAvatar(); }
        catch { Alert.alert('Error', 'Failed to remove photo.'); }
        finally { setUploadingAvatar(false); }
    };

    const handleClearOfflineData = async () => {
        Alert.alert('Clear Offline Data', 'Remove all saved exam data from this device?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear', style: 'destructive', onPress: async () => {
                    try { setClearingData(true); await offlineStorage.clearAll(); Alert.alert('Done', 'Offline data cleared.'); }
                    catch { Alert.alert('Error', 'Failed to clear data.'); }
                    finally { setClearingData(false); }
                },
            },
        ]);
    };

    const handleLogout = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out', style: 'destructive', onPress: async () => {
                    await logout();
                    router.replace('/(auth)');
                },
            },
        ]);
    };

    const getDaysColor = (days) => {
        if (days <= 3) return '#C41E3A';
        if (days <= 10) return '#FFB800';
        return '#00E676';
    };

    const getInitials = () => {
        if (!fullName) return '?';
        const parts = fullName.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0][0].toUpperCase();
    };

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#06060E" />
            <SafeAreaView style={styles.root} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                    {/* ─── HERO ─── */}
                    <View style={styles.hero}>
                        <TouchableOpacity style={styles.avatarWrap} onPress={handleAvatarPress} activeOpacity={0.88}>
                            {uploadingAvatar ? (
                                <View style={styles.avatarCircle}>
                                    <ActivityIndicator color="#C41E3A" size="small" />
                                </View>
                            ) : avatarUrl ? (
                                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                            ) : (
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarInitials}>{getInitials()}</Text>
                                </View>
                            )}
                            <View style={styles.cameraBadge}>
                                <Ionicons name="camera" size={9} color="#fff" />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.heroInfo}>
                            {editingName ? (
                                <View style={styles.nameEditRow}>
                                    <TextInput
                                        style={styles.nameInput}
                                        value={nameInput}
                                        onChangeText={setNameInput}
                                        autoFocus
                                        placeholder="Your name"
                                        placeholderTextColor="#2A2A40"
                                        returnKeyType="done"
                                        onSubmitEditing={handleSaveName}
                                        selectionColor="#C41E3A"
                                    />
                                    <TouchableOpacity style={styles.nameSaveBtn} onPress={handleSaveName} disabled={savingName}>
                                        {savingName ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={13} color="#fff" />}
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.nameCancelBtn} onPress={() => { setEditingName(false); setNameInput(user?.full_name || ''); }}>
                                        <Ionicons name="close" size={13} color="#72728A" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.nameRow} onPress={() => setEditingName(true)} activeOpacity={0.7}>
                                    <Text style={styles.heroName}>{fullName || 'Add your name'}</Text>
                                    <View style={styles.editPill}>
                                        <Ionicons name="pencil" size={9} color="#72728A" />
                                    </View>
                                </TouchableOpacity>
                            )}

                            <Text style={styles.heroPhone}>{email}</Text>

                            {isPremium && (
                                <View style={styles.premiumBadge}>
                                    <Text style={styles.premiumBadgeText}>✦ PREMIUM</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* thin separator */}
                    <View style={styles.heroDivider} />

                    {/* ─── UPCOMING EXAMS ─── */}
                    <View style={styles.section}>
                        <Text style={styles.label}>UPCOMING EXAMS</Text>

                        {upcomingExams.length === 0 ? (
                            <TouchableOpacity style={styles.emptyCard} onPress={() => router.push('/(tabs)/upload')} activeOpacity={0.8}>
                                <View style={styles.emptyIconBox}>
                                    <Ionicons name="add" size={18} color="#C41E3A" />
                                </View>
                                <Text style={styles.emptyCardText}>Upload your first admit card</Text>
                                <Ionicons name="chevron-forward" size={13} color="#2A2A40" />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.examList}>
                                {upcomingExams.map((exam) => {
                                    const days = exam.days_remaining;
                                    const accent = getDaysColor(days);
                                    const meta = [
                                        exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null,
                                        exam.reporting_time ? `${exam.reporting_time.slice(0, 5)}` : null,
                                        exam.center_city || null,
                                    ].filter(Boolean).join('  ·  ');

                                    return (
                                        <TouchableOpacity
                                            key={exam.id}
                                            style={styles.examCard}
                                            onPress={() => router.push(`/exam/${exam.id}`)}
                                            activeOpacity={0.82}
                                        >
                                            <View style={[styles.examBar, { backgroundColor: accent }]} />
                                            <View style={styles.examBody}>
                                                <Text style={styles.examName} numberOfLines={1}>{exam.exam_name}</Text>
                                                <Text style={styles.examMeta}>{meta}</Text>
                                            </View>
                                            <View style={styles.daysBox}>
                                                <Text style={[styles.daysNum, { color: accent }]}>{days}</Text>
                                                <Text style={[styles.daysLabel, { color: accent }]}>days</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={12} color="#2A2A40" />
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* ─── AI USAGE ─── */}
                    <View style={styles.section}>
                        <Text style={styles.label}>AI USAGE TODAY</Text>
                        <View style={styles.usageCard}>
                            <View style={styles.usageRow}>
                                <View style={[styles.usageIconBox, {
                                    backgroundColor: limitReached ? 'rgba(196,30,58,0.1)' : 'rgba(0,230,118,0.07)',
                                }]}>
                                    <Ionicons name="scan-outline" size={14} color={limitReached ? '#C41E3A' : '#00E676'} />
                                </View>
                                <View style={styles.usageText}>
                                    <Text style={styles.usageTitle}>Admit Card Parses</Text>
                                    <Text style={styles.usageSub}>
                                        {limitReached ? 'Daily limit reached · Resets at midnight' : `${parsesLeft} of ${dailyLimit} remaining today`}
                                    </Text>
                                </View>
                                <Text style={styles.usageCount}>
                                    <Text style={{ color: limitReached ? '#C41E3A' : '#E8E8F0', fontWeight: '800' }}>{parsesUsed}</Text>
                                    <Text style={{ color: '#2A2A40', fontWeight: '600' }}> / {dailyLimit}</Text>
                                </Text>
                            </View>
                            <View style={styles.usageTrack}>
                                <View style={[styles.usageFill, {
                                    width: `${parsePercent}%`,
                                    backgroundColor: limitReached ? '#C41E3A' : parsePercent > 66 ? '#FFB800' : '#00E676',
                                }]} />
                            </View>
                        </View>
                    </View>

                    {/* ─── ACCOUNT ─── */}
                    <View style={styles.section}>
                        <Text style={styles.label}>ACCOUNT</Text>
                        <View style={styles.menuCard}>
                            <View style={styles.menuRow}>
                                <View style={[styles.menuIcon, { backgroundColor: 'rgba(196,30,58,0.09)' }]}>
                                    <Ionicons name="mail-outline" size={14} color="#C41E3A" />
                                </View>
                                <View style={styles.menuText}>
                                    <Text style={styles.menuLabel}>Email</Text>
                                    <Text style={styles.menuValue}>{email}</Text>
                                </View>
                            </View>

                            <View style={styles.menuDiv} />

                            <View style={styles.menuRow}>
                                <View style={[styles.menuIcon, { backgroundColor: isPremium ? 'rgba(255,184,0,0.09)' : 'rgba(0,230,118,0.07)' }]}>
                                    <Ionicons name={isPremium ? 'star-outline' : 'shield-checkmark-outline'} size={14} color={isPremium ? '#FFB800' : '#00E676'} />
                                </View>
                                <View style={styles.menuText}>
                                    <Text style={styles.menuLabel}>Plan</Text>
                                    <Text style={styles.menuValue}>{isPremium ? '✦ Premium · 20 parses/day' : 'Free · 3 parses/day'}</Text>
                                </View>
                            </View>

                            <View style={styles.menuDiv} />

                            <TouchableOpacity style={styles.menuRow} onPress={handleClearOfflineData} disabled={clearingData} activeOpacity={0.8}>
                                <View style={[styles.menuIcon, { backgroundColor: 'rgba(77,159,255,0.07)' }]}>
                                    {clearingData
                                        ? <ActivityIndicator size="small" color="#4D9FFF" />
                                        : <Ionicons name="cloud-offline-outline" size={14} color="#4D9FFF" />
                                    }
                                </View>
                                <View style={styles.menuText}>
                                    <Text style={styles.menuLabel}>Offline Storage</Text>
                                    <Text style={styles.menuValue}>Clear saved exam data</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={12} color="#2A2A40" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ─── UPGRADE ─── */}
                    {!isPremium && (
                        <View style={styles.section}>
                            <Text style={styles.label}>UPGRADE</Text>
                            <View style={styles.upgradeCard}>
                                <View style={styles.glowBlob} />

                                {/* Header row */}
                                <View style={styles.upgradeHeader}>
                                    <View style={styles.upgradeHeaderLeft}>
                                        <Text style={styles.upgradeEyebrow}>GO PREMIUM</Text>
                                        <Text style={styles.upgradeTitle}>Unlock everything</Text>
                                    </View>
                                    <TouchableOpacity style={styles.infoBtn} onPress={togglePremium} activeOpacity={0.75}>
                                        <Ionicons
                                            name={premiumExpanded ? 'chevron-up' : 'information-circle-outline'}
                                            size={16}
                                            color="#72728A"
                                        />
                                    </TouchableOpacity>
                                </View>

                                {/* Perks — expand on info tap */}
                                {premiumExpanded && (
                                    <View style={styles.perksContainer}>
                                        <View style={styles.perksDivider} />
                                        {PREMIUM_PERKS.map((perk, i) => (
                                            <View key={i} style={styles.perkRow}>
                                                <View style={styles.perkIconBox}>
                                                    <Ionicons name={perk.icon} size={13} color="#C41E3A" />
                                                </View>
                                                <View style={styles.perkText}>
                                                    <Text style={styles.perkLabel}>{perk.label}</Text>
                                                    <Text style={styles.perkSub}>{perk.sub}</Text>
                                                </View>
                                                <Ionicons name="checkmark" size={12} color="#C41E3A" />
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* CTA */}
                                <TouchableOpacity style={styles.upgradeBtn} activeOpacity={0.88}>
                                    <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
                                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* ─── SIGN OUT ─── */}
                    <View style={styles.section}>
                        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.82}>
                            <View style={styles.signOutIconBox}>
                                <Ionicons name="log-out-outline" size={15} color="#C41E3A" />
                            </View>
                            <Text style={styles.signOutText}>Sign Out</Text>
                            <Ionicons name="chevron-forward" size={13} color="#2A2A40" style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.footer}>ExamPilot · v1.0.0</Text>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#06060E' },
    scroll: { paddingTop: 8 },

    // ── HERO ──
    hero: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
    },
    avatarWrap: { position: 'relative' },
    avatarCircle: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#0F0F1E',
        borderWidth: 1.5,
        borderColor: '#1A1A2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImg: {
        width: 68,
        height: 68,
        borderRadius: 34,
        borderWidth: 1.5,
        borderColor: '#1A1A2E',
    },
    avatarInitials: {
        fontSize: 22,
        fontWeight: '700',
        color: '#C41E3A',
        letterSpacing: 0.5,
    },
    cameraBadge: {
        position: 'absolute',
        bottom: -1,
        right: -1,
        width: 19,
        height: 19,
        borderRadius: 10,
        backgroundColor: '#141428',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#06060E',
    },
    heroInfo: { flex: 1, gap: 4 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    heroName: { fontSize: 21, fontWeight: '700', color: '#F0F0F8', letterSpacing: -0.4 },
    editPill: {
        width: 21,
        height: 21,
        borderRadius: 11,
        backgroundColor: '#0F0F1E',
        borderWidth: 1,
        borderColor: '#1A1A2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroPhone: { fontSize: 12, color: '#38384A', fontWeight: '500', letterSpacing: 0.2 },
    premiumBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,184,0,0.09)',
        borderRadius: 5,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: 'rgba(255,184,0,0.2)',
        marginTop: 2,
    },
    premiumBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFB800', letterSpacing: 1.5 },

    nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    nameInput: {
        flex: 1,
        fontSize: 17,
        fontWeight: '600',
        color: '#F0F0F8',
        borderBottomWidth: 1.5,
        borderBottomColor: '#C41E3A',
        paddingVertical: 3,
    },
    nameSaveBtn: {
        width: 27,
        height: 27,
        borderRadius: 8,
        backgroundColor: '#C41E3A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nameCancelBtn: {
        width: 27,
        height: 27,
        borderRadius: 8,
        backgroundColor: '#0F0F1E',
        borderWidth: 1,
        borderColor: '#1A1A2E',
        justifyContent: 'center',
        alignItems: 'center',
    },

    heroDivider: {
        height: 1,
        backgroundColor: '#0E0E1C',
        marginHorizontal: 24,
        marginBottom: 24,
    },

    // ── SECTION ──
    section: { paddingHorizontal: 24, marginBottom: 22 },
    label: {
        fontSize: 9,
        fontWeight: '700',
        color: '#252538',
        letterSpacing: 2.5,
        marginBottom: 10,
    },

    // ── EXAM CARDS ──
    examList: { gap: 7 },
    examCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0B0B17',
        borderRadius: 13,
        borderWidth: 1,
        borderColor: '#121224',
        paddingVertical: 13,
        paddingHorizontal: 13,
        gap: 11,
    },
    examBar: { width: 2.5, height: 32, borderRadius: 2 },
    examBody: { flex: 1, gap: 3 },
    examName: { fontSize: 12, fontWeight: '700', color: '#E0E0EC', letterSpacing: -0.1 },
    examMeta: { fontSize: 10, color: '#323244', fontWeight: '500' },
    daysBox: { alignItems: 'center', minWidth: 34 },
    daysNum: { fontSize: 19, fontWeight: '800', letterSpacing: -0.5, lineHeight: 22 },
    daysLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.4 },

    emptyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#0B0B17',
        borderRadius: 13,
        borderWidth: 1,
        borderColor: '#121224',
        borderStyle: 'dashed',
        padding: 15,
    },
    emptyIconBox: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: 'rgba(196,30,58,0.09)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyCardText: { flex: 1, fontSize: 12, color: '#72728A', fontWeight: '500' },

    // ── USAGE ──
    usageCard: {
        backgroundColor: '#0B0B17',
        borderRadius: 13,
        borderWidth: 1,
        borderColor: '#121224',
        padding: 15,
        gap: 11,
    },
    usageRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    usageIconBox: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    usageText: { flex: 1 },
    usageTitle: { fontSize: 12, fontWeight: '600', color: '#E0E0EC', marginBottom: 2 },
    usageSub: { fontSize: 10, color: '#323244', fontWeight: '500' },
    usageCount: { fontSize: 13 },
    usageTrack: {
        height: 2.5,
        backgroundColor: '#121224',
        borderRadius: 2,
        overflow: 'hidden',
    },
    usageFill: { height: 2.5, borderRadius: 2 },

    // ── MENU CARD ──
    menuCard: {
        backgroundColor: '#0B0B17',
        borderRadius: 13,
        borderWidth: 1,
        borderColor: '#121224',
        overflow: 'hidden',
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 13,
        gap: 11,
    },
    menuDiv: { height: 1, backgroundColor: '#0E0E1A', marginHorizontal: 13 },
    menuIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuText: { flex: 1 },
    menuLabel: { fontSize: 9, color: '#323244', fontWeight: '600', letterSpacing: 0.4, marginBottom: 2 },
    menuValue: { fontSize: 12, color: '#E0E0EC', fontWeight: '600' },

    // ── UPGRADE ──
    upgradeCard: {
        backgroundColor: '#0B0B17',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#1A0E18',
        padding: 18,
        gap: 14,
        overflow: 'hidden',
        position: 'relative',
    },
    glowBlob: {
        position: 'absolute',
        top: -30,
        left: -30,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(196,30,58,0.05)',
    },
    upgradeHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    upgradeHeaderLeft: { gap: 3 },
    upgradeEyebrow: { fontSize: 9, fontWeight: '700', color: '#C41E3A', letterSpacing: 2 },
    upgradeTitle: { fontSize: 18, fontWeight: '800', color: '#F0F0F8', letterSpacing: -0.4 },
    infoBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: '#0F0F1E',
        borderWidth: 1,
        borderColor: '#1A1A2E',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Perks
    perksContainer: { gap: 10 },
    perksDivider: { height: 1, backgroundColor: '#121224', marginBottom: 2 },
    perkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    perkIconBox: {
        width: 26,
        height: 26,
        borderRadius: 7,
        backgroundColor: 'rgba(196,30,58,0.09)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    perkText: { flex: 1 },
    perkLabel: { fontSize: 12, fontWeight: '600', color: '#D0D0E0', marginBottom: 1 },
    perkSub: { fontSize: 10, color: '#323244', fontWeight: '500' },

    // CTA
    upgradeBtn: {
        backgroundColor: '#C41E3A',
        borderRadius: 10,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
    },
    upgradeBtnText: { fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },

    // ── SIGN OUT ──
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#0B0B17',
        borderRadius: 13,
        borderWidth: 1,
        borderColor: '#1A0E0E',
        paddingVertical: 14,
        paddingHorizontal: 14,
    },
    signOutIconBox: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: 'rgba(196,30,58,0.09)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signOutText: { fontSize: 13, fontWeight: '600', color: '#C41E3A', letterSpacing: 0.1 },

    // ── FOOTER ──
    footer: {
        textAlign: 'center',
        fontSize: 10,
        color: '#181826',
        fontWeight: '600',
        letterSpacing: 1,
        paddingBottom: 8,
    },
});