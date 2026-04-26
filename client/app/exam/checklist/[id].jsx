import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    TextInput,
    Alert,
} from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useExamStore from '../../../store/examStore';
import checklistService from '../../../services/checklistService';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

export default function ChecklistScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const {
        currentChecklist,
        fetchChecklist,
        toggleChecklistItem,
        fetchExamDashboard,
        currentExam,
    } = useExamStore();

    const [adding, setAdding] = useState(false);
    const [newItem, setNewItem] = useState('');
    const [loading, setLoading] = useState(false);
    const [acknowledged, setAcknowledged] = useState(false);

    const checkAndResetForNewSession = async () => {
        try {
            await fetchExamDashboard(id);

            const examStore = useExamStore.getState();
            const nextSession = examStore.currentExam?.next_session;

            if (!nextSession) {
                // No next session — still fetch checklist
                await fetchChecklist(id);
                return;
            }

            const currentSessionKey = `${nextSession.exam_date}_${nextSession.session_number}`;
            const storedKey = await AsyncStorage.getItem(`last_packed_session_${id}`);

            if (storedKey && storedKey !== currentSessionKey) {
                // New session detected — reset all checkboxes in DB
                const items = examStore.currentChecklist;
                const checkedItems = items.filter(item => item.is_checked);

                // Reset all checked items
                await Promise.all(
                    checkedItems.map(item => checklistService.updateItem(item.id, false))
                );

                await AsyncStorage.removeItem(`acknowledged_${id}`);
                setAcknowledged(false);
                console.log(`Checklist reset: ${storedKey} → ${currentSessionKey}`);
            }

            // Always update stored key
            await AsyncStorage.setItem(`last_packed_session_${id}`, currentSessionKey);

        } catch (e) {
            console.log('Session reset check failed:', e);
        } finally {
            // Always fetch fresh checklist at the end — no race condition
            await fetchChecklist(id);
        }
    };

    useEffect(() => {
        if (id) {
            // checkAndResetForNewSession already calls fetchChecklist internally
            // so we don't need to call it separately
            checkAndResetForNewSession();
        }
    }, [id]);

    useEffect(() => {
        const load = async () => {
            try {
                const val = await AsyncStorage.getItem(`acknowledged_${id}`);
                if (val === 'true') setAcknowledged(true);
            } catch { }
        };
        if (id) load();
    }, [id]);

    // Refresh checklist when screen comes back into focus
    // This handles the case where user checks items on exam detail screen
    useFocusEffect(
        useCallback(() => {
            if (id) fetchChecklist(id);
        }, [id])
    );

    const checkedCount = currentChecklist.filter(i => i.is_checked).length;
    const totalCount = currentChecklist.length;
    const progressPercent = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;
    const allDone = checkedCount === totalCount && totalCount > 0;

    const handleAddItem = async () => {
        if (!newItem.trim()) return;
        try {
            setLoading(true);
            await checklistService.addItem(id, newItem.trim());
            await fetchChecklist(id);
            setNewItem('');
            setAdding(false);
        } catch { Alert.alert('Error', 'Could not add item.'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (itemId) => {
        try {
            await checklistService.deleteItem(itemId);
            await fetchChecklist(id);
        } catch { Alert.alert('Error', 'Could not delete item.'); }
    };

    const handleAcknowledge = async () => {
        const next = !acknowledged;
        setAcknowledged(next);
        try { await AsyncStorage.setItem(`acknowledged_${id}`, String(next)); } catch { }
    };

    const progressColor = allDone ? '#00E676' : progressPercent > 66 ? '#FFB800' : '#C41E3A';



    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#06060E" />
            <SafeAreaView style={styles.root} edges={['top']}>

                {/* ── HEADER ── */}
                <View style={styles.topNav}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={16} color="#E0E0EC" />
                    </TouchableOpacity>
                    {currentExam?.next_session?.subject_name && (
                        <View style={styles.sessionPill}>
                            <Text style={styles.sessionPillText}>
                                {currentExam.next_session.subject_name}
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── PROGRESS HERO ── */}
                <View style={styles.heroWrap}>
                    <Text style={styles.heroTitle}>Exam Checklist</Text>
                    {currentExam?.next_session && (
                        <Text style={styles.heroSubtitle}>
                            {currentExam.next_session.subject_name
                                ? `For ${currentExam.next_session.subject_name} · `
                                : ''}
                            {currentExam.next_session.start_time?.slice(0, 5)} →{' '}
                            {currentExam.next_session.end_time?.slice(0, 5)}
                        </Text>
                    )}

                    <View style={styles.heroCard}>
                        <View style={styles.heroLeft}>
                            <Text style={[styles.heroFracTop, { color: progressColor }]}>
                                {checkedCount}
                            </Text>
                            <View style={[styles.heroFracLine, { backgroundColor: progressColor + '50' }]} />
                            <Text style={styles.heroFracBottom}>{totalCount}</Text>
                            <Text style={[styles.heroFracLabel, { color: progressColor }]}>PACKED</Text>
                        </View>

                        <View style={styles.heroCardDivider} />

                        <View style={styles.heroRight}>
                            <Text style={styles.heroStatusText}>
                                {allDone
                                    ? 'You\'re fully packed!'
                                    : `${totalCount - checkedCount} item${totalCount - checkedCount !== 1 ? 's' : ''} left to pack`}
                            </Text>
                            <View style={styles.heroBar}>
                                <View style={[styles.heroBarFill, {
                                    width: `${progressPercent}%`,
                                    backgroundColor: progressColor,
                                }]} />
                            </View>
                            <Text style={[styles.heroPercent, { color: progressColor }]}>
                                {Math.round(progressPercent)}% complete
                            </Text>
                            {allDone && (
                                <View style={styles.readyChip}>
                                    <Ionicons name="checkmark-circle" size={12} color="#00E676" />
                                    <Text style={styles.readyChipText}>Exam Ready!</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* ── ITEMS ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>ITEMS TO CARRY</Text>
                        <View style={styles.itemsCard}>
                            {currentChecklist.map((item, i) => (
                                <View key={item.id}>
                                    <TouchableOpacity
                                        style={styles.itemRow}
                                        onPress={() => toggleChecklistItem(item.id, item.is_checked)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.checkbox, item.is_checked && styles.checkboxDone]}>
                                            {item.is_checked && (
                                                <Ionicons name="checkmark" size={12} color="#06060E" />
                                            )}
                                        </View>
                                        <Text style={[styles.itemText, item.is_checked && styles.itemTextDone]}>
                                            {item.item_name}
                                        </Text>
                                        {!item.is_default && (
                                            <TouchableOpacity
                                                style={styles.deleteBtn}
                                                onPress={() => handleDelete(item.id)}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Ionicons name="close" size={12} color="#38384A" />
                                            </TouchableOpacity>
                                        )}
                                    </TouchableOpacity>
                                    {i < currentChecklist.length - 1 && <View style={styles.itemDiv} />}
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* ── ADD ITEM ── */}
                    <View style={styles.section}>
                        {adding ? (
                            <View style={styles.addCard}>
                                <TextInput
                                    style={styles.addInput}
                                    value={newItem}
                                    onChangeText={setNewItem}
                                    autoFocus
                                    placeholder="Item name..."
                                    placeholderTextColor="#252538"
                                    returnKeyType="done"
                                    onSubmitEditing={handleAddItem}
                                    selectionColor="#C41E3A"
                                />
                                <View style={styles.addBtns}>
                                    <TouchableOpacity
                                        style={styles.addCancelBtn}
                                        onPress={() => { setAdding(false); setNewItem(''); }}
                                    >
                                        <Text style={styles.addCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.addConfirmBtn, (!newItem.trim() || loading) && { opacity: 0.5 }]}
                                        onPress={handleAddItem}
                                        disabled={!newItem.trim() || loading}
                                    >
                                        <Text style={styles.addConfirmText}>Add Item</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.addTrigger} onPress={() => setAdding(true)} activeOpacity={0.82}>
                                <View style={styles.addTriggerIcon}>
                                    <Ionicons name="add" size={16} color="#C41E3A" />
                                </View>
                                <Text style={styles.addTriggerText}>Add custom item</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* ── INSTRUCTIONS ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>EXAM INSTRUCTIONS</Text>
                        <View style={styles.instrCard}>
                            <View style={styles.instrGroup}>
                                <View style={styles.instrGroupHead}>
                                    <View style={[styles.instrDot, { backgroundColor: '#C41E3A' }]} />
                                    <Text style={styles.instrGroupTitle}>Do Not Bring</Text>
                                </View>
                                {[
                                    'Mobile phone or any electronic device',
                                    'Smartwatch or digital watch',
                                    'Calculator or any measuring tool',
                                    'Bluetooth or wireless devices',
                                    'Bags, pouches or stationery box',
                                    'Loose papers or books',
                                ].map((item, i) => (
                                    <View key={i} style={styles.instrRow}>
                                        <Text style={[styles.instrBullet, { color: '#C41E3A' }]}>✕</Text>
                                        <Text style={styles.instrText}>{item}</Text>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.instrDiv} />

                            <View style={styles.instrGroup}>
                                <View style={styles.instrGroupHead}>
                                    <View style={[styles.instrDot, { backgroundColor: '#00E676' }]} />
                                    <Text style={styles.instrGroupTitle}>Remember</Text>
                                </View>
                                {[
                                    'Arrive at least 30 minutes before reporting time',
                                    'Carry original government ID proof',
                                    'Fill OMR sheet carefully — no corrections allowed',
                                    'Bring only a transparent water bottle',
                                    'Paste photograph on attendance sheet',
                                    'Gate closes strictly — no entry after closing time',
                                ].map((item, i) => (
                                    <View key={i} style={styles.instrRow}>
                                        <Text style={[styles.instrBullet, { color: '#00E676' }]}>→</Text>
                                        <Text style={styles.instrText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* ── ACKNOWLEDGEMENT ── */}
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={[styles.ackBtn, acknowledged && styles.ackBtnDone]}
                            onPress={handleAcknowledge}
                            activeOpacity={0.88}
                        >
                            <View style={[styles.ackCircle, acknowledged && styles.ackCircleDone]}>
                                {acknowledged && <Ionicons name="checkmark" size={14} color="#fff" />}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.ackTitle, acknowledged && { color: '#00E676' }]}>
                                    {acknowledged ? 'Confirmed — Exam Ready!' : "I've read all instructions"}
                                </Text>
                                <Text style={styles.ackSub}>
                                    {acknowledged ? 'Tap to undo' : 'Tap to confirm before your exam'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 48 }} />
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#06060E' },

    topNav: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#0F0F1E', borderWidth: 1, borderColor: '#1A1A2E',
        justifyContent: 'center', alignItems: 'center',
    },
    sessionPill: {
        backgroundColor: 'rgba(196,30,58,0.1)',
        borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
        borderWidth: 1, borderColor: 'rgba(196,30,58,0.2)',
    },
    sessionPillText: {
        fontSize: 11, fontWeight: '700', color: '#C41E3A', letterSpacing: 0.5,
    },

    heroWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, gap: 6 },
    heroTitle: { fontSize: 22, fontWeight: '800', color: '#F5F5FA', letterSpacing: -0.5 },
    heroSubtitle: { fontSize: 12, color: '#52526A', fontWeight: '500', marginBottom: 8 },

    heroCard: {
        flexDirection: 'row', backgroundColor: '#0C0C1A',
        borderRadius: 18, borderWidth: 1, borderColor: '#1A1A2E',
        overflow: 'hidden', minHeight: 140,
    },
    heroLeft: {
        paddingHorizontal: 20, paddingVertical: 18,
        justifyContent: 'center', alignItems: 'center', gap: 4, minWidth: 90,
    },
    heroFracTop: { fontSize: 44, fontWeight: '900', letterSpacing: -2, lineHeight: 48 },
    heroFracLine: { width: 30, height: 1.5, borderRadius: 1 },
    heroFracBottom: { fontSize: 20, fontWeight: '700', color: '#52526A' },
    heroFracLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1.5, marginTop: 4 },
    heroCardDivider: { width: 1, backgroundColor: '#1A1A2E' },
    heroRight: { flex: 1, padding: 18, justifyContent: 'center', gap: 10 },
    heroStatusText: { fontSize: 14, fontWeight: '700', color: '#E8E8F0', lineHeight: 20 },
    heroBar: { height: 4, backgroundColor: '#1A1A2E', borderRadius: 2, overflow: 'hidden' },
    heroBarFill: { height: 4, borderRadius: 2 },
    heroPercent: { fontSize: 11, fontWeight: '700' },
    readyChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
        backgroundColor: 'rgba(0,230,118,0.1)', borderRadius: 6,
        paddingHorizontal: 8, paddingVertical: 4,
        borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)',
    },
    readyChipText: { fontSize: 11, fontWeight: '700', color: '#00E676' },

    section: { paddingHorizontal: 20, marginBottom: 20 },
    sectionLabel: { fontSize: 9, fontWeight: '700', color: '#38384A', letterSpacing: 2.5, marginBottom: 10 },

    itemsCard: {
        backgroundColor: '#0C0C1A', borderRadius: 14,
        borderWidth: 1, borderColor: '#1A1A2E', overflow: 'hidden',
    },
    itemRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 14, gap: 13,
    },
    itemDiv: { height: 1, backgroundColor: '#0F0F1E', marginHorizontal: 14 },
    checkbox: {
        width: 22, height: 22, borderRadius: 7,
        borderWidth: 1.5, borderColor: '#252538',
        justifyContent: 'center', alignItems: 'center',
    },
    checkboxDone: { backgroundColor: '#00E676', borderColor: '#00E676' },
    itemText: { flex: 1, fontSize: 13, fontWeight: '500', color: '#D8D8E8' },
    itemTextDone: { color: '#38384A', textDecorationLine: 'line-through' },
    deleteBtn: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: '#141428', justifyContent: 'center', alignItems: 'center',
    },

    addTrigger: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#0C0C1A', borderRadius: 13,
        borderWidth: 1, borderColor: '#1A1A2E', borderStyle: 'dashed',
        paddingVertical: 13, paddingHorizontal: 14,
    },
    addTriggerIcon: {
        width: 26, height: 26, borderRadius: 8,
        backgroundColor: 'rgba(196,30,58,0.1)',
        justifyContent: 'center', alignItems: 'center',
    },
    addTriggerText: { fontSize: 13, fontWeight: '600', color: '#C41E3A' },
    addCard: {
        backgroundColor: '#0C0C1A', borderRadius: 13,
        borderWidth: 1, borderColor: 'rgba(196,30,58,0.3)',
        padding: 14, gap: 12,
    },
    addInput: {
        fontSize: 13, color: '#E0E0EC', fontWeight: '500',
        paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#C41E3A',
    },
    addBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    addCancelBtn: { paddingHorizontal: 14, paddingVertical: 8 },
    addCancelText: { fontSize: 12, color: '#38384A', fontWeight: '500' },
    addConfirmBtn: {
        backgroundColor: '#C41E3A', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8,
    },
    addConfirmText: { fontSize: 12, fontWeight: '700', color: '#fff' },

    instrCard: {
        backgroundColor: '#0C0C1A', borderRadius: 14,
        borderWidth: 1, borderColor: '#1A1A2E', overflow: 'hidden',
    },
    instrGroup: { padding: 16, gap: 10 },
    instrGroupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    instrDot: { width: 6, height: 6, borderRadius: 3 },
    instrGroupTitle: { fontSize: 11, fontWeight: '700', color: '#72728A', letterSpacing: 0.3 },
    instrDiv: { height: 1, backgroundColor: '#141428', marginHorizontal: 16 },
    instrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    instrBullet: { fontSize: 11, fontWeight: '700', width: 14, marginTop: 2 },
    instrText: { flex: 1, fontSize: 12, color: '#52526A', fontWeight: '500', lineHeight: 18 },

    ackBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: '#0C0C1A', borderRadius: 14,
        borderWidth: 1.5, borderColor: '#1A1A2E', borderStyle: 'dashed', padding: 16,
    },
    ackBtnDone: {
        backgroundColor: 'rgba(0,230,118,0.05)',
        borderColor: 'rgba(0,230,118,0.3)', borderStyle: 'solid',
    },
    ackCircle: {
        width: 28, height: 28, borderRadius: 14,
        borderWidth: 1.5, borderColor: '#252538',
        justifyContent: 'center', alignItems: 'center',
    },
    ackCircleDone: { backgroundColor: '#00E676', borderColor: '#00E676' },
    ackTitle: { fontSize: 13, fontWeight: '700', color: '#A0A0B8', marginBottom: 3 },
    ackSub: { fontSize: 11, color: '#323244', fontWeight: '500' },
});