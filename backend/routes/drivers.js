const express = require('express');
const router = express.Router();
const db = require('../database');
const { verifyToken } = require('../middleware/auth');

// Get all drivers
router.get('/', verifyToken, (req, res) => {
  const drivers = db.drivers.map(d => ({ ...d, password: undefined }));
  res.json({ drivers });
});

// Get single driver
router.get('/:id', verifyToken, (req, res) => {
  const driver = db.drivers.find(d => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  res.json({ driver: { ...driver, password: undefined } });
});

// Update driver location
router.put('/:id/location', verifyToken, (req, res) => {
  const { lat, lng } = req.body;
  const driver = db.drivers.find(d => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  driver.location = { lat, lng };

  if (global.io) {
    global.io.emit('driver_location_update', { driverId: driver.id, location: driver.location, name: driver.name });
  }

  res.json({ success: true });
});

// Update driver status
router.put('/:id/status', verifyToken, (req, res) => {
  const { status } = req.body;
  const driver = db.drivers.find(d => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  driver.status = status;

  if (global.io) {
    global.io.emit('driver_status_update', { driverId: driver.id, status });
  }

  res.json({ driver: { ...driver, password: undefined } });
});

// Update driver profile
router.put('/:id/profile', verifyToken, (req, res) => {
  const { name, phone, vehicle } = req.body;
  const driver = db.drivers.find(d => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  if (name) driver.name = name;
  if (phone) driver.phone = phone;
  if (vehicle) driver.vehicle = { ...driver.vehicle, ...vehicle };

  res.json({ driver: { ...driver, password: undefined } });
});

// Get driver earnings
router.get('/:id/earnings', verifyToken, (req, res) => {
  const driver = db.drivers.find(d => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  const driverBookings = db.bookings.filter(b => b.driverId === driver.id);
  const completed = driverBookings.filter(b => b.status === 'completed');

  const today = new Date().toISOString().split('T')[0];
  const todayEarnings = completed.filter(b => b.date === today).reduce((s, b) => s + b.fare.total, 0);
  const weekEarnings = completed.slice(0, 7).reduce((s, b) => s + b.fare.total, 0);

  res.json({
    totalEarnings: driver.earnings,
    todayEarnings,
    weekEarnings,
    totalTrips: driver.totalTrips,
    completedTrips: completed.length,
    trips: driverBookings.map(b => ({ ...b })),
  });
});

module.exports = router;
