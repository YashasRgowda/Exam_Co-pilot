// services/feedbackService.js
// Feedback API calls
// Talks to /api/v1/feedback/* endpoints

import apiClient from './api';
import API from '../constants/api';

const feedbackService = {

  // Submit post exam feedback about the exam center
  submitFeedback: async (feedbackData) => {
    const response = await apiClient.post(
      API.ENDPOINTS.SUBMIT_FEEDBACK,
      feedbackData
    );
    return response.data;
  },

  // Get crowd sourced feedback for an exam center
  getCenterFeedback: async (examId) => {
    const response = await apiClient.get(
      API.ENDPOINTS.GET_CENTER_FEEDBACK(examId)
    );
    return response.data;
  },

  // Check if current user already submitted feedback
  getMyFeedback: async (examId) => {
    const response = await apiClient.get(
      API.ENDPOINTS.GET_MY_FEEDBACK(examId)
    );
    return response.data;
  },
};

export default feedbackService;