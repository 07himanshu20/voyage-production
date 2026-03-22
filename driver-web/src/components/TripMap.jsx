import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const EVENT_COLORS = {
  en_route: '#3B82F6',
  arrived_pickup: '#F59E0B',
  passenger_onboard: '#A855F7',
  completed: '#10B981',
};

const EVENT_LABELS = {
  en_route: 'En Route',
  arrived_pickup: 'Arrived',
  passenger_onboard: 'Onboard',
  completed: 'Completed',
};

// Simple colored dot with a label underneath — NOT a car icon
function createEventDot(status) {
  const color = EVENT_COLORS[status] || '#6b7280';
  const label = EVENT_LABELS[status] || status;
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:18px;height:18px;background:${color};border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>
      <div style="margin-top:2px;background:rgba(0,0,0,0.85);padding:1px 5px;border-radius:3px;font-size:7px;color:${color};white-space:nowrap;font-weight:700;letter-spacing:0.3px;">${label}</div>
    </div>`,
    iconSize: [18, 30],
    iconAnchor: [9, 9],
  });
}

function createLocationIcon(color, label) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:32px;height:32px;background:${color};border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
      </div>
      <div style="margin-top:2px;background:rgba(0,0,0,0.7);padding:1px 6px;border-radius:4px;font-size:9px;color:white;white-space:nowrap;font-weight:600;">${label}</div>
    </div>`,
    iconSize: [32, 44],
    iconAnchor: [16, 22],
  });
}

export default function TripMap({ pickup, dropoff, tripEvents = [] }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layerGroup = useRef(null);
  const prevEventCountRef = useRef(0);
  const initialFitDone = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center: [pickup.lat, pickup.lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(mapInstance.current);

    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
    layerGroup.current = L.layerGroup().addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update markers and route
  useEffect(() => {
    if (!mapInstance.current || !layerGroup.current) return;
    layerGroup.current.clearLayers();

    const bounds = [];

    // Pickup marker
    const pickupMarker = L.marker([pickup.lat, pickup.lng], {
      icon: createLocationIcon('#10b981', 'PICKUP'),
    }).bindPopup(`<div style="font-family:Inter,sans-serif"><strong>Pickup</strong><br><span style="color:#888;font-size:12px">${pickup.address}</span></div>`);
    layerGroup.current.addLayer(pickupMarker);
    bounds.push([pickup.lat, pickup.lng]);

    // Dropoff marker
    const dropoffMarker = L.marker([dropoff.lat, dropoff.lng], {
      icon: createLocationIcon('#EF4444', 'DROP-OFF'),
    }).bindPopup(`<div style="font-family:Inter,sans-serif"><strong>Drop-off</strong><br><span style="color:#888;font-size:12px">${dropoff.address}</span></div>`);
    layerGroup.current.addLayer(dropoffMarker);
    bounds.push([dropoff.lat, dropoff.lng]);

    // Route line (pickup -> dropoff)
    const routeLine = L.polyline([
      [pickup.lat, pickup.lng],
      [dropoff.lat, dropoff.lng],
    ], {
      color: '#C8A951',
      weight: 3,
      opacity: 0.6,
      dashArray: '8, 8',
    });
    layerGroup.current.addLayer(routeLine);

    // Trip event dots — simple colored circles with labels, spread apart so all visible
    tripEvents.forEach((event, idx) => {
      if (!event.driverLocation) return;
      let { lat, lng } = event.driverLocation;

      // Spread overlapping dots so each is visible
      const offsetAngle = (idx * 2 * Math.PI) / Math.max(tripEvents.length, 1);
      const offsetDist = 0.001 * idx;
      lat += offsetDist * Math.cos(offsetAngle);
      lng += offsetDist * Math.sin(offsetAngle);

      const color = EVENT_COLORS[event.status] || '#6b7280';
      const label = EVENT_LABELS[event.status] || event.status;
      const time = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const marker = L.marker([lat, lng], {
        icon: createEventDot(event.status),
        zIndexOffset: 1000 + idx,
      }).bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:140px">
          <div style="font-weight:700;color:${color};font-size:13px">${label}</div>
          <div style="color:#aaa;font-size:11px;margin-top:2px">${time}</div>
          <div style="color:#666;font-size:10px;margin-top:4px">Driver was here</div>
        </div>
      `);
      layerGroup.current.addLayer(marker);
      bounds.push([lat, lng]);
    });

    // Path connecting event locations
    if (tripEvents.length > 0) {
      const eventPoints = tripEvents
        .filter(e => e.driverLocation)
        .map(e => [e.driverLocation.lat, e.driverLocation.lng]);

      if (eventPoints.length > 1) {
        const eventPath = L.polyline(eventPoints, {
          color: '#A855F7',
          weight: 2,
          opacity: 0.5,
          dashArray: '4, 6',
        });
        layerGroup.current.addLayer(eventPath);
      }
    }

    // Fit bounds only on first load or when a new event is added
    const eventsChanged = tripEvents.length !== prevEventCountRef.current;
    if (bounds.length >= 2 && (!initialFitDone.current || eventsChanged)) {
      mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      initialFitDone.current = true;
    }
    prevEventCountRef.current = tripEvents.length;
  }, [pickup, dropoff, tripEvents]);

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '220px',
        borderRadius: '16px',
      }}
    />
  );
}
