import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { ChevronLeft, Check, Car, Diamond, Bus, CarFront, MapPin, Clock, Route, Search } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function AddressInput({ value, onChange, onSelect, placeholder, dotColor }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);

  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.length < 3) { setSuggestions([]); return; }
    setLoading(true);
    try {
      // Call Nominatim directly from browser for reliable geolocation
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      const seen = new Set();
      const results = [];
      for (const item of data) {
        const key = `${parseFloat(item.lat).toFixed(4)}_${parseFloat(item.lon).toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({ display: item.display_name, lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
        if (results.length >= 6) break;
      }
      setSuggestions(results);
    } catch { setSuggestions([]); }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(val), 400);
    setShowDropdown(true);
  };

  const handleSelect = (suggestion) => {
    onChange(suggestion.display);
    if (onSelect) onSelect(suggestion);
    setShowDropdown(false);
    setSuggestions([]);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <input
        className="w-full py-5 bg-transparent text-white text-[15px] outline-none placeholder:text-text-muted"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
      />
      {showDropdown && (suggestions.length > 0 || loading) && (
        <div className="absolute left-0 right-0 top-full z-50 bg-[#1a2744] border border-card-border rounded-xl shadow-2xl overflow-hidden max-h-[200px] overflow-y-auto">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3">
              <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-text-secondary">Searching...</span>
            </div>
          )}
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSelect(s)}
              className="w-full text-left px-4 py-3 hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-0"
            >
              <div className="flex items-start gap-2">
                <MapPin size={14} className={`mt-0.5 flex-shrink-0 ${dotColor === 'green' ? 'text-green-400' : 'text-red-400'}`} />
                <span className="text-[13px] text-white/80 leading-tight">{s.display}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RouteMap({ pickupCoords, dropoffCoords, pickupLabel, dropoffLabel }) {
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

    // Pickup marker (green)
    const pickupIcon = L.divIcon({
      className: '',
      html: `<div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:24px;height:24px;background:#10b981;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
        </div>
        <div style="margin-top:2px;background:rgba(0,0,0,0.8);padding:2px 6px;border-radius:4px;font-size:9px;color:#10b981;white-space:nowrap;font-weight:700;">PICKUP</div>
      </div>`,
      iconSize: [24, 36], iconAnchor: [12, 12],
    });

    // Dropoff marker (red)
    const dropoffIcon = L.divIcon({
      className: '',
      html: `<div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:24px;height:24px;background:#EF4444;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
        </div>
        <div style="margin-top:2px;background:rgba(0,0,0,0.8);padding:2px 6px;border-radius:4px;font-size:9px;color:#EF4444;white-space:nowrap;font-weight:700;">DROP-OFF</div>
      </div>`,
      iconSize: [24, 36], iconAnchor: [12, 12],
    });

    L.marker([pickupCoords.lat, pickupCoords.lng], { icon: pickupIcon })
      .bindPopup(`<strong>Pickup</strong><br><span style="color:#888;font-size:11px">${pickupLabel}</span>`)
      .addTo(map);

    L.marker([dropoffCoords.lat, dropoffCoords.lng], { icon: dropoffIcon })
      .bindPopup(`<strong>Drop-off</strong><br><span style="color:#888;font-size:11px">${dropoffLabel}</span>`)
      .addTo(map);

    // Route line
    L.polyline(
      [[pickupCoords.lat, pickupCoords.lng], [dropoffCoords.lat, dropoffCoords.lng]],
      { color: '#C8A951', weight: 3, opacity: 0.7, dashArray: '8, 6' }
    ).addTo(map);

    // Fit bounds
    map.fitBounds([
      [pickupCoords.lat, pickupCoords.lng],
      [dropoffCoords.lat, dropoffCoords.lng],
    ], { padding: [40, 40], maxZoom: 14 });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [pickupCoords, dropoffCoords]);

  if (!pickupCoords || !dropoffCoords) return null;

  return <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '16px' }} />;
}

export default function BookRideScreen({ navigation }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [extras, setExtras] = useState([]);
  const [form, setForm] = useState({ pickup: '', dropoff: '', date: '', time: '', vehicleType: '', selectedExtras: [], notes: '' });
  const [loading, setLoading] = useState(false);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    api.getVehicleTypes().then(d => setVehicleTypes(d.vehicleTypes || [])).catch(console.error);
    api.getExtras().then(d => setExtras(d.extras || [])).catch(console.error);
  }, []);

  // Geocode directly via Nominatim (browser-side, no backend needed)
  const geocodeDirect = async (address) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
    return null;
  };

  // Calculate distance via OSRM directly from browser
  const getDistanceDirect = async (pLat, pLng, dLat, dLng) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=false`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]) {
      const route = data.routes[0];
      return { distanceKm: parseFloat((route.distance / 1000).toFixed(2)), durationMinutes: Math.ceil(route.duration / 60) };
    }
    return null;
  };

  // Geocode and calculate distance
  const geocodeAndCalculate = async () => {
    if (!form.pickup || !form.dropoff) {
      alert('Please enter both pickup and drop-off locations.');
      return false;
    }
    setGeocoding(true);
    try {
      // Use already-selected coords from dropdown, or geocode fresh
      let pGeo = pickupCoords || await geocodeDirect(form.pickup);
      let dGeo = dropoffCoords || await geocodeDirect(form.dropoff);

      if (!pGeo?.lat) { alert(`Could not find: "${form.pickup}"`); setGeocoding(false); return false; }
      if (!dGeo?.lat) { alert(`Could not find: "${form.dropoff}"`); setGeocoding(false); return false; }

      setPickupCoords(pGeo);
      setDropoffCoords(dGeo);

      const dist = await getDistanceDirect(pGeo.lat, pGeo.lng, dGeo.lat, dGeo.lng).catch(() => null);
      if (dist) setRouteInfo(dist);

      setGeocoding(false);
      return true;
    } catch (e) {
      console.error('Geocoding error:', e);
      alert('Failed to find locations. Please check your connection.');
      setGeocoding(false);
      return false;
    }
  };

  const selectedVehicle = vehicleTypes.find(v => v.id === form.vehicleType);
  const extrasTotal = form.selectedExtras.reduce((sum, id) => { const ext = extras.find(e => e.id === id); return sum + (ext ? ext.price : 0); }, 0);

  // Dynamic pricing
  const getVehicleFare = (vehicle) => {
    if (!vehicle) return 0;
    if (routeInfo && routeInfo.distanceKm > 0) {
      return Math.max(parseFloat((vehicle.baseRate * routeInfo.distanceKm).toFixed(2)), vehicle.minFare);
    }
    return vehicle.minFare;
  };
  const baseFare = getVehicleFare(selectedVehicle);
  const totalFare = baseFare + extrasTotal;

  const toggleExtra = (id) => {
    setForm(f => ({ ...f, selectedExtras: f.selectedExtras.includes(id) ? f.selectedExtras.filter(e => e !== id) : [...f.selectedExtras, id] }));
  };

  const handleBook = async () => {
    setLoading(true);
    try {
      await api.createBooking({
        customerId: user.id, customerName: user.name,
        pickup: { address: form.pickup, lat: pickupCoords?.lat || 51.5074, lng: pickupCoords?.lng || -0.1278 },
        dropoff: { address: form.dropoff, lat: dropoffCoords?.lat || 51.4700, lng: dropoffCoords?.lng || -0.4543 },
        date: form.date || new Date().toISOString().split('T')[0],
        time: form.time || '14:00',
        vehicleType: form.vehicleType, extras: form.selectedExtras, notes: form.notes, source: 'app',
      });
      setStep(5);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const vehicleIcons = { sedan: CarFront, suv: Car, mpv: Bus, luxury: Diamond };

  if (step === 5) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-8">
        <div className="w-24 h-24 rounded-[32px] bg-gold flex items-center justify-center mb-6">
          <Check size={48} className="text-bg" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Booking Confirmed</h2>
        <p className="text-sm text-text-secondary text-center mb-8 leading-relaxed">Your chauffeur booking has been submitted. Our team will assign a chauffeur shortly.</p>
        <button onClick={() => navigation.goBack()} className="btn-gold">Back to Home</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-3">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigation.goBack()} className="w-10 h-10 rounded-xl bg-card flex items-center justify-center">
          <ChevronLeft size={20} className="text-white" />
        </button>
        <h1 className="text-lg font-semibold text-white">Book a Chauffeur</h1>
        <div className="w-10" />
      </div>

      {/* Progress */}
      <div className="flex justify-center gap-2 mb-6">
        {[1,2,3,4].map(s => (
          <div key={s} className={`w-8 h-1 rounded-full ${step >= s ? 'bg-gold' : 'bg-white/[0.08]'}`} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-40">
        {/* Step 1: Route */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Where are you going?</h2>
            <div className="glass-card mb-5" style={{ overflow: 'visible' }}>
              <div className="flex items-center gap-3 px-5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <AddressInput
                  value={form.pickup}
                  onChange={val => setForm(f => ({...f, pickup: val}))}
                  onSelect={s => setPickupCoords({ lat: s.lat, lng: s.lng })}
                  placeholder="Pickup location"
                  dotColor="green"
                />
              </div>
              <div className="h-px bg-card-border ml-10" />
              <div className="flex items-center gap-3 px-5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <AddressInput
                  value={form.dropoff}
                  onChange={val => setForm(f => ({...f, dropoff: val}))}
                  onSelect={s => setDropoffCoords({ lat: s.lat, lng: s.lng })}
                  placeholder="Drop-off location"
                  dotColor="red"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-secondary mb-2 block">Date</label>
                <input type="date" className="input-dark" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-2 block">Time</label>
                <input type="time" className="input-dark" value={form.time} onChange={e => setForm(f => ({...f, time: e.target.value}))} />
              </div>
            </div>

            {/* Geocoding loading */}
            {geocoding && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                <span className="text-gold text-sm font-medium">Finding locations & calculating route...</span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Map + Vehicle Selection */}
        {step === 2 && (
          <div>
            {/* MAP */}
            {pickupCoords && dropoffCoords && (
              <div className="h-[200px] rounded-2xl overflow-hidden border border-card-border mb-4">
                <RouteMap pickupCoords={pickupCoords} dropoffCoords={dropoffCoords} pickupLabel={form.pickup} dropoffLabel={form.dropoff} />
              </div>
            )}

            {/* Route summary */}
            <div className="glass-card p-3 mb-3">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-text-secondary truncate flex-1">{form.pickup}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-text-secondary truncate flex-1">{form.dropoff}</span>
              </div>
            </div>

            {/* Distance & Time */}
            {routeInfo && (
              <div className="flex gap-3 mb-5">
                <div className="flex-1 glass-card p-4 flex items-center gap-3 border-gold/50">
                  <Route size={18} className="text-gold" />
                  <div>
                    <p className="text-lg font-bold text-white">{routeInfo.distanceKm} km</p>
                    <p className="text-[10px] text-text-secondary">Road Distance</p>
                  </div>
                </div>
                <div className="flex-1 glass-card p-4 flex items-center gap-3 border-gold/50">
                  <Clock size={18} className="text-gold" />
                  <div>
                    <p className="text-lg font-bold text-white">{routeInfo.durationMinutes} min</p>
                    <p className="text-[10px] text-text-secondary">Est. Travel Time</p>
                  </div>
                </div>
              </div>
            )}

            <h2 className="text-2xl font-bold text-white mb-1">Choose your vehicle</h2>
            {routeInfo && (
              <p className="text-xs text-text-secondary mb-4">Prices calculated for {routeInfo.distanceKm} km journey</p>
            )}

            {vehicleTypes.map(v => {
              const Icon = vehicleIcons[v.id] || Car;
              const active = form.vehicleType === v.id;
              const fare = getVehicleFare(v);
              return (
                <button key={v.id} onClick={() => setForm(f => ({...f, vehicleType: v.id}))} className={`w-full flex items-center gap-4 p-5 rounded-[20px] border-[1.5px] mb-3 text-left transition-all ${active ? 'border-gold bg-gold/[0.06]' : 'border-card-border bg-card'}`}>
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center">
                    <Icon size={24} className={active ? 'text-gold' : 'text-text-muted'} />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-white">{v.name}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{v.description}</p>
                    <p className="text-[11px] text-text-muted mt-1">Up to {v.capacity} passengers • £{v.baseRate}/km</p>
                  </div>
                  <div className="text-right">
                    {!routeInfo && <p className="text-[10px] text-text-muted">From</p>}
                    <p className="text-xl font-bold text-gold">£{fare.toFixed(0)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 3: Extras */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Enhance your journey</h2>
            <p className="text-sm text-text-secondary mb-5">Add premium extras to your ride</p>
            {extras.map(ext => {
              const active = form.selectedExtras.includes(ext.id);
              return (
                <button key={ext.id} onClick={() => toggleExtra(ext.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl border mb-2 text-left transition-all ${active ? 'border-gold bg-gold/[0.06]' : 'border-card-border bg-card'}`}>
                  <div className={`w-6 h-6 rounded-lg border-[1.5px] flex items-center justify-center transition-all ${active ? 'bg-gold border-gold' : 'border-text-muted'}`}>
                    {active && <Check size={14} className="text-bg" />}
                  </div>
                  <span className="flex-1 text-sm text-white">{ext.name}</span>
                  <span className="text-[13px] font-semibold text-gold">{ext.price > 0 ? `£${ext.price.toFixed(2)}` : 'Free'}</span>
                </button>
              );
            })}
            <textarea className="input-dark mt-4" rows={3} placeholder="Special requests or notes..." value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Confirm booking</h2>

            {/* Mini map */}
            {pickupCoords && dropoffCoords && (
              <div className="h-[140px] rounded-2xl overflow-hidden border border-card-border mb-4">
                <RouteMap pickupCoords={pickupCoords} dropoffCoords={dropoffCoords} pickupLabel={form.pickup} dropoffLabel={form.dropoff} />
              </div>
            )}

            <div className="glass-card overflow-hidden mb-4">
              {[
                ['Pickup', form.pickup],
                ['Drop-off', form.dropoff],
                ['Date & Time', `${form.date} at ${form.time}`],
                ['Vehicle', selectedVehicle?.name],
                ...(routeInfo ? [['Distance', `${routeInfo.distanceKm} km`], ['Est. Travel Time', `${routeInfo.durationMinutes} min`]] : []),
                ...(form.selectedExtras.length ? [['Extras', `${form.selectedExtras.length} items`]] : []),
              ].map(([label, val], i) => (
                <div key={i}>
                  {i > 0 && <div className="h-px bg-card-border ml-5" />}
                  <div className="flex justify-between px-5 py-4">
                    <span className="text-[13px] text-text-secondary">{label}</span>
                    <span className="text-[13px] text-white font-medium text-right max-w-[55%] truncate">{val}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-card p-5 mb-4">
              <p className="text-sm font-semibold text-white mb-4">Price Breakdown</p>
              {routeInfo && routeInfo.distanceKm > 0 ? (
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-text-secondary">{routeInfo.distanceKm} km × £{selectedVehicle?.baseRate}/km</span>
                  <span className="text-sm text-white">£{baseFare.toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-text-secondary">Base fare</span>
                  <span className="text-sm text-white">£{baseFare.toFixed(2)}</span>
                </div>
              )}
              {extrasTotal > 0 && <div className="flex justify-between mb-2"><span className="text-sm text-text-secondary">Extras</span><span className="text-sm text-white">£{extrasTotal.toFixed(2)}</span></div>}
              <div className="border-t border-card-border pt-3 mt-2 flex justify-between">
                <span className="text-base font-bold text-white">Total</span>
                <span className="text-xl font-bold text-gold">£{totalFare.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 pb-9 pt-4 bg-bg border-t border-card-border">
        {step === 4 ? (
          <button onClick={handleBook} disabled={loading} className="btn-gold">{loading ? 'Booking...' : 'Confirm & Book'}</button>
        ) : (
          <button
            onClick={async () => {
              if (step === 1) {
                const success = await geocodeAndCalculate();
                if (success) setStep(2);
              } else {
                setStep(step + 1);
              }
            }}
            disabled={(step === 1 && (!form.pickup || !form.dropoff)) || (step === 2 && !form.vehicleType) || geocoding}
            className="btn-gold"
          >{geocoding ? 'Calculating route...' : 'Continue'}</button>
        )}
      </div>
    </div>
  );
}
