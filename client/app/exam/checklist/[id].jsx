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
import colors from '../../../constants/colors';
import typography from '../../../constants/typography';

export default function ChecklistScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { currentChecklist, fetchChecklist, toggleChecklistItem } = useExamStore();
    const [adding, setAdding] = useState(false);
    const [newItem, setNewItem] = useState('');
    const [loading, setLoading] = useState(false);
    const [acknowledged, setAcknowledged] = useState(false);

    useEffect(() => {
        if (id) fetchChecklist(id);
    }, [id]);

    // Load acknowledged state for this exam
    useEffect(() => {
        const loadAcknowledged = async () => {
            try {
                const val = await AsyncStorage.getItem(`acknowledged_${id}`);
                if (val === 'true') setAcknowledged(true);
            } catch { }
        };
        if (id) loadAcknowledged();
    }, [id]);

    const checkedCount = currentChecklist.filter((i) => i.is_checked).length;
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
        } catch {
            Alert.alert('Error', 'Could not add item.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (itemId) => {
        try {
            await checklistService.deleteItem(itemId);
            await fetchChecklist(id);
        } catch {
            Alert.alert('Error', 'Could not delete item.');
        }
    };

    const handleAcknowledge = async () => {
        const newVal = !acknowledged;
        setAcknowledged(newVal);
        try {
            await AsyncStorage.setItem(`acknowledged_${id}`, String(newVal));
        } catch { }
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
                    <Text style={styles.headerLabel}>CHECKLIST</Text>
                    <View style={{ width: 36 }} />
                </View>

                {/* ── PROGRESS BAR ── */}
                <View style={styles.progressSection}>
                    <View style={styles.progressTop}>
                        <Text style={styles.progressText}>
                            {allDone ? 'All packed! Ready for exam 🎯' : `${checkedCount} of ${totalCount} items ready`}
                        </Text>
                        <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[
                            styles.progressFill,
                            {
                                width: `${progressPercent}%`,
                                backgroundColor: allDone ? colors.neonGreen : colors.primary,
                            }
                        ]} />
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* ── CHECKLIST ITEMS ── */}
                    <Text style={styles.sectionLabel}>ITEMS TO CARRY</Text>
                    <View style={styles.itemsCard}>
                        {currentChecklist.map((item, i) => (
                            <View key={item.id}>
                                <TouchableOpacity
                                    style={styles.itemRow}
                                    onPress={() => toggleChecklistItem(item.id, item.is_checked)}
                                    activeOpacity={0.85}
                                >
                                    <View style={[
                                        styles.checkbox,
                                        item.is_checked && styles.checkboxChecked,
                                    ]}>
                                        {item.is_checked && (
                                            <Ionicons name="checkmark" size={13} color={colors.white} />
                                        )}
                                    </View>
                                    <Text style={[
                                        styles.itemText,
                                        item.is_checked && styles.itemTextChecked,
                                    ]}>
                                        {item.item_name}
                                    </Text>
                                    {!item.is_default && (
                                        <TouchableOpacity
                                            onPress={() => handleDelete(item.id)}
                                            style={styles.deleteBtn}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        >
                                            <Ionicons name="close" size={14} color={colors.textMuted} />
                                        </TouchableOpacity>
                                    )}
                                </TouchableOpacity>
                                {i < currentChecklist.length - 1 && (
                                    <View style={styles.itemDivider} />
                                )}
                            </View>
                        ))}
                    </View>

                    {/* ── ADD CUSTOM ITEM ── */}
                    {adding ? (
                        <View style={styles.addInputCard}>
                            <TextInput
                                style={styles.addInput}
                                placeholder="Item name..."
                                placeholderTextColor={colors.textMuted}
                                value={newItem}
                                onChangeText={setNewItem}
                                autoFocus
                                returnKeyType="done"
                                onSubmitEditing={handleAddItem}
                            />
                            <View style={styles.addActions}>
                                <TouchableOpacity
                                    style={styles.addCancelBtn}
                                    onPress={() => { setAdding(false); setNewItem(''); }}
                                >
                                    <Text style={styles.addCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.addConfirmBtn, !newItem.trim() && { opacity: 0.5 }]}
                                    onPress={handleAddItem}
                                    disabled={!newItem.trim() || loading}
                                >
                                    <Text style={styles.addConfirmText}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.addItemBtn}
                            onPress={() => setAdding(true)}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="add" size={18} color={colors.primary} />
                            <Text style={styles.addItemText}>Add custom item</Text>
                        </TouchableOpacity>
                    )}

                    {/* ── EXAM INSTRUCTIONS ── */}
                    <Text style={styles.sectionLabel}>EXAM INSTRUCTIONS</Text>
                    <View style={styles.instructionsCard}>

                        <View style={styles.instructionGroup}>
                            <View style={styles.instructionGroupHeader}>
                                <View style={[styles.instructionGroupDot, { backgroundColor: colors.primary }]} />
                                <Text style={styles.instructionGroupTitle}>Do Not Bring</Text>
                            </View>
                            {[
                                'Mobile phone or any electronic device',
                                'Smartwatch or digital watch',
                                'Calculator or any measuring tool',
                                'Bluetooth or wireless devices',
                                'Bags, pouches or stationery box',
                                'Loose papers or books',
                            ].map((item, i) => (
                                <View key={i} style={styles.instructionRow}>
                                    <Text style={styles.instructionBullet}>✕</Text>
                                    <Text style={styles.instructionText}>{item}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.instructionsDivider} />

                        <View style={styles.instructionGroup}>
                            <View style={styles.instructionGroupHeader}>
                                <View style={[styles.instructionGroupDot, { backgroundColor: colors.neonGreen }]} />
                                <Text style={styles.instructionGroupTitle}>Remember</Text>
                            </View>
                            {[
                                'Arrive at least 30 minutes before reporting time',
                                'Carry original government ID proof',
                                'Fill OMR sheet carefully — no corrections allowed',
                                'Bring only a transparent water bottle',
                                'Paste your photograph on the attendance sheet',
                                'Gate closes strictly — no entry after closing time',
                            ].map((item, i) => (
                                <View key={i} style={styles.instructionRow}>
                                    <Text style={[styles.instructionBullet, { color: colors.neonGreen }]}>→</Text>
                                    <Text style={styles.instructionText}>{item}</Text>
                                </View>
                            ))}
                        </View>

                    </View>

                    {/* ── ACKNOWLEDGEMENT BUTTON ── */}
                    <TouchableOpacity
                        style={[styles.readyBtn, acknowledged && styles.readyBtnConfirmed]}
                        onPress={handleAcknowledge}
                        activeOpacity={0.88}
                    >
                        {acknowledged ? (
                            <View style={styles.readyBtnInner}>
                                <View style={styles.readyCheckCircle}>
                                    <Ionicons name="checkmark" size={16} color={colors.primary} />
                                </View>
                                <Text style={styles.readyBtnText}>Confirmed — You're Exam Ready</Text>
                            </View>
                        ) : (
                            <View style={styles.readyBtnInner}>
                                <View style={styles.readyEmptyCircle} />
                                <Text style={[styles.readyBtnText, { color: colors.textSecondary }]}>
                                    I've read all instructions
                                </Text>
                            </View>
                        )}
                        <Text style={[
                            styles.readyBtnSub,
                            acknowledged && { color: 'rgba(196,30,58,0.6)' }
                        ]}>
                            {acknowledged ? 'Tap to undo' : 'Tap to confirm before your exam'}
                        </Text>
                    </TouchableOpacity>

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
    progressSection: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 8,
    },
    progressTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressText: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },
    progressPercent: {
        fontSize: typography.sm,
        fontWeight: typography.bold,
        color: colors.primary,
    },
    progressTrack: {
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: 4,
        borderRadius: 2,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: typography.bold,
        color: colors.textMuted,
        letterSpacing: 2,
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    itemsCard: {
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        marginBottom: 24,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        gap: 14,
    },
    itemDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: 16,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 7,
        borderWidth: 1.5,
        borderColor: colors.borderBright,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: colors.neonGreen,
        borderColor: colors.neonGreen,
    },
    itemText: {
        flex: 1,
        fontSize: typography.sm,
        fontWeight: typography.medium,
        color: colors.textPrimary,
    },
    itemTextChecked: {
        color: colors.textMuted,
        textDecorationLine: 'line-through',
    },
    deleteBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addInputCard: {
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.borderBright,
        marginBottom: 24,
        gap: 12,
    },
    addInput: {
        fontSize: typography.sm,
        color: colors.textPrimary,
        fontWeight: typography.medium,
        paddingVertical: 4,
    },
    addActions: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'flex-end',
    },
    addCancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    addCancelText: {
        fontSize: typography.sm,
        color: colors.textMuted,
        fontWeight: typography.medium,
    },
    addConfirmBtn: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    addConfirmText: {
        fontSize: typography.sm,
        fontWeight: typography.bold,
        color: colors.white,
    },
    addItemBtn: {
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        marginBottom: 24,
    },
    addItemText: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.primary,
    },
    instructionsCard: {
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        marginBottom: 16,
    },
    instructionGroup: {
        padding: 16,
        gap: 10,
    },
    instructionGroupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    instructionGroupDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    instructionGroupTitle: {
        fontSize: 11,
        fontWeight: typography.bold,
        color: colors.textSecondary,
        letterSpacing: 0.5,
    },
    instructionsDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: 16,
    },
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    instructionBullet: {
        fontSize: 11,
        fontWeight: typography.bold,
        color: colors.primary,
        width: 14,
        marginTop: 2,
    },
    instructionText: {
        flex: 1,
        fontSize: typography.sm,
        color: colors.textSecondary,
        fontWeight: typography.medium,
        lineHeight: 20,
    },
    readyBtn: {
        marginHorizontal: 20,
        backgroundColor: colors.surfaceRaised,
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        gap: 6,
        marginBottom: 24,
        borderWidth: 1.5,
        borderColor: colors.borderBright,
        borderStyle: 'dashed',
    },
    readyBtnConfirmed: {
        backgroundColor: colors.primaryDim,
        borderColor: colors.primary,
        borderStyle: 'solid',
    },
    readyBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    readyEmptyCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.borderBright,
    },
    readyCheckCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    readyBtnText: {
        fontSize: typography.base,
        fontWeight: typography.bold,
        color: colors.primary,
        letterSpacing: 0.2,
    },
    readyBtnSub: {
        fontSize: 11,
        color: colors.textMuted,
        fontWeight: typography.medium,
    },
});