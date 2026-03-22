const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + '/api';

async function fetchAPI(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bestclass_admin_token') : null;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('bestclass_admin_token');
      window.location.href = '/login';
      return;
    }
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  adminLogin: (username, password) => fetchAPI('/auth/admin-login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  // Dashboard
  getStats: () => fetchAPI('/admin/stats'),
  getReports: () => fetchAPI('/admin/reports'),

  // Bookings
  getBookings: (query = '') => fetchAPI(`/bookings${query ? `?${query}` : ''}`),
  getBooking: (id) => fetchAPI(`/bookings/${id}`),
  createBooking: (data) => fetchAPI('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  assignDriver: (bookingId, driverId) => fetchAPI(`/bookings/${bookingId}/assign`, { method: 'PUT', body: JSON.stringify({ driverId }) }),
  cancelBooking: (id) => fetchAPI(`/bookings/${id}/cancel`, { method: 'PUT' }),

  // Drivers
  getDrivers: () => fetchAPI('/drivers'),
  getDriver: (id) => fetchAPI(`/drivers/${id}`),
  getDriverEarnings: (id) => fetchAPI(`/drivers/${id}/earnings`),

  // Customers
  getCustomers: () => fetchAPI('/admin/customers'),

  // Vehicle types & extras
  getVehicleTypes: () => fetchAPI('/admin/vehicle-types'),
  getExtras: () => fetchAPI('/admin/extras'),

  // Settings
  getSettings: () => fetchAPI('/admin/settings'),
  updateSettings: (data) => fetchAPI('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Chat / Customer Messages
  getCompanyChats: () => fetchAPI('/chat/company'),
  getCompanyChat: (chatId) => fetchAPI(`/chat/company/${chatId}`),
  sendCompanyReply: (customerId, customerName, bookingId, fromName, message) =>
    fetchAPI('/chat/company', { method: 'POST', body: JSON.stringify({ customerId, customerName, bookingId, from: 'admin', fromName, message }) }),
  resolveChat: (chatId) => fetchAPI(`/chat/company/${chatId}/resolve`, { method: 'PUT' }),

  // Geocoding
  geocode: (address) => fetchAPI(`/geocode?address=${encodeURIComponent(address)}`),
  autocomplete: (query) => fetchAPI(`/autocomplete?query=${encodeURIComponent(query)}`),
  getDistance: (pickupLat, pickupLng, dropoffLat, dropoffLng) =>
    fetchAPI(`/distance?pickupLat=${pickupLat}&pickupLng=${pickupLng}&dropoffLat=${dropoffLat}&dropoffLng=${dropoffLng}`),
};
