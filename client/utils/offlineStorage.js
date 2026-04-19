// utils/offlineStorage.js
// Handles saving and reading exam data from AsyncStorage
// Used for offline mode — student can view exam info without internet

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
    OFFLINE_EXAMS: 'offline_exams',
    OFFLINE_CHECKLIST_PREFIX: 'offline_checklist_',
};

const offlineStorage = {

    // Save exam details to AsyncStorage
    // Called after admit card is parsed successfully
    saveExam: async (exam) => {
        try {
            // Get existing offline exams
            const existing = await offlineStorage.getAllExams();

            // Check if exam already exists — update it
            const index = existing.findIndex((e) => e.id === exam.id);
            if (index >= 0) {
                existing[index] = exam;
            } else {
                existing.unshift(exam); // add to top
            }

            await AsyncStorage.setItem(
                KEYS.OFFLINE_EXAMS,
                JSON.stringify(existing)
            );
            console.log('Exam saved offline:', exam.exam_name);
        } catch (error) {
            console.log('Failed to save exam offline:', error);
        }
    },

    // Save checklist items for an exam
    // Called after checklist is generated
    saveChecklist: async (examId, items) => {
        try {
            await AsyncStorage.setItem(
                `${KEYS.OFFLINE_CHECKLIST_PREFIX}${examId}`,
                JSON.stringify(items)
            );
            console.log('Checklist saved offline for exam:', examId);
        } catch (error) {
            console.log('Failed to save checklist offline:', error);
        }
    },

    // Get all offline exams
    getAllExams: async () => {
        try {
            const data = await AsyncStorage.getItem(KEYS.OFFLINE_EXAMS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.log('Failed to get offline exams:', error);
            return [];
        }
    },

    // Get a single exam by ID
    getExam: async (examId) => {
        try {
            const exams = await offlineStorage.getAllExams();
            return exams.find((e) => e.id === examId) || null;
        } catch (error) {
            console.log('Failed to get offline exam:', error);
            return null;
        }
    },

    // Get checklist for an exam
    getChecklist: async (examId) => {
        try {
            const data = await AsyncStorage.getItem(
                `${KEYS.OFFLINE_CHECKLIST_PREFIX}${examId}`
            );
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.log('Failed to get offline checklist:', error);
            return [];
        }
    },

    // Update a single checklist item (for offline toggle)
    updateChecklistItem: async (examId, itemId, isChecked) => {
        try {
            const items = await offlineStorage.getChecklist(examId);
            const updated = items.map((item) =>
                item.id === itemId ? { ...item, is_checked: isChecked } : item
            );
            await offlineStorage.saveChecklist(examId, updated);
        } catch (error) {
            console.log('Failed to update offline checklist item:', error);
        }
    },

    // Delete an exam from offline storage
    deleteExam: async (examId) => {
        try {
            const exams = await offlineStorage.getAllExams();
            const filtered = exams.filter((e) => e.id !== examId);
            await AsyncStorage.setItem(
                KEYS.OFFLINE_EXAMS,
                JSON.stringify(filtered)
            );
            await AsyncStorage.removeItem(
                `${KEYS.OFFLINE_CHECKLIST_PREFIX}${examId}`
            );
            console.log('Exam deleted from offline storage:', examId);
        } catch (error) {
            console.log('Failed to delete offline exam:', error);
        }
    },

    // Clear all offline data
    clearAll: async () => {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const examKeys = keys.filter(
                (k) => k === KEYS.OFFLINE_EXAMS || k.startsWith(KEYS.OFFLINE_CHECKLIST_PREFIX)
            );
            await AsyncStorage.multiRemove(examKeys);
            console.log('All offline data cleared');
        } catch (error) {
            console.log('Failed to clear offline data:', error);
        }
    },
};

export default offlineStorage;