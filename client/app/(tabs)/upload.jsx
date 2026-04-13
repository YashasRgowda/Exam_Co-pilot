import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import useExamStore from '../../store/examStore';
import colors from '../../constants/colors';
import typography from '../../constants/typography';

export default function UploadScreen() {
    const router = useRouter();
    const { uploadAdmitCard, isUploading } = useExamStore();
    const [selectedFile, setSelectedFile] = useState(null);

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets[0]) {
                setSelectedFile(result.assets[0]);
            }
        } catch {
            Alert.alert('Error', 'Could not pick document.');
        }
    };

    const pickImage = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permission needed', 'Please allow photo access.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.9,
            });
            if (!result.canceled && result.assets[0]) {
                setSelectedFile({
                    uri: result.assets[0].uri,
                    name: 'admit_card.jpg',
                    mimeType: 'image/jpeg',
                });
            }
        } catch {
            Alert.alert('Error', 'Could not pick image.');
        }
    };

    const takePhoto = async () => {
        try {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permission needed', 'Please allow camera access.');
                return;
            }
            const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
            if (!result.canceled && result.assets[0]) {
                setSelectedFile({
                    uri: result.assets[0].uri,
                    name: 'admit_card.jpg',
                    mimeType: 'image/jpeg',
                });
            }
        } catch {
            Alert.alert('Error', 'Could not open camera.');
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        const result = await uploadAdmitCard(selectedFile);
        if (result.success) {
            setSelectedFile(null);
            router.push(`/exam/${result.exam.id}`);
        } else {
            Alert.alert('Failed', result.error || 'Please try again.');
        }
    };

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* ── HEADER ── */}
                    <View style={styles.header}>
                        <Text style={styles.headerSmall}>Upload</Text>
                        <Text style={styles.headerBig}>Admit Card</Text>
                    </View>

                    {!selectedFile ? (
                        <>
                            {/* ── STEPS CARD ── */}
                            <View style={styles.stepsCard}>
                                <View style={styles.stepRow}>
                                    <View style={styles.stepCircle}>
                                        <Text style={styles.stepNum}>1</Text>
                                    </View>
                                    <View style={styles.stepLine} />
                                    <View style={styles.stepCircle}>
                                        <Text style={styles.stepNum}>2</Text>
                                    </View>
                                    <View style={styles.stepLine} />
                                    <View style={[styles.stepCircle, styles.stepCircleLast]}>
                                        <Text style={[styles.stepNum, { color: colors.neonGreen }]}>3</Text>
                                    </View>
                                </View>
                                <View style={styles.stepLabels}>
                                    <Text style={styles.stepLabel}>Upload</Text>
                                    <Text style={styles.stepLabel}>Parse</Text>
                                    <Text style={[styles.stepLabel, { color: colors.neonGreen }]}>Ready</Text>
                                </View>
                            </View>

                            {/* ── SUPPORTED EXAMS ── */}
                            <View style={styles.examsRow}>
                                {['JEE', 'NEET', 'UPSC', 'KCET', 'Board'].map((exam) => (
                                    <View key={exam} style={styles.examChip}>
                                        <Text style={styles.examChipText}>{exam}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* ── SOURCE OPTIONS ── */}
                            <Text style={styles.sectionLabel}>CHOOSE SOURCE</Text>

                            <View style={styles.optionsList}>

                                <TouchableOpacity
                                    style={styles.optionCard}
                                    onPress={takePhoto}
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.optionIcon, { backgroundColor: colors.primaryGlow }]}>
                                        <Ionicons name="camera-outline" size={22} color={colors.primary} />
                                    </View>
                                    <View style={styles.optionText}>
                                        <Text style={styles.optionTitle}>Take Photo</Text>
                                        <Text style={styles.optionSub}>Open camera and photograph the card</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.optionCard}
                                    onPress={pickImage}
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.optionIcon, { backgroundColor: colors.neonBlueDim }]}>
                                        <Ionicons name="image-outline" size={22} color={colors.neonBlue} />
                                    </View>
                                    <View style={styles.optionText}>
                                        <Text style={styles.optionTitle}>Photo Library</Text>
                                        <Text style={styles.optionSub}>Pick a saved photo from your gallery</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.optionCard}
                                    onPress={pickDocument}
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.optionIcon, { backgroundColor: colors.neonAmberDim }]}>
                                        <Ionicons name="document-outline" size={22} color={colors.neonAmber} />
                                    </View>
                                    <View style={styles.optionText}>
                                        <Text style={styles.optionTitle}>PDF File</Text>
                                        <Text style={styles.optionSub}>Select a PDF from your files</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                                </TouchableOpacity>

                            </View>

                            {/* ── BOTTOM NOTE ── */}
                            <View style={styles.noteRow}>
                                <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} />
                                <Text style={styles.noteText}>
                                    Your admit card is stored securely and never shared
                                </Text>
                            </View>

                        </>
                    ) : (
                        <>
                            {/* ── FILE SELECTED ── */}
                            <Text style={styles.sectionLabel}>SELECTED FILE</Text>

                            <View style={styles.fileCard}>
                                <View style={[styles.fileIconBox, { backgroundColor: colors.neonGreenDim }]}>
                                    <Ionicons
                                        name={selectedFile.mimeType === 'application/pdf'
                                            ? 'document-text-outline'
                                            : 'image-outline'}
                                        size={26}
                                        color={colors.neonGreen}
                                    />
                                </View>
                                <View style={styles.fileInfo}>
                                    <Text style={styles.fileName} numberOfLines={1}>
                                        {selectedFile.name || 'admit_card.jpg'}
                                    </Text>
                                    <Text style={styles.fileType}>
                                        {selectedFile.mimeType === 'application/pdf' ? 'PDF Document' : 'Image'}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.removeBtn}
                                    onPress={() => setSelectedFile(null)}
                                >
                                    <Ionicons name="close" size={15} color={colors.textMuted} />
                                </TouchableOpacity>
                            </View>

                            {/* ── PARSE BUTTON ── */}
                            <TouchableOpacity
                                style={[styles.parseBtn, isUploading && { opacity: 0.6 }]}
                                onPress={handleUpload}
                                disabled={isUploading}
                                activeOpacity={0.88}
                            >
                                {isUploading ? (
                                    <View style={styles.parseBtnInner}>
                                        <ActivityIndicator color={colors.white} size="small" />
                                        <Text style={styles.parseBtnText}>Reading your card...</Text>
                                    </View>
                                ) : (
                                    <View style={styles.parseBtnInner}>
                                        <Ionicons name="flash" size={18} color={colors.white} />
                                        <Text style={styles.parseBtnText}>Get Exam Details</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.changeBtn}
                                onPress={() => setSelectedFile(null)}
                            >
                                <Text style={styles.changeBtnText}>Choose different file</Text>
                            </TouchableOpacity>
                        </>
                    )}

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

    // Header
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 28,
    },
    headerSmall: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        fontWeight: typography.medium,
        letterSpacing: 0.3,
    },
    headerBig: {
        fontSize: typography.xxl,
        fontWeight: typography.black,
        color: colors.textPrimary,
        letterSpacing: -0.8,
        marginTop: 2,
    },

    // Steps
    stepsCard: {
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepCircleLast: {
        borderColor: colors.neonGreen,
    },
    stepNum: {
        fontSize: typography.sm,
        fontWeight: typography.bold,
        color: colors.primary,
    },
    stepLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: 8,
    },
    stepLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 6,
    },
    stepLabel: {
        fontSize: typography.xs,
        color: colors.textMuted,
        fontWeight: typography.medium,
    },

    // Exam chips
    examsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 8,
        marginBottom: 24,
        flexWrap: 'wrap',
    },
    examChip: {
        backgroundColor: colors.surfaceRaised,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    examChipText: {
        fontSize: 11,
        fontWeight: typography.bold,
        color: colors.textSecondary,
        letterSpacing: 0.5,
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

    // Options list
    optionsList: {
        paddingHorizontal: 20,
        gap: 10,
        marginBottom: 20,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 16,
        gap: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    optionIcon: {
        width: 46,
        height: 46,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionText: {
        flex: 1,
    },
    optionTitle: {
        fontSize: typography.base,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        marginBottom: 3,
    },
    optionSub: {
        fontSize: 11,
        color: colors.textMuted,
        lineHeight: 16,
    },

    // Note
    noteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    noteText: {
        fontSize: 11,
        color: colors.textMuted,
        flex: 1,
    },

    // File selected state
    fileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 16,
        gap: 14,
        borderWidth: 1,
        borderColor: colors.borderBright,
        marginBottom: 14,
    },
    fileIconBox: {
        width: 50,
        height: 50,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: 3,
    },
    fileType: {
        fontSize: 11,
        color: colors.textMuted,
    },
    removeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Parse button
    parseBtn: {
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 17,
        marginHorizontal: 20,
        alignItems: 'center',
        marginBottom: 12,
    },
    parseBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    parseBtnText: {
        fontSize: typography.base,
        fontWeight: typography.bold,
        color: colors.white,
        letterSpacing: 0.2,
    },
    changeBtn: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    changeBtnText: {
        fontSize: typography.sm,
        color: colors.textMuted,
        fontWeight: typography.medium,
    },
});