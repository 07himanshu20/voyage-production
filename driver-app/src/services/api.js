import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://localhost:3001/api';

async function getToken() {
  try {
    return await AsyncStorage.getItem('driver_token');
  } catch {
    return null;
  }
}

async function fetchAPI(endpoint, options = {}) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  sendOTP: (email) => fetchAPI('/auth/send-otp', { method: 'POST', body: JSON.stringify({ email, role: 'driver' }) }),
  verifyOTP: (email, otp) => fetchAPI('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp, role: 'driver' }) }),
  getBookings: (driverId) => fetchAPI(`/bookings?driverId=${driverId}`),
  respondBooking: (bookingId, action) => fetchAPI(`/bookings/${bookingId}/respond`, { method: 'PUT', body: JSON.stringify({ action }) }),
  updateTripStatus: (bookingId, tripStatus) => fetchAPI(`/bookings/${bookingId}/trip-status`, { method: 'PUT', body: JSON.stringify({ tripStatus }) }),
  updateLocation: (driverId, lat, lng) => fetchAPI(`/drivers/${driverId}/location`, { method: 'PUT', body: JSON.stringify({ lat, lng }) }),
  updateStatus: (driverId, status) => fetchAPI(`/drivers/${driverId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  updateProfile: (driverId, data) => fetchAPI(`/drivers/${driverId}/profile`, { method: 'PUT', body: JSON.stringify(data) }),
  getEarnings: (driverId) => fetchAPI(`/drivers/${driverId}/earnings`),
  getDriver: (driverId) => fetchAPI(`/drivers/${driverId}`),
};
