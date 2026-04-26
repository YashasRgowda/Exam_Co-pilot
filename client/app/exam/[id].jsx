// ─────────────────────────────────────────────────────────────
// exam/[id].jsx
// Exam Detail Screen — shows full details of a single exam
// Includes: hero card, sessions timeline, center, navigation,
// checklist preview, not-allowed items
// ─────────────────────────────────────────────────────────────

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
    Alert,
} from 'react-native';
import { useEffect, useRef, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import useExamStore from '../../store/examStore';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const { width } = Dimensions.get('window');
const TILE_W = (width - 40 - 20) / 3;

// ─────────────────────────────────────────────────────────────
// PURE HELPER FUNCTIONS
// No hooks, no side effects — just data formatting
// ─────────────────────────────────────────────────────────────

/**
 * Computes how many days until a given date.
 * Returns negative if date is in the past.
 */
const computeDays = (examDate) => {
    if (!examDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(examDate);
    exam.setHours(0, 0, 0, 0);
    return Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
};

/**
 * Formats a date string like "2026-04-27" → "27 Apr 2026"
 */
const formatSessionDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

/**
 * Formats a time string like "10:30:00" → "10:30"
 */
const formatTime = (t) => {
    if (!t) return '—';
    return t.slice(0, 5);
};

/**
 * Returns the status of a session based on current time.
 * - 'past'     → session end time has already passed
 * - 'next'     → this is the next upcoming session
 * - 'upcoming' → future session after the next one
 */
const getSessionStatus = (session, nextSession) => {
    if (!session.exam_date || !session.end_time) return 'upcoming';

    const now = new Date();
    const [endHour, endMin] = session.end_time.split(':');
    const sessionEnd = new Date(session.exam_date);
    sessionEnd.setHours(parseInt(endHour), parseInt(endMin), 0, 0);

    // Session is completely over
    if (sessionEnd < now) return 'past';

    // This is the next session backend identified
    if (
        nextSession &&
        session.session_number === nextSession.session_number &&
        session.exam_date === nextSession.exam_date
    ) return 'next';

    return 'upcoming';
};

/**
 * Returns accent color based on session status
 */
const getSessionAccent = (status) => {
    if (status === 'past') return '#38384A';
    if (status === 'next') return '#C41E3A';
    return '#4D9FFF';
};

/**
 * Returns accent color based on days remaining
 */
const getDaysAccent = (days) => {
    if (days === null || days === undefined) return '#72728A';
    if (days < 0) return '#38384A';   // grey for past exams
    if (days === 0) return '#C41E3A'; // red for today
    if (days <= 3) return '#C41E3A';  // red for very soon
    if (days <= 7) return '#FFB800';  // amber for this week
    return '#00E676';                  // green for far future
};

/**
 * Returns label text for days remaining
 */
const getDaysWord = (days) => {
    if (days === null || days === undefined) return 'DAYS LEFT';
    if (days < 0) return 'EXAM OVER';
    if (days === 0) return 'TODAY';
    if (days === 1) return 'DAY LEFT';
    return 'DAYS LEFT';
};


// ─────────────────────────────────────────────────────────────
// MAIN SCREEN COMPONENT
// ─────────────────────────────────────────────────────────────

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

    // ── HOOKS — all declared at top before any early returns ──

    /**
     * Initial data fetch when screen mounts.
     * Clears navigation data when leaving screen.
     */
    useEffect(() => {
        if (id) fetchExamDashboard(id);
        return () => clearNavigation();
    }, [id]);

    /**
     * Auto-refresh every 60 seconds while screen is focused.
     * This ensures session status (NEXT/DONE) updates live
     * without the student needing to navigate away and back.
     * Interval is cleared when screen loses focus.
     */
    const intervalRef = useRef(null);

    useFocusEffect(
        useCallback(() => {
            intervalRef.current = setInterval(() => {
                if (id) fetchExamDashboard(id);
            }, 60000);

            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        }, [id])
    );

    // ── EARLY RETURN — show loader while data is fetching ──

    if (isLoading || !currentExam) {
        return (
            <View style={styles.loadingScreen}>
                <StatusBar barStyle="light-content" />
                <ActivityIndicator color="#C41E3A" size="small" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    // ── DERIVED DATA — computed from currentExam ──

    const sessions = currentExam.sessions || [];
    const nextSession = currentExam.next_session || null;

    // days remaining is based on next session date, not exam_date
    const daysLeft = nextSession
        ? computeDays(nextSession.exam_date)
        : currentExam.days_remaining ?? computeDays(currentExam.exam_date);

    const accent = getDaysAccent(daysLeft);
    const daysDisplay = daysLeft !== null
        ? daysLeft < 0
            ? 'DONE'
            : String(daysLeft)
        : '—';

    // Checklist stats for the preview card
    const checkedCount = currentChecklist.filter(i => i.is_checked).length;
    const totalCount = currentChecklist.length;
    const progressPercent = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;
    const allDone = checkedCount === totalCount && totalCount > 0;

    // Navigation data shortcuts
    const nav = navigationData?.navigation;
    const links = navigationData?.links;

    // ── EVENT HANDLERS ──

    const handleGetDirections = async () => {
        try {
            // Check current permission status first
            const { status: existingStatus } = await Location.getForegroundPermissionsAsync();

            let finalStatus = existingStatus;

            // Only request if not yet determined
            if (existingStatus === 'undetermined') {
                const { status } = await Location.requestForegroundPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                // Permission denied — show alert with settings option
                Alert.alert(
                    'Location Permission Needed',
                    'Please enable location access in Settings to get directions to your exam center.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Open Settings',
                            onPress: () => Linking.openSettings(),
                        },
                    ]
                );
                return;
            }

            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            await fetchDirections(id, loc.coords.latitude, loc.coords.longitude);

        } catch (e) {
            alert('Could not get location. Please try again.');
        }
    };

    const openLink = (url) => {
        if (url) Linking.openURL(url);
    };

    // ─────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#06060E" />
            <SafeAreaView style={styles.root} edges={['top']}>

                {/* ── TOP NAV BAR ── */}
                <View style={styles.topNav}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.back()}
                    >
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

                    {/* ────────────────────────────────────────
                        SECTION 1: HERO — Exam name + countdown
                        Shows next session details prominently
                    ──────────────────────────────────────── */}
                    <View style={styles.heroWrap}>

                        {/* Exam name */}
                        <Text style={styles.heroExamName}>
                            {currentExam.exam_name}
                        </Text>

                        {/* Hero card — days countdown + next session info */}
                        <View style={styles.heroCard}>

                            {/* Left side — big days number */}
                            <View style={styles.heroLeft}>
                                <Text style={[
                                    styles.heroDaysNum,
                                    { color: accent },
                                    daysDisplay === 'DONE' && { fontSize: 32, letterSpacing: -1, lineHeight: 36 },
                                ]}>
                                    {daysDisplay}
                                </Text>
                                <Text style={[styles.heroDaysWord, { color: accent }]}>
                                    {getDaysWord(daysLeft)}
                                </Text>
                                {/* Session count badge — only for multi-session exams */}
                                {sessions.length > 1 && (
                                    <View style={styles.sessionCountChip}>
                                        <Text style={styles.sessionCountText}>
                                            {sessions.length} sessions
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Vertical divider */}
                            <View style={styles.heroCardDivider} />

                            {/* Right side — next session details */}
                            <View style={styles.heroRight}>
                                {nextSession ? (
                                    // Show next session info
                                    <>
                                        <View style={styles.heroTimeItem}>
                                            <Text style={styles.heroTimeKey}>DATE</Text>
                                            <Text style={styles.heroTimeVal}>
                                                {formatSessionDate(nextSession.exam_date)}
                                            </Text>
                                        </View>
                                        <View style={styles.heroTimeSep} />

                                        {/* Subject name — only shown for multi-subject exams */}
                                        {nextSession.subject_name && (
                                            <>
                                                <View style={styles.heroTimeItem}>
                                                    <Text style={styles.heroTimeKey}>SUBJECT</Text>
                                                    <Text style={styles.heroTimeVal}>
                                                        {nextSession.subject_name}
                                                    </Text>
                                                </View>
                                                <View style={styles.heroTimeSep} />
                                            </>
                                        )}

                                        <View style={styles.heroTimeItem}>
                                            <Text style={styles.heroTimeKey}>START</Text>
                                            <Text style={styles.heroTimeVal}>
                                                {formatTime(nextSession.start_time)}
                                            </Text>
                                        </View>
                                        <View style={styles.heroTimeSep} />

                                        <View style={styles.heroTimeItem}>
                                            <Text style={styles.heroTimeKey}>END</Text>
                                            <Text style={styles.heroTimeVal}>
                                                {formatTime(nextSession.end_time)}
                                            </Text>
                                        </View>
                                    </>
                                ) : (
                                    // Fallback when no session data
                                    <>
                                        <View style={styles.heroTimeItem}>
                                            <Text style={styles.heroTimeKey}>DATE</Text>
                                            <Text style={styles.heroTimeVal}>
                                                {formatSessionDate(currentExam.exam_date)}
                                            </Text>
                                        </View>
                                        <View style={styles.heroTimeSep} />
                                        <View style={styles.heroTimeItem}>
                                            <Text style={styles.heroTimeKey}>START</Text>
                                            <Text style={styles.heroTimeVal}>—</Text>
                                        </View>
                                        <View style={styles.heroTimeSep} />
                                        <View style={styles.heroTimeItem}>
                                            <Text style={styles.heroTimeKey}>END</Text>
                                            <Text style={styles.heroTimeVal}>—</Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* ────────────────────────────────────────
                        SECTION 2: EXAM SCHEDULE
                        Full sessions timeline with status badges
                        DONE = grey, NEXT = red, UPCOMING = blue
                    ──────────────────────────────────────── */}
                    {sessions.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>EXAM SCHEDULE</Text>
                            <View style={styles.sessionsCard}>
                                {sessions.map((session, index) => {
                                    const status = getSessionStatus(session, nextSession);
                                    const sessionAccent = getSessionAccent(status);
                                    const isPast = status === 'past';
                                    const isNext = status === 'next';

                                    return (
                                        <View key={session.id || index}>
                                            <View style={[
                                                styles.sessionRow,
                                                isNext && styles.sessionRowNext,
                                            ]}>
                                                {/* Colored left bar — indicates status */}
                                                <View style={[
                                                    styles.sessionBar,
                                                    { backgroundColor: sessionAccent },
                                                ]} />

                                                {/* Subject name + date */}
                                                <View style={styles.sessionInfo}>
                                                    <View style={styles.sessionTopRow}>
                                                        <Text style={[
                                                            styles.sessionSubject,
                                                            isPast && styles.sessionSubjectPast,
                                                        ]}>
                                                            {session.subject_name || `Session ${session.session_number}`}
                                                        </Text>

                                                        {/* Status badge */}
                                                        {isNext && (
                                                            <View style={styles.nextBadge}>
                                                                <Text style={styles.nextBadgeText}>NEXT</Text>
                                                            </View>
                                                        )}
                                                        {isPast && (
                                                            <View style={styles.doneBadge}>
                                                                <Text style={styles.doneBadgeText}>DONE</Text>
                                                            </View>
                                                        )}
                                                    </View>

                                                    <Text style={[
                                                        styles.sessionDateText,
                                                        isPast && { color: '#38384A' },
                                                    ]}>
                                                        {formatSessionDate(session.exam_date)}
                                                    </Text>
                                                </View>

                                                {/* Start → End time */}
                                                <View style={styles.sessionTime}>
                                                    <Text style={[
                                                        styles.sessionTimeText,
                                                        { color: isPast ? '#38384A' : sessionAccent },
                                                    ]}>
                                                        {formatTime(session.start_time)}
                                                    </Text>
                                                    <Text style={styles.sessionTimeSep}>→</Text>
                                                    <Text style={[
                                                        styles.sessionTimeText,
                                                        { color: isPast ? '#38384A' : sessionAccent },
                                                    ]}>
                                                        {formatTime(session.end_time)}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Divider between sessions — not after last */}
                                            {index < sessions.length - 1 && (
                                                <View style={styles.sessionDiv} />
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* ────────────────────────────────────────
                        SECTION 3: ROLL NUMBER
                    ──────────────────────────────────────── */}
                    <View style={styles.rollCard}>
                        <View>
                            <Text style={styles.rollKey}>Roll Number</Text>
                            <Text style={styles.rollVal}>
                                {currentExam.roll_number ?? '—'}
                            </Text>
                        </View>
                        <View style={styles.rollIconBox}>
                            <Ionicons name="barcode-outline" size={20} color="#52526A" />
                        </View>
                    </View>

                    {/* ────────────────────────────────────────
                        SECTION 4: EXAM CENTER
                        Address + Google Maps button
                    ──────────────────────────────────────── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>EXAM CENTER</Text>
                        <View style={styles.card}>
                            <Text style={styles.centerName}>
                                {currentExam.center_name ?? '—'}
                            </Text>

                            <View style={styles.centerCityRow}>
                                <Ionicons name="location-outline" size={13} color="#C41E3A" />
                                <Text style={styles.centerCity}>
                                    {currentExam.center_city ?? '—'}
                                </Text>
                            </View>

                            {currentExam.center_address && (
                                <Text style={styles.centerAddress}>
                                    {currentExam.center_address}
                                </Text>
                            )}

                            <TouchableOpacity
                                style={styles.mapsBtn}
                                onPress={() => openLink(
                                    links?.google_maps ||
                                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                        `${currentExam.center_address || ''} ${currentExam.center_city || ''}`
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

                    {/* ────────────────────────────────────────
                        SECTION 5: GET THERE
                        Distance, duration + cab deep links
                        Navigation data fetched via GPS on tap
                    ──────────────────────────────────────── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>GET THERE</Text>

                        {/* Navigation stats — shown after directions fetched */}
                        {nav && (
                            <View style={styles.navStatsCard}>
                                {[
                                    { label: 'DISTANCE', val: nav.distance, color: '#E8E8F0' },
                                    { label: 'DRIVE TIME', val: nav.duration, color: '#00E676' },
                                    { label: 'W/ TRAFFIC', val: nav.duration_in_traffic, color: '#FFB800' },
                                ].map((stat, i, arr) => (
                                    <View key={i} style={{ flex: 1, flexDirection: 'row' }}>
                                        <View style={styles.navStatItem}>
                                            <Text style={[styles.navStatVal, { color: stat.color }]}>
                                                {stat.val}
                                            </Text>
                                            <Text style={styles.navStatKey}>{stat.label}</Text>
                                        </View>
                                        {i < arr.length - 1 && <View style={styles.navStatSep} />}
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Navigation error — shown if location/geocoding fails */}
                        {navigationError && (
                            <View style={styles.navError}>
                                <Ionicons name="warning-outline" size={13} color="#FFB800" />
                                <Text style={styles.navErrorText}>{navigationError}</Text>
                            </View>
                        )}

                        {/* Main directions button */}
                        <TouchableOpacity
                            style={styles.directionsBtn}
                            onPress={() => nav
                                ? openLink(links?.google_maps)
                                : handleGetDirections()
                            }
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
                                    {navigationLoading
                                        ? 'Getting directions...'
                                        : nav
                                            ? 'Open in Google Maps'
                                            : 'Get Directions'}
                                </Text>
                                <Text style={styles.dirBtnSub}>
                                    {navigationLoading
                                        ? 'Using your GPS'
                                        : nav
                                            ? `${nav.distance} · ${nav.duration_in_traffic} with traffic`
                                            : `To ${currentExam.center_city ?? 'exam center'} · Tap for live ETA`}
                                </Text>
                            </View>
                            {!navigationLoading && (
                                <Ionicons name="chevron-forward" size={14} color="#38384A" />
                            )}
                        </TouchableOpacity>

                        {/* Cab booking deep links — Uber, Ola, Rapido */}
                        <View style={styles.cabRow}>
                            {[
                                {
                                    label: 'Uber',
                                    icon: 'car-outline',
                                    color: '#4D9FFF',
                                    bg: 'rgba(77,159,255,0.1)',
                                    url: links?.uber || 'https://m.uber.com/ul/',
                                },
                                {
                                    label: 'Ola',
                                    icon: 'car-sport-outline',
                                    color: '#00E676',
                                    bg: 'rgba(0,230,118,0.1)',
                                    url: links?.ola || 'https://book.olacabs.com/',
                                },
                                {
                                    label: 'Rapido',
                                    icon: 'bicycle-outline',
                                    color: '#FFB800',
                                    bg: 'rgba(255,184,0,0.1)',
                                    url: links?.rapido || 'https://rapido.bike/',
                                },
                            ].map((cab) => (
                                <TouchableOpacity
                                    key={cab.label}
                                    style={styles.cabBtn}
                                    onPress={() => openLink(cab.url)}
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.cabIcon, { backgroundColor: cab.bg }]}>
                                        <Ionicons name={cab.icon} size={19} color={cab.color} />
                                    </View>
                                    <Text style={styles.cabLabel}>{cab.label}</Text>
                                    {/* Green dot = directions fetched for this cab */}
                                    {links && (
                                        <View style={[styles.cabDot, { backgroundColor: cab.color }]} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* ────────────────────────────────────────
                        SECTION 6: CHECKLIST PREVIEW
                        Shows progress bar + tap to open full list
                        Only shown when checklist has items
                    ──────────────────────────────────────── */}
                    {totalCount > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>CHECKLIST</Text>
                            <TouchableOpacity
                                style={styles.checklistCard}
                                onPress={() => router.push(`/exam/checklist/${id}`)}
                                activeOpacity={0.85}
                            >
                                {/* Fraction — checked / total */}
                                <View style={styles.checklistLeft}>
                                    <Text style={[
                                        styles.checklistBigNum,
                                        { color: allDone ? '#00E676' : '#F0F0F8' },
                                    ]}>
                                        {checkedCount}
                                    </Text>
                                    <View style={styles.checklistDivLine} />
                                    <Text style={styles.checklistSmallNum}>{totalCount}</Text>
                                </View>

                                {/* Progress bar + status text */}
                                <View style={{ flex: 1, gap: 8 }}>
                                    <Text style={styles.checklistStatus}>
                                        {allDone
                                            ? 'All items packed ✓'
                                            : `${totalCount - checkedCount} of ${totalCount} items left`}
                                    </Text>
                                    <View style={styles.checklistBar}>
                                        <View style={[
                                            styles.checklistBarFill,
                                            {
                                                width: `${progressPercent}%`,
                                                backgroundColor: allDone ? '#00E676' : '#C41E3A',
                                            },
                                        ]} />
                                    </View>
                                    <Text style={styles.checklistCta}>
                                        Open full checklist →
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ────────────────────────────────────────
                        SECTION 7: NOT ALLOWED IN HALL
                        Static list of banned items
                    ──────────────────────────────────────── */}
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

                    {/* Bottom padding */}
                    <View style={{ height: 48 }} />

                </ScrollView>
            </SafeAreaView>
        </>
    );
}


// ─────────────────────────────────────────────────────────────
// STYLES
// Grouped by section for easy navigation
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

    // ── ROOT ──
    root: {
        flex: 1,
        backgroundColor: '#06060E',
    },
    loadingScreen: {
        flex: 1,
        backgroundColor: '#06060E',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        fontSize: 13,
        color: '#38384A',
        fontWeight: '500',
    },

    // ── TOP NAV ──
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 4,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#0F0F1E',
        borderWidth: 1,
        borderColor: '#1A1A2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    offlinePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,184,0,0.08)',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,184,0,0.2)',
    },
    offlinePillText: {
        fontSize: 10,
        color: '#FFB800',
        fontWeight: '600',
    },

    // ── HERO SECTION ──
    heroWrap: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        gap: 16,
    },
    heroExamName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#F5F5FA',
        letterSpacing: -0.5,
        lineHeight: 28,
    },
    heroCard: {
        flexDirection: 'row',
        backgroundColor: '#0C0C1A',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#1A1A2E',
        overflow: 'hidden',
        minHeight: 220,
    },
    heroLeft: {
        flex: 1,
        padding: 18,
        justifyContent: 'center',
        gap: 6,
    },
    heroDaysNum: {
        fontSize: 64,
        fontWeight: '900',
        letterSpacing: -3,
        lineHeight: 68,
        includeFontPadding: false,
    },
    heroDaysWord: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    sessionCountChip: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(196,30,58,0.1)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: 'rgba(196,30,58,0.2)',
        marginTop: 6,
    },
    sessionCountText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#C41E3A',
        letterSpacing: 0.5,
    },
    heroCardDivider: {
        width: 1,
        backgroundColor: '#1A1A2E',
    },
    heroRight: {
        flex: 1.1,
        padding: 16,
        justifyContent: 'center',
    },
    heroTimeItem: {
        paddingVertical: 9,
        gap: 3,
    },
    heroTimeSep: {
        height: 1,
        backgroundColor: '#141428',
    },
    heroTimeKey: {
        fontSize: 9,
        color: '#38384A',
        fontWeight: '700',
        letterSpacing: 1,
    },
    heroTimeVal: {
        fontSize: 14,
        fontWeight: '700',
        color: '#E8E8F0',
        letterSpacing: -0.2,
    },

    // ── SESSIONS TIMELINE ──
    sessionsCard: {
        backgroundColor: '#0C0C1A',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1A1A2E',
        overflow: 'hidden',
    },
    sessionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        gap: 12,
    },
    sessionRowNext: {
        backgroundColor: 'rgba(196,30,58,0.04)',
    },
    sessionBar: {
        width: 3,
        height: 36,
        borderRadius: 2,
    },
    sessionInfo: {
        flex: 1,
        gap: 4,
    },
    sessionTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sessionSubject: {
        fontSize: 13,
        fontWeight: '700',
        color: '#E0E0EC',
    },
    sessionSubjectPast: {
        color: '#38384A',
    },
    sessionDateText: {
        fontSize: 11,
        color: '#52526A',
        fontWeight: '500',
    },
    nextBadge: {
        backgroundColor: 'rgba(196,30,58,0.12)',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: 'rgba(196,30,58,0.25)',
    },
    nextBadgeText: {
        fontSize: 8,
        fontWeight: '800',
        color: '#C41E3A',
        letterSpacing: 1,
    },
    doneBadge: {
        backgroundColor: 'rgba(56,56,74,0.3)',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    doneBadgeText: {
        fontSize: 8,
        fontWeight: '700',
        color: '#38384A',
        letterSpacing: 1,
    },
    sessionTime: {
        alignItems: 'flex-end',
        gap: 2,
    },
    sessionTimeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    sessionTimeSep: {
        fontSize: 10,
        color: '#252538',
        fontWeight: '500',
    },
    sessionDiv: {
        height: 1,
        backgroundColor: '#0F0F1E',
        marginHorizontal: 14,
    },

    // ── ROLL NUMBER ──
    rollCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 20,
        marginBottom: 20,
        backgroundColor: '#0C0C1A',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#1A1A2E',
        paddingVertical: 14,
        paddingHorizontal: 18,
    },
    rollKey: {
        fontSize: 10,
        color: '#38384A',
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    rollVal: {
        fontSize: 17,
        fontWeight: '700',
        color: '#E8E8F0',
        letterSpacing: 0.5,
    },
    rollIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#141428',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── SHARED SECTION STYLES ──
    section: {
        paddingHorizontal: 20,
        marginBottom: 22,
    },
    sectionLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#38384A',
        letterSpacing: 2.5,
        marginBottom: 10,
    },
    card: {
        backgroundColor: '#0C0C1A',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1A1A2E',
        padding: 18,
        gap: 10,
    },

    // ── EXAM CENTER ──
    centerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F0F0F8',
        letterSpacing: -0.3,
        lineHeight: 22,
    },
    centerCityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    centerCity: {
        fontSize: 13,
        color: '#72728A',
        fontWeight: '500',
    },
    centerAddress: {
        fontSize: 12,
        color: '#38384A',
        fontWeight: '500',
        lineHeight: 18,
    },
    mapsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#C41E3A',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 4,
    },
    mapsBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
        flex: 1,
    },

    // ── NAVIGATION ──
    navStatsCard: {
        flexDirection: 'row',
        backgroundColor: '#0C0C1A',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#1A1A2E',
        paddingVertical: 16,
        marginBottom: 10,
    },
    navStatItem: {
        flex: 1,
        alignItems: 'center',
        gap: 5,
    },
    navStatVal: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    navStatKey: {
        fontSize: 8,
        fontWeight: '700',
        color: '#323244',
        letterSpacing: 1,
        textAlign: 'center',
    },
    navStatSep: {
        width: 1,
        backgroundColor: '#1A1A2E',
    },
    navError: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,184,0,0.06)',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,184,0,0.15)',
        marginBottom: 10,
    },
    navErrorText: {
        fontSize: 11,
        color: '#FFB800',
        flex: 1,
        fontWeight: '500',
    },
    directionsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: '#0C0C1A',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#1A1A2E',
        padding: 14,
        marginBottom: 10,
    },
    dirBtnIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#C41E3A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dirBtnTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#E8E8F0',
        marginBottom: 2,
    },
    dirBtnSub: {
        fontSize: 11,
        color: '#52526A',
        fontWeight: '500',
    },
    cabRow: {
        flexDirection: 'row',
        gap: 10,
    },
    cabBtn: {
        flex: 1,
        backgroundColor: '#0C0C1A',
        borderRadius: 13,
        borderWidth: 1,
        borderColor: '#1A1A2E',
        paddingVertical: 14,
        alignItems: 'center',
        gap: 8,
        position: 'relative',
    },
    cabIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cabLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#C8C8D8',
    },
    cabDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 6,
        height: 6,
        borderRadius: 3,
    },

    // ── CHECKLIST PREVIEW ──
    checklistCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        backgroundColor: '#0C0C1A',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#1A1A2E',
        padding: 18,
    },
    checklistLeft: {
        alignItems: 'center',
        gap: 4,
    },
    checklistBigNum: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -1,
        lineHeight: 36,
    },
    checklistDivLine: {
        width: 22,
        height: 1.5,
        backgroundColor: '#38384A',
        borderRadius: 1,
    },
    checklistSmallNum: {
        fontSize: 15,
        fontWeight: '600',
        color: '#52526A',
    },
    checklistStatus: {
        fontSize: 13,
        fontWeight: '600',
        color: '#C8C8D8',
        lineHeight: 18,
    },
    checklistBar: {
        height: 3,
        backgroundColor: '#1A1A2E',
        borderRadius: 2,
        overflow: 'hidden',
    },
    checklistBarFill: {
        height: 3,
        borderRadius: 2,
    },
    checklistCta: {
        fontSize: 11,
        fontWeight: '700',
        color: '#C41E3A',
    },

    // ── NOT ALLOWED IN HALL ──
    notAllowedGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    notAllowedTile: {
        width: TILE_W,
        backgroundColor: '#0C0C1A',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#1A1A2E',
        paddingVertical: 16,
        alignItems: 'center',
        gap: 10,
    },
    notAllowedIconBox: {
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: 'rgba(196,30,58,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    notAllowedLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#72728A',
        textAlign: 'center',
    },
});