import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    Dimensions,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import useExamStore from '../../store/examStore';

const { width } = Dimensions.get('window');
const SCAN_SIZE = width - 48;

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
            if (!result.canceled && result.assets[0]) setSelectedFile(result.assets[0]);
        } catch { Alert.alert('Error', 'Could not pick document.'); }
    };

    const pickImage = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) { Alert.alert('Permission needed', 'Please allow photo access.'); return; }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
            if (!result.canceled && result.assets[0]) {
                setSelectedFile({ uri: result.assets[0].uri, name: 'admit_card.jpg', mimeType: 'image/jpeg' });
            }
        } catch { Alert.alert('Error', 'Could not pick image.'); }
    };

    const takePhoto = async () => {
        try {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) { Alert.alert('Permission needed', 'Please allow camera access.'); return; }
            const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
            if (!result.canceled && result.assets[0]) {
                setSelectedFile({ uri: result.assets[0].uri, name: 'admit_card.jpg', mimeType: 'image/jpeg' });
            }
        } catch { Alert.alert('Error', 'Could not open camera.'); }
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

    // ── FILE SELECTED STATE ──
    if (selectedFile) {
        return (
            <>
                <StatusBar barStyle="light-content" backgroundColor="#06060E" />
                <SafeAreaView style={styles.root} edges={['top']}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                        <View style={styles.header}>
                            <Text style={styles.headerSmall}>Almost there</Text>
                            <Text style={styles.headerBig}>Ready to scan</Text>
                        </View>

                        {/* File confirm card */}
                        <View style={styles.confirmCard}>
                            {/* Top glow strip */}
                            <View style={styles.confirmGlow} />

                            <View style={styles.confirmIconRow}>
                                <View style={styles.confirmIconBox}>
                                    <Ionicons
                                        name={selectedFile.mimeType === 'application/pdf' ? 'document-text' : 'image'}
                                        size={32}
                                        color="#00E676"
                                    />
                                </View>
                                <View style={styles.confirmReadyBadge}>
                                    <View style={styles.confirmReadyDot} />
                                    <Text style={styles.confirmReadyText}>FILE READY</Text>
                                </View>
                            </View>

                            <Text style={styles.confirmFileName} numberOfLines={2}>
                                {selectedFile.name || 'admit_card.jpg'}
                            </Text>
                            <Text style={styles.confirmFileType}>
                                {selectedFile.mimeType === 'application/pdf' ? 'PDF Document' : 'Image File'}
                            </Text>

                            {/* Divider */}
                            <View style={styles.confirmDiv} />

                            {/* What AI will extract */}
                            <Text style={styles.confirmWillExtract}>AI WILL EXTRACT</Text>
                            <View style={styles.extractGrid}>
                                {[
                                    'Exam name & date',
                                    'Reporting time',
                                    'Gate closing time',
                                    'Center address',
                                    'Roll number',
                                    'Instructions',
                                ].map((item, i) => (
                                    <View key={i} style={styles.extractChip}>
                                        <Ionicons name="checkmark" size={10} color="#00E676" />
                                        <Text style={styles.extractChipText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* CTA */}
                        <View style={styles.ctaBlock}>
                            <TouchableOpacity
                                style={[styles.scanBtn, isUploading && { opacity: 0.65 }]}
                                onPress={handleUpload}
                                disabled={isUploading}
                                activeOpacity={0.88}
                            >
                                {isUploading ? (
                                    <View style={styles.scanBtnInner}>
                                        <ActivityIndicator color="#fff" size="small" />
                                        <Text style={styles.scanBtnText}>Reading your card...</Text>
                                    </View>
                                ) : (
                                    <View style={styles.scanBtnInner}>
                                        <Ionicons name="flash" size={18} color="#fff" />
                                        <Text style={styles.scanBtnText}>Extract Exam Details</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.changeBtn} onPress={() => setSelectedFile(null)} activeOpacity={0.7}>
                                <Ionicons name="arrow-back" size={13} color="#38384A" />
                                <Text style={styles.changeBtnText}>Choose a different file</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </SafeAreaView>
            </>
        );
    }

    // ── DEFAULT STATE ──
    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#06060E" />
            <SafeAreaView style={styles.root} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                    {/* ── HEADER ── */}
                    <View style={styles.header}>
                        <Text style={styles.headerSmall}>Scan your</Text>
                        <Text style={styles.headerBig}>Admit Card</Text>
                    </View>

                    {/* ── SCAN ZONE — tappable, opens camera directly ── */}
                    <View style={styles.scanZoneWrap}>
                        <TouchableOpacity
                            style={styles.scanZone}
                            onPress={takePhoto}
                            activeOpacity={0.85}
                        >
                            <View style={[styles.corner, styles.cornerTL]} />
                            <View style={[styles.corner, styles.cornerTR]} />
                            <View style={[styles.corner, styles.cornerBL]} />
                            <View style={[styles.corner, styles.cornerBR]} />

                            <View style={styles.scanZoneCenter}>
                                <View style={styles.scanIconRing}>
                                    <Ionicons name="camera-outline" size={36} color="#C41E3A" />
                                </View>
                                <Text style={styles.scanZoneTitle}>Tap to Open Camera</Text>
                                <Text style={styles.scanZoneSub}>
                                    Point at your admit card and capture
                                </Text>
                            </View>

                            <View style={styles.scanZoneTapHint}>
                                <Ionicons name="finger-print-outline" size={11} color="#C41E3A" />
                                <Text style={styles.scanZoneTapText}>TAP ANYWHERE TO OPEN CAMERA</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* ── WORKS WITH — contextual label + chips ── */}
                    <View style={styles.worksWithBlock}>
                        <Text style={styles.worksWithLabel}>
                            Works with all major exams
                        </Text>
                        <View style={styles.examsRow}>
                            {['JEE', 'NEET', 'UPSC', 'GATE', 'KCET', 'Board', 'CAT', 'CUET'].map((exam) => (
                                <View key={exam} style={styles.examChip}>
                                    <Text style={styles.examChipText}>{exam}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* ── OR USE FILE — Gallery + PDF only ── */}
                    <View style={styles.altSourceBlock}>
                        <View style={styles.altSourceDivRow}>
                            <View style={styles.altDiv} />
                            <Text style={styles.altDivLabel}>or upload a file</Text>
                            <View style={styles.altDiv} />
                        </View>

                        <View style={styles.altBtnsRow}>
                            <TouchableOpacity style={styles.altBtn} onPress={pickImage} activeOpacity={0.85}>
                                <View style={[styles.altBtnIcon, { backgroundColor: 'rgba(77,159,255,0.1)' }]}>
                                    <Ionicons name="images-outline" size={18} color="#4D9FFF" />
                                </View>
                                <Text style={styles.altBtnTitle}>Gallery</Text>
                                <Text style={styles.altBtnSub}>Pick from photos</Text>
                            </TouchableOpacity>

                            <View style={styles.altBtnDiv} />

                            <TouchableOpacity style={styles.altBtn} onPress={pickDocument} activeOpacity={0.85}>
                                <View style={[styles.altBtnIcon, { backgroundColor: 'rgba(255,184,0,0.1)' }]}>
                                    <Ionicons name="document-outline" size={18} color="#FFB800" />
                                </View>
                                <Text style={styles.altBtnTitle}>PDF File</Text>
                                <Text style={styles.altBtnSub}>Pick from files</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ── TRUST ── */}
                    <View style={styles.trustRow}>
                        <Ionicons name="shield-checkmark-outline" size={13} color="#252538" />
                        <Text style={styles.trustText}>Stored securely · Never shared</Text>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#06060E' },
    scroll: { paddingTop: 8 },

    // ── HEADER ──
    header: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
        gap: 2,
    },
    headerSmall: {
        fontSize: 14,
        color: '#52526A',
        fontWeight: '500',
        letterSpacing: 0.1,
    },
    headerBig: {
        fontSize: 34,
        fontWeight: '800',
        color: '#F0F0F8',
        letterSpacing: -1.2,
        lineHeight: 38,
    },

    // ── SCAN ZONE ──
    scanZoneWrap: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    scanZone: {
        width: '100%',
        height: SCAN_SIZE * 0.62,
        backgroundColor: '#09090F',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#141428',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
        position: 'relative',
        overflow: 'hidden',
    },

    // Corner brackets
    corner: {
        position: 'absolute',
        width: 22,
        height: 22,
        borderColor: '#C41E3A',
    },
    cornerTL: {
        top: 14,
        left: 14,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderTopLeftRadius: 5,
    },
    cornerTR: {
        top: 14,
        right: 14,
        borderTopWidth: 2,
        borderRightWidth: 2,
        borderTopRightRadius: 5,
    },
    cornerBL: {
        bottom: 14,
        left: 14,
        borderBottomWidth: 2,
        borderLeftWidth: 2,
        borderBottomLeftRadius: 5,
    },
    cornerBR: {
        bottom: 14,
        right: 14,
        borderBottomWidth: 2,
        borderRightWidth: 2,
        borderBottomRightRadius: 5,
    },

    scanZoneCenter: {
        alignItems: 'center',
        gap: 10,
    },
    scanIconRing: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(196,30,58,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(196,30,58,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    scanZoneTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#E0E0EC',
        letterSpacing: -0.3,
    },
    scanZoneSub: {
        fontSize: 12,
        color: '#323244',
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 18,
    },
    scanZoneTapHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    scanZoneTapText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#C41E3A',
        letterSpacing: 1.5,
        opacity: 0.7,
    },
    examsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 7,
    },
    examChip: {
        backgroundColor: '#0B0B17',
        borderRadius: 7,
        borderWidth: 1,
        borderColor: '#141428',
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    examChipText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#38384A',
        letterSpacing: 0.5,
    },

    // ── WORKS WITH BLOCK ──
    worksWithBlock: {
        paddingHorizontal: 24,
        marginBottom: 20,
        gap: 10,
    },
    worksWithLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#38384A',
        letterSpacing: 0.2,
    },

    // ── ALT SOURCE (Gallery + PDF) ──
    altSourceBlock: {
        paddingHorizontal: 24,
        marginBottom: 18,
        gap: 14,
    },
    altSourceDivRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    altDiv: {
        flex: 1,
        height: 1,
        backgroundColor: '#141428',
    },
    altDivLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#252538',
        letterSpacing: 0.3,
    },
    altBtnsRow: {
        flexDirection: 'row',
        backgroundColor: '#0B0B17',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#141428',
        overflow: 'hidden',
    },
    altBtn: {
        flex: 1,
        paddingVertical: 18,
        paddingHorizontal: 14,
        alignItems: 'center',
        gap: 8,
    },
    altBtnDiv: {
        width: 1,
        backgroundColor: '#141428',
        marginVertical: 14,
    },
    altBtnIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    altBtnTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#E0E0EC',
        letterSpacing: -0.1,
    },
    altBtnSub: {
        fontSize: 10,
        color: '#323244',
        fontWeight: '500',
    },

    // ── TRUST ──
    trustRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 24,
    },
    trustText: {
        fontSize: 11,
        color: '#252538',
        fontWeight: '500',
    },

    // ── FILE SELECTED STATE ──
    confirmCard: {
        marginHorizontal: 24,
        backgroundColor: '#0B0B17',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,230,118,0.2)',
        padding: 22,
        gap: 12,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 20,
    },
    confirmGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: '#00E676',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    confirmIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    confirmIconBox: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(0,230,118,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(0,230,118,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmReadyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,230,118,0.08)',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: 'rgba(0,230,118,0.18)',
    },
    confirmReadyDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00E676',
    },
    confirmReadyText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#00E676',
        letterSpacing: 1.5,
    },
    confirmFileName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F0F0F8',
        letterSpacing: -0.3,
        lineHeight: 22,
    },
    confirmFileType: {
        fontSize: 12,
        color: '#52526A',
        fontWeight: '500',
    },
    confirmDiv: {
        height: 1,
        backgroundColor: '#141428',
        marginVertical: 4,
    },
    confirmWillExtract: {
        fontSize: 9,
        fontWeight: '700',
        color: '#252538',
        letterSpacing: 2,
        marginBottom: 4,
    },
    extractGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    extractChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(0,230,118,0.06)',
        borderRadius: 7,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: 'rgba(0,230,118,0.12)',
    },
    extractChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#A0A0B8',
        letterSpacing: 0.1,
    },

    // ── CTA ──
    ctaBlock: {
        paddingHorizontal: 24,
        gap: 12,
    },
    scanBtn: {
        backgroundColor: '#C41E3A',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    scanBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
    },
    scanBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: -0.2,
    },
    changeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
    },
    changeBtnText: {
        fontSize: 12,
        color: '#38384A',
        fontWeight: '500',
    },
});