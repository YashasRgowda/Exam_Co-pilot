// services/dashboardService.js
// Dashboard API calls
// Talks to /api/v1/dashboard/* endpoints

import apiClient from './api';
import API from '../constants/api';

const dashboardService = {

  // Get main dashboard — profile + upcoming + past exams
  getDashboard: async () => {
    const response = await apiClient.get(API.ENDPOINTS.GET_DASHBOARD);
    return response.data;
  },

  // Get single exam full dashboard
  // Returns exam + checklist + days_remaining + notifications
  getExamDashboard: async (examId) => {
    const response = await apiClient.get(
      API.ENDPOINTS.GET_EXAM_DASHBOARD(examId)
    );
    return response.data;
  },
};

export default dashboardService;