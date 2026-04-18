// store/examStore.js
// Global exam state using Zustand
// Stores the list of exams and currently viewed exam
// Any screen can access exam data without re-fetching from API

import { create } from 'zustand';
import examService from '../services/examService';
import dashboardService from '../services/dashboardService';
import checklistService from '../services/checklistService';
import navigationService from '../services/navigationService';

const useExamStore = create((set, get) => ({
  // ---------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------
  exams: [],               // list of all user's exams
  currentExam: null,       // exam currently being viewed
  currentChecklist: [],    // checklist for current exam
  notAllowed: [],          // items not allowed in exam hall
  dashboardData: null,     // full dashboard data
  isLoading: false,
  isUploading: false,      // true while parsing admit card
  error: null,
  navigationData: null,      // distance, duration, links from backend
  navigationLoading: false,  // true while fetching directions
  navigationError: null,     // error if location/API fails

  // ---------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------

  // Fetch main dashboard (upcoming + past exams + profile)
  fetchDashboard: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await dashboardService.getDashboard();
      set({ dashboardData: response, isLoading: false });
    } catch (error) {
      set({
        error: 'Failed to load dashboard.',
        isLoading: false,
      });
    }
  },

  // Fetch single exam full details + checklist
  fetchExamDashboard: async (examId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await dashboardService.getExamDashboard(examId);
      set({
        currentExam: response.exam,
        currentChecklist: response.checklist,
        isLoading: false,
      });
      return response;
    } catch (error) {
      set({ error: 'Failed to load exam.', isLoading: false });
    }
  },

  // Upload and parse admit card
  // On success → auto generate checklist → navigate to exam dashboard
  uploadAdmitCard: async (file) => {
    try {
      set({ isUploading: true, error: null });
      const response = await examService.parseAdmitCard(file);

      // After parsing → generate default checklist automatically
      await checklistService.generateChecklist(response.exam.id);

      // Add new exam to top of list
      set((state) => ({
        exams: [response.exam, ...state.exams],
        isUploading: false,
      }));

      return { success: true, exam: response.exam };
    } catch (error) {
      const message =
        error.response?.data?.error || 'Failed to parse admit card.';
      set({ error: message, isUploading: false });
      return { success: false, error: message };
    }
  },

  // Fetch checklist for current exam
  fetchChecklist: async (examId) => {
    try {
      const response = await checklistService.getChecklist(examId);
      set({
        currentChecklist: response.items,
        notAllowed: response.not_allowed,
      });
    } catch (error) {
      set({ error: 'Failed to load checklist.' });
    }
  },

  // Toggle checklist item checked/unchecked
  toggleChecklistItem: async (itemId, currentValue) => {
    // Optimistic update → update UI instantly before API call
    // This makes the app feel fast and responsive
    set((state) => ({
      currentChecklist: state.currentChecklist.map((item) =>
        item.id === itemId ? { ...item, is_checked: !currentValue } : item
      ),
    }));

    try {
      await checklistService.updateItem(itemId, !currentValue);
    } catch (error) {
      // If API fails → revert the optimistic update
      set((state) => ({
        currentChecklist: state.currentChecklist.map((item) =>
          item.id === itemId ? { ...item, is_checked: currentValue } : item
        ),
      }));
    }
  },

  // Delete an exam from list
  deleteExam: async (examId) => {
    try {
      await examService.deleteExam(examId);
      set((state) => ({
        exams: state.exams.filter((e) => e.id !== examId),
      }));
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  // Clear current exam when leaving exam screen
  clearCurrentExam: () => {
    set({ currentExam: null, currentChecklist: [], notAllowed: [] });
  },

  clearError: () => set({ error: null }),

  // Fetch directions from current location to exam center
  fetchDirections: async (examId, lat, lng) => {
    try {
      set({ navigationLoading: true, navigationError: null });
      const response = await navigationService.getDirections(examId, lat, lng);
      set({ navigationData: response, navigationLoading: false });
      return { success: true, data: response };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to get directions.';
      set({ navigationError: message, navigationLoading: false });
      return { success: false, error: message };
    }
  },

  // Clear navigation data when leaving exam screen
  clearNavigation: () => {
    set({ navigationData: null, navigationError: null });
  },
}));

export default useExamStore;