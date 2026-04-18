// services/navigationService.js
// Navigation API calls
// Talks to /api/v1/navigation/* endpoints

import apiClient from './api';
import API from '../constants/api';

const navigationService = {

  // Get directions from student's current location to exam center
  // origin_lat, origin_lng → student's GPS coordinates
  // exam_id → to look up exam center address from DB
  getDirections: async (examId, originLat, originLng) => {
    const response = await apiClient.post(API.ENDPOINTS.GET_DIRECTIONS, {
      exam_id: examId,
      origin_lat: originLat,
      origin_lng: originLng,
    });
    return response.data;
  },

  // Get crowdsourced insights about the exam center
  // Shows security strictness, locker availability, etc.
  getCenterInfo: async (examId) => {
    const response = await apiClient.get(API.ENDPOINTS.GET_CENTER_INFO(examId));
    return response.data;
  },

};

export default navigationService;