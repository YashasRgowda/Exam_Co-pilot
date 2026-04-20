import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Linking,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import useExamStore from '../../store/examStore';

const { width } = Dimensions.get('window');
const TILE_W = (width - 40 - 20) / 3;

// Compute days locally as fallback — normalized to midnight, no drift
const computeDays = (examDate) => {
    if (!examDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(examDate);
    exam.setHours(0, 0, 0, 0);
    return Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
};

export default function ExamDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const {
        fetchExamDashboard,
        currentExam,
        currentChecklist,
        isLoading,
        isOffline,
        navigationData,
        navigationLoading,
        navigationError,
        fetchDirections,
        clearNavigation,
    } = useExamStore();

    useEffect(() => {
        if (id) fetchExamDashboard(id);
        return () => clearNavigation();
    }, [id]);

    const handleGetDirections = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') { alert('Location permission needed.'); return; }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            await fetchDirections(id, loc.coords.latitude, loc.coords.longitude);
        } catch { alert('Could not get location. Please try again.'); }
    };

    const openLink = (url) => { if (url) Linking.openURL(url); };

    if (isLoading || !currentExam) {
        return (
            <View style={styles.loadingScreen}>
                <StatusBar barStyle="light-content" />
                <ActivityIndicator color="#C41E3A" size="small" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    // days_remaining: from store (backend) OR computed locally as fallback
    const daysLeft = currentExam.days_remaining ?? computeDays(currentExam.exam_date);

    const getAccent = () => {
        if (daysLeft === null || daysLeft === undefined) return '#72728A';
        if (daysLeft <= 0) return '#C41E3A';
        if (daysLeft <= 3) return '#C41E3A';
        if (daysLeft <= 7) return '#FFB800';
        return '#00E676';
    };
    const accent = getAccent();

    const checkedCount = currentChecklist.filter(i => i.is_checked).length;
    const totalCount = currentChecklist.length;
    const progressPercent = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;
    const allDone = checkedCount === totalCount && totalCount > 0;
    const nav = navigationData?.navigation;
    const links = navigationData?.links;

    const daysDisplay = daysLeft !== null && daysLeft !== undefined
        ? String(Math.max(0, daysLeft))
        : '—';

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#06060E" />
            <SafeAreaView style={styles.root} edges={['top']}>

                {/* TOP NAV */}
                <View style={styles.topNav}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={16} color="#E0E0EC" />
                    </TouchableOpacity>
                    {isOffline && (
                        <View style={styles.offlinePill}>
                            <Ionicons name="cloud-offline-outline" size={11} color="#FFB800" />
                            <Text style={styles.offlinePillText}>Offline</Text>
                        </View>
                    )}
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* ── EXAM NAME ── */}
                    <View style={styles.heroWrap}>
                        <Text style={styles.heroExamName}>{currentExam.exam_name}</Text>

                        {/* ── HERO CARD ── */}
                        <View style={styles.heroCard}>

                            {/* Left — days number */}
                            <View style={styles.heroLeft}>
                                <Text style={[styles.heroDaysNum, { color: accent }]}>
                                    {daysDisplay}
                                </Text>
                                <Text style={[styles.heroDaysWord, { color: accent }]}>
                                    {daysLeft === 0 ? 'TODAY' : daysLeft === 1 ? 'DAY LEFT' : 'DAYS LEFT'}
                                </Text>

                            </View>

                            {/* Divider */}
                            <View style={styles.heroCardDivider} />

                            {/* Right — timings */}
                            <View style={styles.heroRight}>
                                <View style={styles.heroTimeItem}>
                                    <Text style={styles.heroTimeKey}>Date</Text>
                                    <Text style={styles.heroTimeVal}>
                                        {currentExam.exam_date
                                            ? new Date(currentExam.exam_date).toLocaleDateString('en-IN', {
                                                day: 'numeric', month: 'short', year: 'numeric'
                                            })
                                            : '—'}
                                    </Text>
                                </View>
                                <View style={styles.heroTimeSep} />
                                <View style={styles.heroTimeItem}>
                                    <Text style={styles.heroTimeKey}>Start Time</Text>
                                    <Text style={styles.heroTimeVal}>
                                        {currentExam.reporting_time?.slice(0, 5) ?? '—'}
                                    </Text>
                                </View>
                                <View style={styles.heroTimeSep} />
                                <View style={styles.heroTimeItem}>
                                    <Text style={styles.heroTimeKey}>End Time</Text>
                                    <Text style={styles.heroTimeVal}>
                                        {currentExam.gate_closing_time?.slice(0, 5) ?? '—'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* ── ROLL NUMBER ── */}
                    <View style={styles.rollCard}>
                        <View>
                            <Text style={styles.rollKey}>Roll Number</Text>
                            <Text style={styles.rollVal}>{currentExam.roll_number ?? '—'}</Text>
                        </View>
                        <View style={styles.rollIconBox}>
                            <Ionicons name="barcode-outline" size={20} color="#52526A" />
                        </View>
                    </View>

                    {/* ── EXAM CENTER ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>EXAM CENTER</Text>
                        <View style={styles.card}>
                            <Text style={styles.centerName}>{currentExam.center_name ?? '—'}</Text>
                            <View style={styles.centerCityRow}>
                                <Ionicons name="location-outline" size={13} color="#C41E3A" />
                                <Text style={styles.centerCity}>{currentExam.center_city ?? '—'}</Text>
                            </View>
                            {currentExam.center_address && (
                                <Text style={styles.centerAddress}>{currentExam.center_address}</Text>
                            )}
                            <TouchableOpacity
                                style={styles.mapsBtn}
                                onPress={() => openLink(
                                    links?.google_maps ||
                                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                        (currentExam.center_address || '') + ' ' + (currentExam.center_city || '')
                                    )}`
                                )}
                                activeOpacity={0.88}
                            >
                                <Ionicons name="map-outline" size={14} color="#fff" />
                                <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
                                <Ionicons name="arrow-forward" size={13} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ── GET THERE ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>GET THERE</Text>

                        {nav && (
                            <View style={styles.navStatsCard}>
                                {[
                                    { label: 'DISTANCE', val: nav.distance, color: '#E8E8F0' },
                                    { label: 'DRIVE TIME', val: nav.duration, color: '#00E676' },
                                    { label: 'W/ TRAFFIC', val: nav.duration_in_traffic, color: '#FFB800' },
                                ].map((s, i, arr) => (
                                    <View key={i} style={{ flex: 1, flexDirection: 'row' }}>
                                        <View style={styles.navStatItem}>
                                            <Text style={[styles.navStatVal, { color: s.color }]}>{s.val}</Text>
                                            <Text style={styles.navStatKey}>{s.label}</Text>
                                        </View>
                                        {i < arr.length - 1 && <View style={styles.navStatSep} />}
                                    </View>
                                ))}
                            </View>
                        )}

                        {navigationError && (
                            <View style={styles.navError}>
                                <Ionicons name="warning-outline" size={13} color="#FFB800" />
                                <Text style={styles.navErrorText}>{navigationError}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.directionsBtn}
                            onPress={() => nav ? openLink(links?.google_maps) : handleGetDirections()}
                            activeOpacity={0.88}
                        >
                            <View style={styles.dirBtnIcon}>
                                {navigationLoading
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Ionicons name="navigate" size={19} color="#fff" />
                                }
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.dirBtnTitle}>
                                    {navigationLoading ? 'Getting directions...'
                                        : nav ? 'Open in Google Maps'
                                            : 'Get Directions'}
                                </Text>
                                <Text style={styles.dirBtnSub}>
                                    {navigationLoading ? 'Using your GPS'
                                        : nav ? `${nav.distance} · ${nav.duration_in_traffic} with traffic`
                                            : `To ${currentExam.center_city ?? 'exam center'} · Tap for live ETA`}
                                </Text>
                            </View>
                            {!navigationLoading && (
                                <Ionicons name="chevron-forward" size={14} color="#38384A" />
                            )}
                        </TouchableOpacity>

                        <View style={styles.cabRow}>
                            {[
                                { label: 'Uber', icon: 'car-outline', color: '#4D9FFF', bg: 'rgba(77,159,255,0.1)', url: links?.uber || 'https://m.uber.com/ul/' },
                                { label: 'Ola', icon: 'car-sport-outline', color: '#00E676', bg: 'rgba(0,230,118,0.1)', url: links?.ola || 'https://book.olacabs.com/' },
                                { label: 'Rapido', icon: 'bicycle-outline', color: '#FFB800', bg: 'rgba(255,184,0,0.1)', url: links?.rapido || 'https://rapido.bike/' },
                            ].map((cab) => (
                                <TouchableOpacity key={cab.label} style={styles.cabBtn} onPress={() => openLink(cab.url)} activeOpacity={0.85}>
                                    <View style={[styles.cabIcon, { backgroundColor: cab.bg }]}>
                                        <Ionicons name={cab.icon} size={19} color={cab.color} />
                                    </View>
                                    <Text style={styles.cabLabel}>{cab.label}</Text>
                                    {links && <View style={[styles.cabDot, { backgroundColor: cab.color }]} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* ── CHECKLIST PREVIEW ── */}
                    {totalCount > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>CHECKLIST</Text>
                            <TouchableOpacity style={styles.checklistCard} onPress={() => router.push(`/exam/checklist/${id}`)} activeOpacity={0.85}>
                                <View style={styles.checklistLeft}>
                                    <Text style={[styles.checklistBigNum, { color: allDone ? '#00E676' : '#F0F0F8' }]}>
                                        {checkedCount}
                                    </Text>
                                    <View style={styles.checklistDivLine} />
                                    <Text style={styles.checklistSmallNum}>{totalCount}</Text>
                                </View>
                                <View style={{ flex: 1, gap: 8 }}>
                                    <Text style={styles.checklistStatus}>
                                        {allDone ? 'All items packed ✓' : `${totalCount - checkedCount} of ${totalCount} items left`}
                                    </Text>
                                    <View style={styles.checklistBar}>
                                        <View style={[styles.checklistBarFill, {
                                            width: `${progressPercent}%`,
                                            backgroundColor: allDone ? '#00E676' : '#C41E3A',
                                        }]} />
                                    </View>
                                    <Text style={styles.checklistCta}>Open full checklist →</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── NOT ALLOWED ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>NOT ALLOWED IN HALL</Text>
                        <View style={styles.notAllowedGrid}>
                            {[
                                { icon: 'phone-portrait-outline', label: 'Mobile' },
                                { icon: 'watch-outline', label: 'Smartwatch' },
                                { icon: 'calculator-outline', label: 'Calculator' },
                                { icon: 'bluetooth-outline', label: 'Bluetooth' },
                                { icon: 'bag-outline', label: 'Bags' },
                                { icon: 'document-outline', label: 'Loose Papers' },
                            ].map((item) => (
                                <View key={item.label} style={styles.notAllowedTile}>
                                    <View style={styles.notAllowedIconBox}>
                                        <Ionicons name={item.icon} size={18} color="#C41E3A" />
                                    </View>
                                    <Text style={styles.notAllowedLabel}>{item.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={{ height: 48 }} />
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#06060E' },
    loadingScreen: { flex: 1, backgroundColor: '#06060E', justifyContent: 'center', alignItems: 'center', gap: 10 },
    loadingText: { fontSize: 13, color: '#38384A', fontWeight: '500' },

    topNav: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#0F0F1E', borderWidth: 1, borderColor: '#1A1A2E',
        justifyContent: 'center', alignItems: 'center',
    },
    offlinePill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(255,184,0,0.08)', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
        borderWidth: 1, borderColor: 'rgba(255,184,0,0.2)',
    },
    offlinePillText: { fontSize: 10, color: '#FFB800', fontWeight: '600' },

    // ── HERO ──
    heroWrap: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20, gap: 16 },
    heroExamName: {
        fontSize: 22, fontWeight: '800', color: '#F5F5FA',
        letterSpacing: -0.5, lineHeight: 28,
    },
    heroCard: {
        flexDirection: 'row', backgroundColor: '#0C0C1A',
        borderRadius: 18, borderWidth: 1, borderColor: '#1A1A2E',
        overflow: 'hidden', minHeight: 170,
    },
    heroLeft: {
        flex: 1, padding: 18, justifyContent: 'center', gap: 6,
    },
    heroDaysNum: {
        fontSize: 64, fontWeight: '900', letterSpacing: -3, lineHeight: 68,
    },
    heroDaysWord: {
        fontSize: 10, fontWeight: '800', letterSpacing: 1.5,
    },
    urgencyChip: {
        alignSelf: 'flex-start', borderRadius: 5, borderWidth: 1,
        paddingHorizontal: 7, paddingVertical: 3, marginTop: 4,
    },
    urgencyText: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
    heroCardDivider: { width: 1, backgroundColor: '#1A1A2E' },
    heroRight: { flex: 1.1, padding: 16, justifyContent: 'center' },
    heroTimeItem: { paddingVertical: 10, gap: 3 },
    heroTimeSep: { height: 1, backgroundColor: '#141428' },
    heroTimeKey: { fontSize: 10, color: '#38384A', fontWeight: '600', letterSpacing: 0.3 },
    heroTimeVal: { fontSize: 15, fontWeight: '700', color: '#E8E8F0', letterSpacing: -0.2 },

    // ── ROLL ──
    rollCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginHorizontal: 20, marginBottom: 20,
        backgroundColor: '#0C0C1A', borderRadius: 14, borderWidth: 1, borderColor: '#1A1A2E',
        paddingVertical: 14, paddingHorizontal: 18,
    },
    rollKey: { fontSize: 10, color: '#38384A', fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
    rollVal: { fontSize: 17, fontWeight: '700', color: '#E8E8F0', letterSpacing: 0.5 },
    rollIconBox: {
        width: 36, height: 36, borderRadius: 10, backgroundColor: '#141428',
        justifyContent: 'center', alignItems: 'center',
    },

    // ── SECTIONS ──
    section: { paddingHorizontal: 20, marginBottom: 22 },
    sectionLabel: { fontSize: 9, fontWeight: '700', color: '#38384A', letterSpacing: 2.5, marginBottom: 10 },

    // ── CARDS ──
    card: {
        backgroundColor: '#0C0C1A', borderRadius: 16,
        borderWidth: 1, borderColor: '#1A1A2E', padding: 18, gap: 10,
    },
    centerName: { fontSize: 16, fontWeight: '700', color: '#F0F0F8', letterSpacing: -0.3, lineHeight: 22 },
    centerCityRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    centerCity: { fontSize: 13, color: '#72728A', fontWeight: '500' },
    centerAddress: { fontSize: 12, color: '#38384A', fontWeight: '500', lineHeight: 18 },
    mapsBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#C41E3A', borderRadius: 10,
        paddingVertical: 12, paddingHorizontal: 16, marginTop: 4,
    },
    mapsBtnText: { fontSize: 13, fontWeight: '700', color: '#fff', flex: 1 },

    // ── NAV ──
    navStatsCard: {
        flexDirection: 'row', backgroundColor: '#0C0C1A',
        borderRadius: 14, borderWidth: 1, borderColor: '#1A1A2E',
        paddingVertical: 16, marginBottom: 10,
    },
    navStatItem: { flex: 1, alignItems: 'center', gap: 5 },
    navStatVal: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
    navStatKey: { fontSize: 8, fontWeight: '700', color: '#323244', letterSpacing: 1, textAlign: 'center' },
    navStatSep: { width: 1, backgroundColor: '#1A1A2E' },
    navError: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(255,184,0,0.06)', borderRadius: 10, padding: 12,
        borderWidth: 1, borderColor: 'rgba(255,184,0,0.15)', marginBottom: 10,
    },
    navErrorText: { fontSize: 11, color: '#FFB800', flex: 1, fontWeight: '500' },
    directionsBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: '#0C0C1A', borderRadius: 14, borderWidth: 1, borderColor: '#1A1A2E',
        padding: 14, marginBottom: 10,
    },
    dirBtnIcon: {
        width: 44, height: 44, borderRadius: 12, backgroundColor: '#C41E3A',
        justifyContent: 'center', alignItems: 'center',
    },
    dirBtnTitle: { fontSize: 14, fontWeight: '700', color: '#E8E8F0', marginBottom: 2 },
    dirBtnSub: { fontSize: 11, color: '#52526A', fontWeight: '500' },
    cabRow: { flexDirection: 'row', gap: 10 },
    cabBtn: {
        flex: 1, backgroundColor: '#0C0C1A', borderRadius: 13,
        borderWidth: 1, borderColor: '#1A1A2E',
        paddingVertical: 14, alignItems: 'center', gap: 8, position: 'relative',
    },
    cabIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cabLabel: { fontSize: 12, fontWeight: '600', color: '#C8C8D8' },
    cabDot: { position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3 },

    // ── CHECKLIST ──
    checklistCard: {
        flexDirection: 'row', alignItems: 'center', gap: 20,
        backgroundColor: '#0C0C1A', borderRadius: 14, borderWidth: 1, borderColor: '#1A1A2E', padding: 18,
    },
    checklistLeft: { alignItems: 'center', gap: 4 },
    checklistBigNum: { fontSize: 32, fontWeight: '900', letterSpacing: -1, lineHeight: 36 },
    checklistDivLine: { width: 22, height: 1.5, backgroundColor: '#38384A', borderRadius: 1 },
    checklistSmallNum: { fontSize: 15, fontWeight: '600', color: '#52526A' },
    checklistStatus: { fontSize: 13, fontWeight: '600', color: '#C8C8D8', lineHeight: 18 },
    checklistBar: { height: 3, backgroundColor: '#1A1A2E', borderRadius: 2, overflow: 'hidden' },
    checklistBarFill: { height: 3, borderRadius: 2 },
    checklistCta: { fontSize: 11, fontWeight: '700', color: '#C41E3A' },

    // ── NOT ALLOWED ──
    notAllowedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    notAllowedTile: {
        width: TILE_W, backgroundColor: '#0C0C1A',
        borderRadius: 14, borderWidth: 1, borderColor: '#1A1A2E',
        paddingVertical: 16, alignItems: 'center', gap: 10,
    },
    notAllowedIconBox: {
        width: 38, height: 38, borderRadius: 11,
        backgroundColor: 'rgba(196,30,58,0.1)',
        justifyContent: 'center', alignItems: 'center',
    },
    notAllowedLabel: { fontSize: 11, fontWeight: '600', color: '#72728A', textAlign: 'center' },
});