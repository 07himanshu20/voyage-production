const express = require('express');
const router = express.Router();
const db = require('../database');
const { verifyToken } = require('../middleware/auth');

// Dashboard stats
router.get('/stats', verifyToken, (req, res) => {
  const totalBookings = db.bookings.length;
  const pendingBookings = db.bookings.filter(b => b.status === 'pending').length;
  const activeTrips = db.bookings.filter(b => b.status === 'in_progress').length;
  const completedTrips = db.bookings.filter(b => b.status === 'completed').length;
  const totalRevenue = db.bookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.fare.total, 0);
  const totalDrivers = db.drivers.length;
  const availableDrivers = db.drivers.filter(d => d.status === 'available').length;
  const totalCustomers = db.customers.length;

  res.json({
    totalBookings, pendingBookings, activeTrips, completedTrips,
    totalRevenue, totalDrivers, availableDrivers, totalCustomers,
  });
});

// Get all customers
router.get('/customers', verifyToken, (req, res) => {
  const customers = db.customers.map(c => ({ ...c, password: undefined }));
  res.json({ customers });
});

// Get vehicle types
router.get('/vehicle-types', (req, res) => {
  res.json({ vehicleTypes: db.vehicleTypes });
});

// Get extras
router.get('/extras', (req, res) => {
  res.json({ extras: db.extras });
});

// Reports
router.get('/reports', verifyToken, (req, res) => {
  const completed = db.bookings.filter(b => b.status === 'completed');
  const dailyRevenue = {};

  completed.forEach(b => {
    dailyRevenue[b.date] = (dailyRevenue[b.date] || 0) + b.fare.total;
  });

  const vehicleBreakdown = {};
  db.bookings.forEach(b => {
    vehicleBreakdown[b.vehicleType] = (vehicleBreakdown[b.vehicleType] || 0) + 1;
  });

  const sourceBreakdown = {};
  db.bookings.forEach(b => {
    sourceBreakdown[b.source] = (sourceBreakdown[b.source] || 0) + 1;
  });

  const topDrivers = db.drivers
    .sort((a, b) => b.totalTrips - a.totalTrips)
    .slice(0, 5)
    .map(d => ({ name: d.name, trips: d.totalTrips, earnings: d.earnings, rating: d.rating }));

  res.json({ dailyRevenue, vehicleBreakdown, sourceBreakdown, topDrivers });
});

// Get settings
router.get('/settings', verifyToken, (req, res) => {
  res.json({ settings: db.settings });
});

// Update settings
router.put('/settings', verifyToken, (req, res) => {
  const { companyName, contactEmail, phone, website, notifications } = req.body;
  if (companyName !== undefined) db.settings.companyName = companyName;
  if (contactEmail !== undefined) db.settings.contactEmail = contactEmail;
  if (phone !== undefined) db.settings.phone = phone;
  if (website !== undefined) db.settings.website = website;
  if (notifications !== undefined) db.settings.notifications = { ...db.settings.notifications, ...notifications };
  res.json({ settings: db.settings });
});

module.exports = router;
