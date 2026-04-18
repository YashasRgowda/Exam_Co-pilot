// constants/api.js
// Backend API configuration
// Change BASE_URL here when deploying to production

const API = {
  // Your FastAPI backend running locally
  // When testing on simulator, localhost works fine
  BASE_URL: 'http://192.168.0.6:8000',

  // All API endpoint paths
  ENDPOINTS: {
    // Auth
    SEND_OTP: '/api/v1/auth/send-otp',
    VERIFY_OTP: '/api/v1/auth/verify-otp',
    GET_PROFILE: '/api/v1/auth/me',
    UPDATE_PROFILE: '/api/v1/auth/me',

    // Admit Card
    PARSE_ADMIT_CARD: '/api/v1/admit-card/parse',
    GET_ALL_EXAMS: '/api/v1/admit-card/exams',
    GET_EXAM_BY_ID: (id) => `/api/v1/admit-card/exams/${id}`,
    DELETE_EXAM: (id) => `/api/v1/admit-card/exams/${id}`,

    // Dashboard
    GET_DASHBOARD: '/api/v1/dashboard/',
    GET_EXAM_DASHBOARD: (id) => `/api/v1/dashboard/exam/${id}`,

    // Checklist
    GENERATE_CHECKLIST: (examId) => `/api/v1/checklist/generate/${examId}`,
    GET_CHECKLIST: (examId) => `/api/v1/checklist/${examId}`,
    UPDATE_CHECKLIST_ITEM: (itemId) => `/api/v1/checklist/${itemId}`,
    ADD_CHECKLIST_ITEM: (examId) => `/api/v1/checklist/${examId}/add`,
    DELETE_CHECKLIST_ITEM: (itemId) => `/api/v1/checklist/${itemId}`,

    // Navigation
    GET_DIRECTIONS: '/api/v1/navigation/directions',
    GET_CENTER_INFO: (examId) => `/api/v1/navigation/exam-center-info/${examId}`,

    // Notifications
    REGISTER_PUSH_TOKEN: '/api/v1/notifications/register',

    // Feedback
    SUBMIT_FEEDBACK: '/api/v1/feedback/submit',
    GET_CENTER_FEEDBACK: (examId) => `/api/v1/feedback/center/${examId}`,
    GET_MY_FEEDBACK: (examId) => `/api/v1/feedback/my/${examId}`,
  },
};

export default API;