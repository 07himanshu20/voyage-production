const express = require('express');
const router = express.Router();
const db = require('../database');
const { verifyToken } = require('../middleware/auth');

// Get all bookings (admin)
router.get('/', verifyToken, (req, res) => {
  const { status, driverId, customerId } = req.query;
  let bookings = [...db.bookings];

  if (status) bookings = bookings.filter(b => b.status === status);
  if (driverId) bookings = bookings.filter(b => b.driverId === driverId);
  if (customerId) bookings = bookings.filter(b => b.customerId === customerId);

  bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ bookings });
});

// Get single booking
router.get('/:id', verifyToken, (req, res) => {
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json({ booking });
});

// Geocode helper
async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const response = await fetch(url, { headers: { 'User-Agent': 'BestClassChauffeurs/1.0' } });
    const data = await response.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) { /* fallback to provided coords */ }
  return null;
}

// Calculate road distance and duration using OSRM
async function calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}?overview=false`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distanceKm: parseFloat((route.distance / 1000).toFixed(2)),
        durationMinutes: Math.ceil(route.duration / 60),
      };
    }
  } catch (e) { /* fallback */ }
  return null;
}

// Create booking (customer or admin)
router.post('/', verifyToken, async (req, res) => {
  const { customerName, customerId, pickup, dropoff, date, time, vehicleType, extras, notes, source } = req.body;

  const vehicle = db.vehicleTypes.find(v => v.id === vehicleType);
  const baseRate = vehicle ? vehicle.baseRate : 3.50;
  const minFare = vehicle ? vehicle.minFare : 45.00;
  const extrasTotal = (extras || []).reduce((sum, extId) => {
    const ext = db.extras.find(e => e.id === extId);
    return sum + (ext ? ext.price : 0);
  }, 0);

  // Auto-geocode if address provided but coords look like defaults or are missing
  const finalPickup = { ...pickup };
  const finalDropoff = { ...dropoff };

  const isDefaultCoord = (lat, lng) => !lat || !lng || (Math.abs(lat - 51.5074) < 0.001 && Math.abs(lng + 0.1278) < 0.001);

  if (pickup.address && isDefaultCoord(pickup.lat, pickup.lng)) {
    const geo = await geocodeAddress(pickup.address);
    if (geo) { finalPickup.lat = geo.lat; finalPickup.lng = geo.lng; }
  }
  if (dropoff.address && isDefaultCoord(dropoff.lat, dropoff.lng)) {
    const geo = await geocodeAddress(dropoff.address);
    if (geo) { finalDropoff.lat = geo.lat; finalDropoff.lng = geo.lng; }
  }

  // Calculate road distance and duration for dynamic pricing
  let distanceKm = 0;
  let durationMinutes = 0;
  const routeInfo = await calculateDistance(finalPickup.lat, finalPickup.lng, finalDropoff.lat, finalDropoff.lng);
  if (routeInfo) {
    distanceKm = routeInfo.distanceKm;
    durationMinutes = routeInfo.durationMinutes;
  }

  // Dynamic pricing: baseRate (£/km) × distance, with minFare as floor
  const distanceFare = distanceKm > 0 ? parseFloat((baseRate * distanceKm).toFixed(2)) : minFare;
  const baseFare = Math.max(distanceFare, minFare);

  const booking = {
    id: db.nextBookingId(),
    customerId: customerId || req.user.id,
    customerName: customerName || db.customers.find(c => c.id === (customerId || req.user.id))?.name || 'Guest',
    driverId: null, driverName: null,
    pickup: finalPickup, dropoff: finalDropoff, date, time,
    vehicleType: vehicleType || 'sedan',
    vehicleName: vehicle ? vehicle.description.split('/')[0].trim() : 'Executive Sedan',
    status: 'pending', tripStatus: null, tripEvents: [],
    fare: { base: baseFare, extras: extrasTotal, total: baseFare + extrasTotal },
    distanceKm,
    durationMinutes,
    extras: (extras || []).map(extId => db.extras.find(e => e.id === extId)?.name).filter(Boolean),
    notes: notes || '',
    rating: null, review: null,
    createdAt: new Date().toISOString(),
    source: source || 'app',
  };

  db.bookings.unshift(booking);

  // Emit to web portal
  if (global.io) {
    global.io.emit('new_booking', booking);
  }

  res.status(201).json({ booking });
});

// Assign driver to booking (admin)
router.put('/:id/assign', verifyToken, (req, res) => {
  const { driverId } = req.body;
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const driver = db.drivers.find(d => d.id === driverId);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  booking.driverId = driver.id;
  booking.driverName = driver.name;
  booking.status = 'assigned';
  booking.vehicleName = `${driver.vehicle.make} ${driver.vehicle.model}`;

  // Move driver location to near the trip's pickup area
  if (booking.pickup && booking.pickup.lat && booking.pickup.lng) {
    driver.location = {
      lat: booking.pickup.lat + (Math.random() - 0.5) * 0.01,
      lng: booking.pickup.lng + (Math.random() - 0.5) * 0.01,
    };
  }

  // Notify driver
  if (global.io) {
    global.io.emit(`driver_${driverId}_booking`, booking);
    global.io.emit('booking_updated', booking);
    global.io.emit('driver_location_update', { driverId: driver.id, location: driver.location, name: driver.name });
  }

  res.json({ booking });
});

// Driver accept/reject booking
router.put('/:id/respond', verifyToken, (req, res) => {
  const { action } = req.body; // 'accept' or 'reject'
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  if (action === 'accept') {
    booking.status = 'confirmed';
    const driver = db.drivers.find(d => d.id === booking.driverId);
    if (driver) {
      driver.status = 'assigned';
      // Ensure driver location is near the trip pickup
      if (booking.pickup && booking.pickup.lat && booking.pickup.lng) {
        driver.location = {
          lat: booking.pickup.lat + (Math.random() - 0.5) * 0.008,
          lng: booking.pickup.lng + (Math.random() - 0.5) * 0.008,
        };
      }
    }
  } else {
    booking.status = 'pending';
    booking.driverId = null;
    booking.driverName = null;
  }

  if (global.io) {
    global.io.emit('booking_updated', booking);
    global.io.emit(`customer_${booking.customerId}_update`, booking);
  }

  res.json({ booking });
});

// Update trip status (driver)
router.put('/:id/trip-status', verifyToken, (req, res) => {
  const { tripStatus, driverLocation } = req.body;
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  booking.tripStatus = tripStatus;

  // Initialize tripEvents array if not present
  if (!booking.tripEvents) booking.tripEvents = [];

  // Record the trip event with driver location and timestamp
  const tripEvent = {
    status: tripStatus,
    timestamp: new Date().toISOString(),
    driverLocation: driverLocation || null,
  };
  booking.tripEvents.push(tripEvent);

  const statusMap = {
    en_route: 'in_progress',
    arrived_pickup: 'in_progress',
    passenger_onboard: 'in_progress',
    completed: 'completed',
  };

  if (statusMap[tripStatus]) {
    booking.status = statusMap[tripStatus];
  }

  if (tripStatus === 'completed') {
    const driver = db.drivers.find(d => d.id === booking.driverId);
    if (driver) {
      driver.status = 'available';
      driver.totalTrips += 1;
      driver.earnings += booking.fare.total;
    }
  }

  // Update driver's stored location from the trip event
  if (driverLocation && booking.driverId) {
    const driver = db.drivers.find(d => d.id === booking.driverId);
    if (driver) {
      driver.location = { lat: driverLocation.lat, lng: driverLocation.lng };
    }
  }

  if (global.io) {
    global.io.emit('booking_updated', booking);
    global.io.emit(`customer_${booking.customerId}_update`, booking);
    // Also broadcast driver location so customer + web portal maps update instantly
    if (driverLocation && booking.driverId) {
      global.io.emit('driver_location_update', {
        driverId: booking.driverId,
        location: driverLocation,
        name: booking.driverName,
      });
    }
  }

  res.json({ booking });
});

// Rate booking (customer)
router.put('/:id/rate', verifyToken, (req, res) => {
  const { rating, review } = req.body;
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  booking.rating = rating;
  booking.review = review;

  res.json({ booking });
});

// Cancel booking
router.put('/:id/cancel', verifyToken, (req, res) => {
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  booking.status = 'cancelled';
  if (booking.driverId) {
    const driver = db.drivers.find(d => d.id === booking.driverId);
    if (driver) driver.status = 'available';
  }

  if (global.io) {
    global.io.emit('booking_updated', booking);
  }

  res.json({ booking });
});

module.exports = router;
