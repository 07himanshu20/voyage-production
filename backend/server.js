require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const driverRoutes = require('./routes/drivers');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const aiChatRoutes = require('./routes/ai-chat');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Make io globally accessible
global.io = io;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai-chat', aiChatRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'Best Class Chauffeurs API' }));

// Geocoding endpoint - converts address to lat/lng using OpenStreetMap Nominatim
app.get('/api/geocode', async (req, res) => {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'Address required' });
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'BestClassChauffeurs/1.0' },
    });
    const data = await response.json();
    if (data.length > 0) {
      res.json({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name });
    } else {
      res.status(404).json({ error: 'Address not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

// Address autocomplete - returns multiple rich suggestions from OpenStreetMap Nominatim
app.get('/api/autocomplete', async (req, res) => {
  const { query } = req.query;
  if (!query || query.length < 2) return res.json({ suggestions: [] });
  try {
    const headers = { 'User-Agent': 'BestClassChauffeurs/1.0' };
    // Run multiple searches in parallel for richer results:
    // 1) Standard search for the exact query
    // 2) Search with POI/building bias to find nearby landmarks and buildings
    const [mainRes, poiRes] = await Promise.all([
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`, { headers }),
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&namedetails=1&extratags=1&dedupe=1`, { headers }),
    ]);
    const [mainData, poiData] = await Promise.all([mainRes.json(), poiRes.json()]);

    // Merge and deduplicate by coordinates (within ~100m)
    const seen = new Set();
    const allItems = [...mainData, ...poiData];
    const suggestions = [];
    for (const item of allItems) {
      const key = `${parseFloat(item.lat).toFixed(4)}_${parseFloat(item.lon).toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        display: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      });
      if (suggestions.length >= 6) break;
    }
    res.json({ suggestions });
  } catch (e) {
    res.json({ suggestions: [] });
  }
});

// Distance & duration calculation using OSRM (free, no API key needed)
app.get('/api/distance', async (req, res) => {
  const { pickupLat, pickupLng, dropoffLat, dropoffLng } = req.query;
  if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
    return res.status(400).json({ error: 'Pickup and dropoff coordinates required' });
  }
  try {
    // OSRM uses lng,lat order
    const url = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}?overview=false`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distanceKm = parseFloat((route.distance / 1000).toFixed(2));
      const durationMinutes = Math.ceil(route.duration / 60);
      res.json({ distanceKm, durationMinutes });
    } else {
      res.status(404).json({ error: 'Route not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Distance calculation failed' });
  }
});

// Socket.IO
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Driver joins their room
  socket.on('driver_connect', (driverId) => {
    socket.join(`driver_${driverId}`);
    console.log(`Driver ${driverId} connected`);
  });

  // Customer joins their room
  socket.on('customer_connect', (customerId) => {
    socket.join(`customer_${customerId}`);
    console.log(`Customer ${customerId} connected`);
  });

  // Admin joins
  socket.on('admin_connect', () => {
    socket.join('admin');
    console.log('Admin connected');
  });

  // Driver location update (real-time)
  socket.on('driver_location', (data) => {
    const { driverId, lat, lng } = data;
    const driver = db.drivers.find(d => d.id === driverId);
    if (driver) {
      driver.location = { lat, lng };
      io.emit('driver_location_update', { driverId, location: { lat, lng }, name: driver.name });
    }
  });

  // Chat: join booking-specific chat room
  socket.on('join_chat', (bookingId) => {
    socket.join(`chat_${bookingId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Driver location is updated ONLY from real GPS data sent by the driver app
// via the 'driver_location' socket event or trip-status API calls.
// No simulated movement — the web portal shows the driver's actual position.

// Sync driver statuses with actual booking state on startup
function syncDriverStatuses() {
  db.drivers.forEach(driver => {
    const hasActiveBooking = db.bookings.some(
      b => b.driverId === driver.id && ['assigned', 'confirmed', 'in_progress'].includes(b.status)
    );
    if (!hasActiveBooking && driver.status !== 'offline') {
      driver.status = 'available';
    } else if (hasActiveBooking) {
      const activeBooking = db.bookings.find(
        b => b.driverId === driver.id && ['assigned', 'confirmed', 'in_progress'].includes(b.status)
      );
      if (activeBooking.status === 'in_progress') driver.status = 'on_trip';
      else driver.status = 'assigned';
    }
  });
  console.log('  Driver statuses synced with booking state');
}

// Admin endpoint to force-sync driver statuses
app.post('/api/admin/sync-drivers', (req, res) => {
  syncDriverStatuses();
  res.json({ success: true, drivers: db.drivers.map(d => ({ id: d.id, name: d.name, status: d.status })) });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  syncDriverStatuses();
  console.log(`\n  Best Class Chauffeurs API Server`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  Socket.IO enabled for real-time tracking\n`);
});
