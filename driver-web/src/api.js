import { API_URL } from './config';
const API = API_URL + '/api';

async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('driver_token');
  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('driver_token');
      localStorage.removeItem('driver_user');
      window.location.href = '/';
      return;
    }
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  sendOTP: (email) => fetchAPI('/auth/send-otp', { method: 'POST', body: JSON.stringify({ email, role: 'driver' }) }),
  verifyOTP: (email, otp) => fetchAPI('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp, role: 'driver' }) }),
  getBookings: (driverId) => fetchAPI(`/bookings?driverId=${driverId}`),
  respondBooking: (id, action) => fetchAPI(`/bookings/${id}/respond`, { method: 'PUT', body: JSON.stringify({ action }) }),
  updateTripStatus: (id, tripStatus, driverLocation) => fetchAPI(`/bookings/${id}/trip-status`, { method: 'PUT', body: JSON.stringify({ tripStatus, driverLocation }) }),
  getBooking: (id) => fetchAPI(`/bookings/${id}`),
  updateStatus: (driverId, status) => fetchAPI(`/drivers/${driverId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  updateProfile: (driverId, data) => fetchAPI(`/drivers/${driverId}/profile`, { method: 'PUT', body: JSON.stringify(data) }),
  getEarnings: (driverId) => fetchAPI(`/drivers/${driverId}/earnings`),
  getDriver: (driverId) => fetchAPI(`/drivers/${driverId}`),

  // Chat
  getDriverChat: (bookingId) => fetchAPI(`/chat/driver/${bookingId}`),
  sendDriverMessage: (bookingId, from, fromId, fromName, message) =>
    fetchAPI(`/chat/driver/${bookingId}`, { method: 'POST', body: JSON.stringify({ from, fromId, fromName, message }) }),
};
