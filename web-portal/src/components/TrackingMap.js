'use client';
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
  arrived_pickup: 'Arrived at Pickup',
  passenger_onboard: 'Passenger Onboard',
  completed: 'Trip Completed',
};

const createDriverIcon = (status) => {
  const color = status === 'available' ? '#10b981' : status === 'on_trip' ? '#a855f7' : status === 'assigned' ? '#3b82f6' : '#6b7280';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:36px;height:36px;background:${color};border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const EVENT_SHORT_LABELS = {
  en_route: 'En Route',
  arrived_pickup: 'Arrived',
  passenger_onboard: 'Onboard',
  completed: 'Completed',
};

// Simple colored dot with label — NOT a car icon
function createEventIcon(status) {
  const color = EVENT_COLORS[status] || '#6b7280';
  const label = EVENT_SHORT_LABELS[status] || status;
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:16px;height:16px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>
      <div style="margin-top:1px;background:rgba(0,0,0,0.85);padding:1px 4px;border-radius:3px;font-size:7px;color:${color};white-space:nowrap;font-weight:700;">${label}</div>
    </div>`,
    iconSize: [16, 28],
    iconAnchor: [8, 8],
  });
}

function createLocationIcon(color, label) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:28px;height:28px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
      </div>
      <div style="margin-top:1px;background:rgba(0,0,0,0.8);padding:1px 5px;border-radius:3px;font-size:8px;color:white;white-space:nowrap;font-weight:600;">${label}</div>
    </div>`,
    iconSize: [28, 38],
    iconAnchor: [14, 19],
  });
}

export default function TrackingMap({ drivers = [], selectedDriver, activeTrips = [], recentlyCompleted = [] }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const tripLayerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center: [51.5074, -0.1278],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
    tripLayerRef.current = L.layerGroup().addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Track if we've done the initial fit
  const initialFitDone = useRef(false);

  // Update driver markers
  useEffect(() => {
    if (!mapInstance.current) return;

    drivers.forEach(driver => {
      if (!driver.location) return;

      if (markersRef.current[driver.id]) {
        markersRef.current[driver.id].setLatLng([driver.location.lat, driver.location.lng]);
        markersRef.current[driver.id].setIcon(createDriverIcon(driver.status));
      } else {
        const marker = L.marker([driver.location.lat, driver.location.lng], {
          icon: createDriverIcon(driver.status),
        }).addTo(mapInstance.current);

        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:160px">
            <strong>${driver.name}</strong><br>
            <span style="color:#888">${driver.vehicle.make} ${driver.vehicle.model}</span><br>
            <span style="color:#888">${driver.vehicle.plate}</span><br>
            <span style="font-size:11px;color:#C8A951">${driver.id} • ${driver.status}</span>
          </div>
        `);

        markersRef.current[driver.id] = marker;
      }
    });

    // On first load, fit map to show all drivers
    if (!initialFitDone.current && drivers.length > 0) {
      const allPoints = drivers.filter(d => d.location).map(d => [d.location.lat, d.location.lng]);
      if (allPoints.length > 0) {
        mapInstance.current.fitBounds(allPoints, { padding: [50, 50], maxZoom: 13 });
        initialFitDone.current = true;
      }
    }

    if (selectedDriver) {
      const driver = drivers.find(d => d.id === selectedDriver);
      if (driver?.location) {
        mapInstance.current.flyTo([driver.location.lat, driver.location.lng], 14, { duration: 0.8 });
        markersRef.current[driver.id]?.openPopup();
      }
    }
  }, [drivers, selectedDriver]);

  // Render recently completed trips — show completion point
  const completedLayerRef = useRef(null);
  useEffect(() => {
    if (!mapInstance.current) return;
    if (!completedLayerRef.current) {
      completedLayerRef.current = L.layerGroup().addTo(mapInstance.current);
    }
    completedLayerRef.current.clearLayers();

    recentlyCompleted.forEach(trip => {
      const completedEvent = trip.tripEvents?.find(e => e.status === 'completed');
      // Use driver's completion location if available, otherwise fall back to dropoff coords
      const completionLocation = completedEvent?.driverLocation || (trip.dropoff ? { lat: trip.dropoff.lat, lng: trip.dropoff.lng } : null);
      if (!completionLocation) return;

      const { lat, lng } = completionLocation;

      // Completion point marker
      const marker = L.marker([lat, lng], {
        icon: createLocationIcon('#10B981', 'COMPLETED'),
        zIndexOffset: 2000,
      }).bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:160px">
          <div style="font-size:10px;color:#888;font-family:monospace">${trip.id}</div>
          <div style="font-weight:700;color:#10B981;font-size:13px;margin-top:2px">Trip Completed</div>
          <div style="color:#aaa;font-size:11px;margin-top:4px">${trip.driverName || 'Driver'}</div>
          <div style="color:#666;font-size:10px;margin-top:2px">${completedEvent ? new Date(completedEvent.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
          <div style="color:#666;font-size:10px;margin-top:2px">${trip.dropoff.address}</div>
        </div>
      `);
      completedLayerRef.current.addLayer(marker);

      // Show pickup and dropoff markers with route line
      if (trip.pickup && trip.dropoff) {
        const pickupMarker = L.marker([trip.pickup.lat, trip.pickup.lng], {
          icon: createLocationIcon('#10b981', 'PICKUP'),
        }).bindPopup(`<div style="font-family:Inter,sans-serif"><strong>${trip.id} – Pickup</strong><br><span style="color:#888;font-size:11px">${trip.pickup.address}</span></div>`);
        completedLayerRef.current.addLayer(pickupMarker);

        const dropoffMarker = L.marker([trip.dropoff.lat, trip.dropoff.lng], {
          icon: createLocationIcon('#EF4444', 'DROP-OFF'),
        }).bindPopup(`<div style="font-family:Inter,sans-serif"><strong>${trip.id} – Drop-off</strong><br><span style="color:#888;font-size:11px">${trip.dropoff.address}</span></div>`);
        completedLayerRef.current.addLayer(dropoffMarker);

        const routeLine = L.polyline([
          [trip.pickup.lat, trip.pickup.lng],
          [trip.dropoff.lat, trip.dropoff.lng],
        ], { color: '#10B981', weight: 2, opacity: 0.3, dashArray: '6, 6' });
        completedLayerRef.current.addLayer(routeLine);
      }
    });

    // Fit map to show completed trips if no active trips are visible
    if (recentlyCompleted.length > 0 && activeTrips.length === 0 && !selectedDriver) {
      const bounds = [];
      recentlyCompleted.forEach(trip => {
        if (trip.pickup) bounds.push([trip.pickup.lat, trip.pickup.lng]);
        if (trip.dropoff) bounds.push([trip.dropoff.lat, trip.dropoff.lng]);
      });
      if (bounds.length >= 2) {
        mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [recentlyCompleted]);

  // Track previous state to know when to auto-fit (only on meaningful changes)
  const prevTripIdsRef = useRef('');
  const prevEventCountRef = useRef(0);

  // Render active trip routes and event markers
  useEffect(() => {
    if (!mapInstance.current || !tripLayerRef.current) return;
    tripLayerRef.current.clearLayers();

    const allBounds = [];
    let totalEventCount = 0;

    activeTrips.forEach(trip => {
      if (!trip.pickup || !trip.dropoff) return;

      allBounds.push([trip.pickup.lat, trip.pickup.lng]);
      allBounds.push([trip.dropoff.lat, trip.dropoff.lng]);

      // Pickup marker
      const pickupMarker = L.marker([trip.pickup.lat, trip.pickup.lng], {
        icon: createLocationIcon('#10b981', 'PICKUP'),
      }).bindPopup(`<div style="font-family:Inter,sans-serif"><strong>${trip.id} – Pickup</strong><br><span style="color:#888;font-size:11px">${trip.pickup.address}</span></div>`);
      tripLayerRef.current.addLayer(pickupMarker);

      // Dropoff marker
      const dropoffMarker = L.marker([trip.dropoff.lat, trip.dropoff.lng], {
        icon: createLocationIcon('#EF4444', 'DROP-OFF'),
      }).bindPopup(`<div style="font-family:Inter,sans-serif"><strong>${trip.id} – Drop-off</strong><br><span style="color:#888;font-size:11px">${trip.dropoff.address}</span></div>`);
      tripLayerRef.current.addLayer(dropoffMarker);

      // Route line
      const routeLine = L.polyline([
        [trip.pickup.lat, trip.pickup.lng],
        [trip.dropoff.lat, trip.dropoff.lng],
      ], { color: '#C8A951', weight: 2, opacity: 0.5, dashArray: '6, 6' });
      tripLayerRef.current.addLayer(routeLine);

      // Trip event markers — spread them apart slightly if too close so all are visible
      if (trip.tripEvents && trip.tripEvents.length > 0) {
        totalEventCount += trip.tripEvents.length;

        trip.tripEvents.forEach((event, idx) => {
          if (!event.driverLocation) return;
          let { lat, lng } = event.driverLocation;

          // Offset overlapping markers so each event dot is distinctly visible
          // Spread them along the route direction with small perpendicular offset
          const offsetAngle = (idx * 2 * Math.PI) / Math.max(trip.tripEvents.length, 1);
          const offsetDist = 0.0008 * idx; // ~80m spacing per event
          lat += offsetDist * Math.cos(offsetAngle);
          lng += offsetDist * Math.sin(offsetAngle);

          const color = EVENT_COLORS[event.status] || '#6b7280';
          const label = EVENT_LABELS[event.status] || event.status;
          const time = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          const marker = L.marker([lat, lng], {
            icon: createEventIcon(event.status),
            zIndexOffset: 1000 + idx, // ensure all markers are above route lines
          }).bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:140px">
              <div style="font-size:10px;color:#888;font-family:monospace">${trip.id}</div>
              <div style="font-weight:700;color:${color};font-size:12px;margin-top:2px">${label}</div>
              <div style="color:#aaa;font-size:11px;margin-top:2px">${time}</div>
              <div style="color:#666;font-size:10px;margin-top:2px">${trip.driverName || 'Driver'} was here</div>
            </div>
          `);
          tripLayerRef.current.addLayer(marker);
          allBounds.push([lat, lng]);
        });

        // Path through event locations
        const eventPoints = trip.tripEvents
          .filter(e => e.driverLocation)
          .map(e => [e.driverLocation.lat, e.driverLocation.lng]);
        if (eventPoints.length > 1) {
          const eventPath = L.polyline(eventPoints, {
            color: '#A855F7', weight: 2, opacity: 0.5, dashArray: '4, 6',
          });
          tripLayerRef.current.addLayer(eventPath);
        }
      }
    });

    // Only auto-fit when trips first appear or a new event is added — NOT on every update
    const tripIds = activeTrips.map(t => t.id).sort().join(',');
    const tripsChanged = tripIds !== prevTripIdsRef.current;
    const eventsChanged = totalEventCount !== prevEventCountRef.current;

    if (allBounds.length >= 2 && !selectedDriver && (tripsChanged || eventsChanged)) {
      activeTrips.forEach(trip => {
        const driver = drivers.find(d => d.id === trip.driverId);
        if (driver?.location) allBounds.push([driver.location.lat, driver.location.lng]);
      });
      mapInstance.current.fitBounds(allBounds, { padding: [50, 50], maxZoom: 14 });
    }

    prevTripIdsRef.current = tripIds;
    prevEventCountRef.current = totalEventCount;
  }, [activeTrips]);

  return <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />;
}
