// services/checklistService.js
// Checklist API calls
// Talks to /api/v1/checklist/* endpoints

import apiClient from './api';
import API from '../constants/api';

const checklistService = {

  // Auto generate default checklist for an exam
  // Called right after admit card is parsed
  generateChecklist: async (examId) => {
    const response = await apiClient.post(
      API.ENDPOINTS.GENERATE_CHECKLIST(examId)
    );
    return response.data;
  },

  // Get all checklist items for an exam
  getChecklist: async (examId) => {
    const response = await apiClient.get(API.ENDPOINTS.GET_CHECKLIST(examId));
    return response.data;
  },

  // Tick or untick a checklist item
  // isChecked: true → item ticked, false → unticked
  updateItem: async (itemId, isChecked) => {
    const response = await apiClient.patch(
      API.ENDPOINTS.UPDATE_CHECKLIST_ITEM(itemId),
      { is_checked: isChecked }
    );
    return response.data;
  },

  // Add a custom item to checklist
  addItem: async (examId, itemName) => {
    const response = await apiClient.post(
      API.ENDPOINTS.ADD_CHECKLIST_ITEM(examId),
      { item_name: itemName }
    );
    return response.data;
  },

  // Delete a checklist item
  deleteItem: async (itemId) => {
    const response = await apiClient.delete(
      API.ENDPOINTS.DELETE_CHECKLIST_ITEM(itemId)
    );
    return response.data;
  },
};

export default checklistService;