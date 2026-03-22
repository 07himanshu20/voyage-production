import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronLeft, Navigation, Phone, MessageCircle, MapPin } from 'lucide-react';

const EVENT_COLORS = { en_route: '#3B82F6', arrived_pickup: '#F59E0B', passenger_onboard: '#A855F7', completed: '#10B981' };
const EVENT_LABELS = { en_route: 'En Route', arrived_pickup: 'Arrived', passenger_onboard: 'Onboard', completed: 'Complete' };

function createMarkerIcon(type) {
  const colors = { pickup: '#10B981', dropoff: '#EF4444', driver: '#C8A951' };
  const labels = { pickup: 'PICKUP', dropoff: 'DROP-OFF', driver: 'DRIVER' };
  const color = colors[type];
  const label = labels[type];
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:14px;height:14px;background:${color};border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>
      <div style="margin-top:3px;background:rgba(0,0,0,0.85);padding:2px 6px;border-radius:4px;font-size:9px;color:${color};white-space:nowrap;font-weight:700;letter-spacing:0.5px;">${label}</div>
    </div>`,
    iconSize: [14, 28],
    iconAnchor: [7, 7],
  });
}

function createEventDot(status) {
  const color = EVENT_COLORS[status] || '#6b7280';
  const label = EVENT_LABELS[status] || status;
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:12px;height:12px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>
      <div style="margin-top:2px;background:rgba(0,0,0,0.85);padding:1px 4px;border-radius:3px;font-size:7px;color:${color};white-space:nowrap;font-weight:700;">${label}</div>
    </div>`,
    iconSize: [12, 24],
    iconAnchor: [6, 6],
  });
}

export default function TripTrackScreen({ navigation, route }) {
  const booking = route.params?.booking;
  const [currentBooking, setCurrentBooking] = useState(booking);
  const [driverLoc, setDriverLoc] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({ pickup: null, dropoff: null, driver: null, events: [], routeLine: null });
  const fittedRef = useRef(false);

  // Socket for real-time updates
  useEffect(() => {
    if (!booking) return;
    const socket = io(SOCKET_URL);
    socket.on('connect', () => socket.emit('customer_connect', booking.customerId));

    // Driver location — precise real-time tracking
    socket.on('driver_location_update', ({ driverId, location }) => {
      if (driverId === currentBooking?.driverId) {
        setDriverLoc(location);
      }
    });

    // Booking updates (trip status changes, events)
    socket.on('booking_updated', (updated) => {
      if (updated.id === booking.id) setCurrentBooking(updated);
    });

    socket.on(`customer_${booking.customerId}_update`, (updated) => {
      if (updated.id === booking.id) setCurrentBooking(updated);
    });

    return () => socket.disconnect();
  }, [booking?.id, booking?.customerId, currentBooking?.driverId]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false })
      .setView([51.5074, -0.1278], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Update markers on map
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !currentBooking) return;
    const m = markersRef.current;

    // Pickup
    if (currentBooking.pickup?.lat) {
      if (m.pickup) m.pickup.setLatLng([currentBooking.pickup.lat, currentBooking.pickup.lng]);
      else {
        m.pickup = L.marker([currentBooking.pickup.lat, currentBooking.pickup.lng], { icon: createMarkerIcon('pickup'), zIndexOffset: 1000 })
          .bindPopup(`<b>Pickup</b><br/>${currentBooking.pickup.address}`).addTo(map);
      }
    }

    // Dropoff
    if (currentBooking.dropoff?.lat) {
      if (m.dropoff) m.dropoff.setLatLng([currentBooking.dropoff.lat, currentBooking.dropoff.lng]);
      else {
        m.dropoff = L.marker([currentBooking.dropoff.lat, currentBooking.dropoff.lng], { icon: createMarkerIcon('dropoff'), zIndexOffset: 1000 })
          .bindPopup(`<b>Drop-off</b><br/>${currentBooking.dropoff.address}`).addTo(map);
      }
    }

    // Route line
    if (currentBooking.pickup?.lat && currentBooking.dropoff?.lat) {
      if (m.routeLine) map.removeLayer(m.routeLine);
      m.routeLine = L.polyline(
        [[currentBooking.pickup.lat, currentBooking.pickup.lng], [currentBooking.dropoff.lat, currentBooking.dropoff.lng]],
        { color: '#C8A951', weight: 2, dashArray: '8,6', opacity: 0.6 }
      ).addTo(map);
    }

    // Event dots
    m.events.forEach(e => map.removeLayer(e));
    m.events = [];
    if (currentBooking.tripEvents?.length > 0) {
      const angleStep = (2 * Math.PI) / Math.max(currentBooking.tripEvents.length, 1);
      currentBooking.tripEvents.forEach((evt, i) => {
        if (!evt.driverLocation) return;
        const offset = 0.0008 * (i + 1);
        const lat = evt.driverLocation.lat + offset * Math.cos(angleStep * i);
        const lng = evt.driverLocation.lng + offset * Math.sin(angleStep * i);
        const marker = L.marker([lat, lng], { icon: createEventDot(evt.status), zIndexOffset: 500 + i })
          .bindPopup(`<b>${EVENT_LABELS[evt.status] || evt.status}</b><br/>${new Date(evt.timestamp).toLocaleTimeString()}`)
          .addTo(map);
        m.events.push(marker);
      });
    }

    // Driver marker — live position
    if (driverLoc?.lat) {
      if (m.driver) m.driver.setLatLng([driverLoc.lat, driverLoc.lng]);
      else {
        m.driver = L.marker([driverLoc.lat, driverLoc.lng], { icon: createMarkerIcon('driver'), zIndexOffset: 2000 })
          .bindPopup(`<b>${currentBooking.driverName}</b><br/>Live location`).addTo(map);
      }
    }

    // Fit bounds once
    if (!fittedRef.current) {
      const bounds = [];
      if (currentBooking.pickup?.lat) bounds.push([currentBooking.pickup.lat, currentBooking.pickup.lng]);
      if (currentBooking.dropoff?.lat) bounds.push([currentBooking.dropoff.lat, currentBooking.dropoff.lng]);
      if (driverLoc?.lat) bounds.push([driverLoc.lat, driverLoc.lng]);
      if (bounds.length >= 2) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        fittedRef.current = true;
      }
    }
  }, [currentBooking, driverLoc]);

  if (!booking) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <p className="text-text-muted">No booking selected</p>
    </div>
  );

  const tripStatusLabel = { en_route: 'Chauffeur is on the way', arrived_pickup: 'Chauffeur has arrived', passenger_onboard: 'Trip in progress', completed: 'You have arrived' };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: '45vh' }}>
        <div ref={mapRef} className="absolute inset-0" />
        <button onClick={() => navigation.goBack()} className="absolute top-4 left-4 z-[1000] w-11 h-11 rounded-[14px] bg-card border border-card-border flex items-center justify-center">
          <ChevronLeft size={20} className="text-white" />
        </button>
      </div>

      {/* Bottom Sheet */}
      <div className="bg-card rounded-t-[28px] px-6 pt-6 pb-10 -mt-4 relative z-10">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-[52px] h-[52px] rounded-2xl bg-gold/10 flex items-center justify-center">
            <Navigation size={22} className="text-gold" />
          </div>
          <div>
            <p className="text-base font-semibold text-white">{tripStatusLabel[currentBooking.tripStatus] || 'Awaiting chauffeur'}</p>
            <p className="text-[13px] text-text-secondary mt-0.5">
              {currentBooking.tripEvents?.length > 0
                ? `Last update: ${new Date(currentBooking.tripEvents[currentBooking.tripEvents.length - 1].timestamp).toLocaleTimeString()}`
                : 'Estimated arrival: 8 mins'}
            </p>
          </div>
        </div>

        {currentBooking.driverName && (
          <div className="flex items-center gap-3 bg-white/[0.03] rounded-2xl p-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gold flex items-center justify-center">
              <span className="text-lg font-bold text-bg">{currentBooking.driverName.split(' ').map(n => n[0]).join('')}</span>
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-white">{currentBooking.driverName}</p>
              <p className="text-xs text-text-secondary mt-0.5">{currentBooking.vehicleName}</p>
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center"><Phone size={16} className="text-green-400" /></button>
              <button className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center"><MessageCircle size={16} className="text-blue-400" /></button>
            </div>
          </div>
        )}

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[13px] text-text-secondary truncate">{currentBooking.pickup.address}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin size={8} className="text-red-500" />
            <span className="text-[13px] text-text-secondary truncate">{currentBooking.dropoff.address}</span>
          </div>
        </div>

        {currentBooking.tripEvents?.length > 0 && (
          <div className="mb-4 pt-3 border-t border-white/5">
            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">Trip Progress</p>
            {currentBooking.tripEvents.map((evt, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: EVENT_COLORS[evt.status] || '#6b7280' }} />
                <span className="text-xs text-text-secondary">{EVENT_LABELS[evt.status] || evt.status}</span>
                <span className="text-xs text-text-muted ml-auto">{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${currentBooking.dropoff.lat},${currentBooking.dropoff.lng}`, '_blank')}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gold/10 border border-gold/20 text-gold text-[15px] font-semibold"
        >
          <Navigation size={16} /> Open in Maps
        </button>
      </div>
    </div>
  );
}
