const express = require('express');
const router = express.Router();
const db = require('../database');
const { generateToken } = require('../middleware/auth');

// Send OTP (prototype: always 12345)
router.post('/send-otp', (req, res) => {
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  db.otpStore[email] = '12345';
  console.log(`OTP sent to ${email}: 12345`);
  res.json({ success: true, message: 'OTP sent successfully' });
});

// Verify OTP and login
router.post('/verify-otp', (req, res) => {
  const { email, otp, role } = req.body;

  if (otp !== '12345') {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  if (role === 'driver') {
    const driver = db.drivers.find(d => d.email === email);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    const token = generateToken({ id: driver.id, role: 'driver', email });
    return res.json({ success: true, token, user: { ...driver, password: undefined } });
  }

  if (role === 'customer') {
    let customer = db.customers.find(c => c.email === email);
    if (!customer) {
      // Auto-register new customer
      customer = {
        id: `CUS-${String(db.customers.length + 1).padStart(3, '0')}`,
        name: '', email, phone: '', password: 'customer123',
        verified: true, totalBookings: 0, loyaltyTier: 'Silver',
      };
      db.customers.push(customer);
    }
    const token = generateToken({ id: customer.id, role: 'customer', email });
    return res.json({ success: true, token, user: { ...customer, password: undefined } });
  }

  res.status(400).json({ error: 'Invalid role' });
});

// Admin login (username/password)
router.post('/admin-login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.admins.find(a => a.username === username && a.password === password);
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken({ id: admin.id, role: admin.role, username });
  res.json({ success: true, token, user: { ...admin, password: undefined } });
});

module.exports = router;
