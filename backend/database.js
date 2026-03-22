// In-memory database for prototype
const { v4: uuidv4 } = require('uuid');

const db = {
  admins: [
    { id: 'admin-1', username: 'admin', password: 'admin123', name: 'Operations Manager', role: 'super_admin' },
    { id: 'admin-2', username: 'arjun', password: 'arjun123', name: 'Arjun', role: 'admin' },
  ],

  drivers: [
    {
      id: 'DRV-001', name: 'James Mitchell', email: 'james@bestclass.com', phone: '+44 7700 900001',
      avatar: null, status: 'available', rating: 4.9, totalTrips: 342, earnings: 28450.00,
      vehicle: { make: 'Mercedes-Benz', model: 'S-Class S500', year: 2024, plate: 'LC24 XYZ', color: 'Black', type: 'Sedan' },
      location: { lat: 51.5074, lng: -0.1278 }, verified: true, password: 'driver123',
    },
    {
      id: 'DRV-002', name: 'William Parker', email: 'william@bestclass.com', phone: '+44 7700 900002',
      avatar: null, status: 'available', rating: 4.8, totalTrips: 289, earnings: 24120.00,
      vehicle: { make: 'BMW', model: '7 Series 740i', year: 2024, plate: 'LC24 ABC', color: 'Black', type: 'Sedan' },
      location: { lat: 51.5155, lng: -0.1415 }, verified: true, password: 'driver123',
    },
    {
      id: 'DRV-003', name: 'Robert Hughes', email: 'robert@bestclass.com', phone: '+44 7700 900003',
      avatar: null, status: 'available', rating: 4.95, totalTrips: 456, earnings: 38900.00,
      vehicle: { make: 'Rolls-Royce', model: 'Ghost', year: 2023, plate: 'LC23 RRG', color: 'Silver', type: 'Luxury' },
      location: { lat: 51.5033, lng: -0.1195 }, verified: true, password: 'driver123',
    },
    {
      id: 'DRV-004', name: 'Thomas Bennett', email: 'thomas@bestclass.com', phone: '+44 7700 900004',
      avatar: null, status: 'available', rating: 4.85, totalTrips: 198, earnings: 16800.00,
      vehicle: { make: 'Mercedes-Benz', model: 'V-Class V300', year: 2024, plate: 'LC24 VCL', color: 'Black', type: 'MPV' },
      location: { lat: 51.4700, lng: -0.4543 }, verified: true, password: 'driver123',
    },
    {
      id: 'DRV-005', name: 'Edward Collins', email: 'edward@bestclass.com', phone: '+44 7700 900005',
      avatar: null, status: 'offline', rating: 4.7, totalTrips: 124, earnings: 10500.00,
      vehicle: { make: 'Range Rover', model: 'Autobiography', year: 2024, plate: 'LC24 RRA', color: 'Grey', type: 'SUV' },
      location: { lat: 51.4775, lng: -0.4614 }, verified: true, password: 'driver123',
    },
  ],

  customers: [
    {
      id: 'CUS-001', name: 'Sir Richard Ashworth', email: 'richard@bestclass.com', phone: '+44 7800 100001',
      password: 'customer123', verified: true, totalBookings: 12, loyaltyTier: 'Platinum',
    },
    {
      id: 'CUS-002', name: 'Lady Catherine Pembroke', email: 'catherine@bestclass.com', phone: '+44 7800 100002',
      password: 'customer123', verified: true, totalBookings: 8, loyaltyTier: 'Gold',
    },
    {
      id: 'CUS-003', name: 'Mr. Alexander Chen', email: 'alex@bestclass.com', phone: '+44 7800 100003',
      password: 'customer123', verified: true, totalBookings: 3, loyaltyTier: 'Silver',
    },
  ],

  bookings: [
    {
      id: 'BK-10001', customerId: 'CUS-001', customerName: 'Sir Richard Ashworth',
      driverId: 'DRV-003', driverName: 'Robert Hughes',
      pickup: { address: 'The Ritz London, 150 Piccadilly, London W1J 9BR', lat: 51.5074, lng: -0.1419 },
      dropoff: { address: 'Heathrow Airport Terminal 5, London TW6 2GA', lat: 51.4700, lng: -0.4543 },
      date: '2026-03-10', time: '14:00',
      vehicleType: 'Luxury', vehicleName: 'Rolls-Royce Ghost',
      status: 'completed', tripStatus: 'completed',
      fare: { base: 185.00, extras: 25.00, total: 210.00 },
      extras: ['Complimentary water', 'Daily newspaper'],
      notes: 'VIP Guest - Handle with utmost care', rating: null, review: null,
      createdAt: '2026-03-10T10:30:00Z', source: 'app',
    },
    {
      id: 'BK-10002', customerId: 'CUS-002', customerName: 'Lady Catherine Pembroke',
      driverId: null, driverName: null,
      pickup: { address: 'Claridges Hotel, Brook Street, London W1K 4HR', lat: 51.5126, lng: -0.1490 },
      dropoff: { address: 'Royal Albert Hall, Kensington Gore, London SW7 2AP', lat: 51.5009, lng: -0.1774 },
      date: '2026-03-10', time: '18:30',
      vehicleType: 'Sedan', vehicleName: 'Mercedes-Benz S-Class',
      status: 'pending', tripStatus: null,
      fare: { base: 65.00, extras: 15.00, total: 80.00 },
      extras: ['Champagne service'],
      notes: 'Evening event - formal attire required for chauffeur', rating: null, review: null,
      createdAt: '2026-03-10T09:15:00Z', source: 'app',
    },
    {
      id: 'BK-10003', customerId: null, customerName: 'Mr. Yoshida Tanaka',
      driverId: 'DRV-002', driverName: 'William Parker',
      pickup: { address: 'The Savoy, Strand, London WC2R 0EZ', lat: 51.5104, lng: -0.1205 },
      dropoff: { address: 'London City Airport, Royal Docks, London E16 2PX', lat: 51.5048, lng: 0.0495 },
      date: '2026-03-10', time: '09:00',
      vehicleType: 'Sedan', vehicleName: 'BMW 7 Series',
      status: 'completed', tripStatus: 'completed',
      fare: { base: 95.00, extras: 0, total: 95.00 },
      extras: [],
      notes: 'Hotel concierge booking - The Savoy', rating: 5, review: 'Excellent service, very punctual.',
      createdAt: '2026-03-09T20:00:00Z', source: 'hotel_partner',
    },
    {
      id: 'BK-10004', customerId: 'CUS-003', customerName: 'Mr. Alexander Chen',
      driverId: null, driverName: null,
      pickup: { address: 'Four Seasons Hotel, Hamilton Place, London W1J 7DR', lat: 51.5044, lng: -0.1492 },
      dropoff: { address: 'O2 Arena, Peninsula Square, London SE10 0DX', lat: 51.5030, lng: 0.0032 },
      date: '2026-03-11', time: '19:00',
      vehicleType: 'MPV', vehicleName: 'Mercedes-Benz V-Class',
      status: 'confirmed', tripStatus: null,
      fare: { base: 120.00, extras: 35.00, total: 155.00 },
      extras: ['Complimentary water', 'Child seat'],
      notes: 'Family of 4, requires child seat for 3-year-old', rating: null, review: null,
      createdAt: '2026-03-10T08:00:00Z', source: 'app',
    },
  ],

  vehicleTypes: [
    { id: 'sedan', name: 'Executive Sedan', description: 'Mercedes S-Class / BMW 7 Series', baseRate: 3.50, minFare: 45.00, image: 'sedan', capacity: 3 },
    { id: 'suv', name: 'Luxury SUV', description: 'Range Rover Autobiography', baseRate: 4.50, minFare: 65.00, image: 'suv', capacity: 4 },
    { id: 'mpv', name: 'Executive MPV', description: 'Mercedes V-Class', baseRate: 4.00, minFare: 55.00, image: 'mpv', capacity: 6 },
    { id: 'luxury', name: 'Ultra Luxury', description: 'Rolls-Royce Ghost / Bentley Flying Spur', baseRate: 8.00, minFare: 150.00, image: 'luxury', capacity: 3 },
  ],

  extras: [
    { id: 'water', name: 'Complimentary water', price: 0, default: true },
    { id: 'newspaper', name: 'Daily newspaper', price: 0, default: false },
    { id: 'champagne', name: 'Champagne service', price: 25.00, default: false },
    { id: 'wifi', name: 'Portable Wi-Fi hotspot', price: 10.00, default: false },
    { id: 'child_seat', name: 'Child seat', price: 15.00, default: false },
    { id: 'food', name: 'Gourmet snack hamper', price: 35.00, default: false },
    { id: 'flowers', name: 'Fresh flower arrangement', price: 20.00, default: false },
  ],

  notifications: [],

  settings: {
    companyName: 'Best Class Chauffeurs',
    contactEmail: 'info@bestclass.com',
    phone: '+44 20 7946 0958',
    website: 'https://bestclass.com',
    notifications: {
      newBookingAlerts: true,
      tripStatusChanges: true,
      driverLocationUpdates: true,
      paymentConfirmations: true,
      customerReviews: true,
    },
  },

  otpStore: {},

  // Chat messages storage
  // Each message: { id, bookingId, from: 'customer'|'driver'|'admin'|'ai', fromId, fromName, to: 'driver'|'company'|'ai', message, timestamp }
  chatMessages: [],

  // Company chat conversations (customer <-> web portal)
  // Each: { id, customerId, customerName, bookingId, bookingRef, messages: [], createdAt, lastMessageAt, status: 'open'|'resolved' }
  companyChats: [],
};

// Helper to generate booking ID
let bookingCounter = 10005;
db.nextBookingId = () => `BK-${bookingCounter++}`;

module.exports = db;
