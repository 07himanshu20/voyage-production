import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://localhost:3001/api';

async function getToken() {
  try { return await AsyncStorage.getItem('customer_token'); } catch { return null; }
}

async function fetchAPI(endpoint, options = {}) {
  const token = await getToken();
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
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
  } catch (e) {
    console.error(`[Best Class API] ${endpoint} failed:`, e.message);
    throw e;
  }
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
  getDistance: (pickupLat, pickupLng, dropoffLat, dropoffLng) =>
    fetchAPI(`/distance?pickupLat=${pickupLat}&pickupLng=${pickupLng}&dropoffLat=${dropoffLat}&dropoffLng=${dropoffLng}`),
};
