import { API_URL } from './config';
const API_BASE = API_URL + '/api';

async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('customer_token');
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('customer_token');
      localStorage.removeItem('customer_user');
      window.location.reload();
      return;
    }
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  sendOTP: (email) => fetchAPI('/auth/send-otp', { method: 'POST', body: JSON.stringify({ email, role: 'customer' }) }),
  verifyOTP: (email, otp) => fetchAPI('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp, role: 'customer' }) }),
  getVehicleTypes: () => fetchAPI('/admin/vehicle-types'),
  getExtras: () => fetchAPI('/admin/extras'),
  createBooking: (data) => fetchAPI('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  getBookings: (customerId) => fetchAPI(`/bookings?customerId=${customerId}`),
  getBooking: (id) => fetchAPI(`/bookings/${id}`),
  rateBooking: (id, rating, review) => fetchAPI(`/bookings/${id}/rate`, { method: 'PUT', body: JSON.stringify({ rating, review }) }),
  cancelBooking: (id) => fetchAPI(`/bookings/${id}/cancel`, { method: 'PUT' }),
  geocode: (address) => fetchAPI(`/geocode?address=${encodeURIComponent(address)}`),
  autocomplete: (query) => fetchAPI(`/autocomplete?query=${encodeURIComponent(query)}`),
  getDistance: (pickupLat, pickupLng, dropoffLat, dropoffLng) =>
    fetchAPI(`/distance?pickupLat=${pickupLat}&pickupLng=${pickupLng}&dropoffLat=${dropoffLat}&dropoffLng=${dropoffLng}`),

  // Chat with driver
  getDriverChat: (bookingId) => fetchAPI(`/chat/driver/${bookingId}`),
  sendDriverMessage: (bookingId, from, fromId, fromName, message) =>
    fetchAPI(`/chat/driver/${bookingId}`, { method: 'POST', body: JSON.stringify({ from, fromId, fromName, message }) }),

  // Chat with company
  getCompanyChats: (customerId) => fetchAPI(`/chat/company/customer/${customerId}`),
  sendCompanyMessage: (customerId, customerName, bookingId, from, fromName, message) =>
    fetchAPI('/chat/company', { method: 'POST', body: JSON.stringify({ customerId, customerName, bookingId, from, fromName, message }) }),

  // AI Chat
  sendAIMessage: (message, bookingId, customerId, history) =>
    fetchAPI('/ai-chat', { method: 'POST', body: JSON.stringify({ message, bookingId, customerId, history }) }),
};
