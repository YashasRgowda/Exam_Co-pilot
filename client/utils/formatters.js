// utils/formatters.js
// Helper functions to format dates and times
// Used across multiple screens

// Converts "2026-04-15" → "April 15, 2026"
export const formatDate = (dateString) => {
  if (!dateString) return 'Date not available';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Converts "14:30:00" → "2:30 PM"
export const formatTime = (timeString) => {
  if (!timeString) return 'Time not available';
  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
};

// Converts days_remaining number → readable string
// -5 → "Exam passed"
// 0  → "Exam is today!"
// 1  → "Tomorrow"
// 5  → "5 days remaining"
export const formatDaysRemaining = (days) => {
  if (days < 0) return 'Exam passed';
  if (days === 0) return 'Exam is today!';
  if (days === 1) return 'Tomorrow';
  return `${days} days remaining`;
};

// Returns color based on days remaining
// Red if < 3 days, Orange if < 7, Green otherwise
export const getDaysColor = (days) => {
  if (days < 0) return '#9CA3AF';
  if (days <= 3) return '#EF4444';
  if (days <= 7) return '#F59E0B';
  return '#10B981';
};

// Truncates long text with ellipsis
// "Very long exam center name..." 
export const truncate = (text, maxLength = 40) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};