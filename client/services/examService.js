// services/examService.js
// All exam and admit card related API calls
// Talks to /api/v1/admit-card/* endpoints

import apiClient from './api';
import API from '../constants/api';

const examService = {

  // Upload admit card image/PDF → AI parses it
  // file object comes from expo-document-picker or expo-image-picker
  // We use FormData because we are sending a file not JSON
  parseAdmitCard: async (file) => {
    const formData = new FormData();

    // Append file to form data
    // name: field name our backend expects
    // type: mime type of file
    formData.append('file', {
      uri: file.uri,
      name: file.name || 'admit_card.jpg',
      type: file.mimeType || 'image/jpeg',
    });

    const response = await apiClient.post(
      API.ENDPOINTS.PARSE_ADMIT_CARD,
      formData,
      {
        headers: {
          // Override Content-Type for file upload
          // multipart/form-data tells server we are sending a file
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Get all exams for logged in user
  getAllExams: async () => {
    const response = await apiClient.get(API.ENDPOINTS.GET_ALL_EXAMS);
    return response.data;
  },

  // Get single exam by ID
  getExamById: async (examId) => {
    const response = await apiClient.get(API.ENDPOINTS.GET_EXAM_BY_ID(examId));
    return response.data;
  },

  // Delete an exam
  deleteExam: async (examId) => {
    const response = await apiClient.delete(API.ENDPOINTS.DELETE_EXAM(examId));
    return response.data;
  },
};

export default examService;