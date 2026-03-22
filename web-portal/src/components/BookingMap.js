'use client';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function BookingMap({ pickupCoords, dropoffCoords, pickupLabel, dropoffLabel }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !pickupCoords || !dropoffCoords) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const map = L.map(mapRef.current, { zoomControl: false });
    mapInstance.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19,
    }).addTo(map);

    const pickupIcon = L.divIcon({
      className: '',
      html: `<div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:28px;height:28px;background:#10b981;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
        </div>
        <div style="margin-top:3px;background:rgba(0,0,0,0.85);padding:2px 8px;border-radius:4px;font-size:10px;color:#10b981;white-space:nowrap;font-weight:700;">PICKUP</div>
      </div>`,
      iconSize: [28, 42], iconAnchor: [14, 14],
    });

    const dropoffIcon = L.divIcon({
      className: '',
      html: `<div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:28px;height:28px;background:#EF4444;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
        </div>
        <div style="margin-top:3px;background:rgba(0,0,0,0.85);padding:2px 8px;border-radius:4px;font-size:10px;color:#EF4444;white-space:nowrap;font-weight:700;">DROP-OFF</div>
      </div>`,
      iconSize: [28, 42], iconAnchor: [14, 14],
    });

    L.marker([pickupCoords.lat, pickupCoords.lng], { icon: pickupIcon })
      .bindPopup(`<strong>Pickup</strong><br><span style="color:#888;font-size:11px">${pickupLabel || ''}</span>`)
      .addTo(map);

    L.marker([dropoffCoords.lat, dropoffCoords.lng], { icon: dropoffIcon })
      .bindPopup(`<strong>Drop-off</strong><br><span style="color:#888;font-size:11px">${dropoffLabel || ''}</span>`)
      .addTo(map);

    L.polyline(
      [[pickupCoords.lat, pickupCoords.lng], [dropoffCoords.lat, dropoffCoords.lng]],
      { color: '#C8A951', weight: 3, opacity: 0.7, dashArray: '8, 6' }
    ).addTo(map);

    map.fitBounds([
      [pickupCoords.lat, pickupCoords.lng],
      [dropoffCoords.lat, dropoffCoords.lng],
    ], { padding: [50, 50], maxZoom: 14 });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [pickupCoords, dropoffCoords, pickupLabel, dropoffLabel]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}
