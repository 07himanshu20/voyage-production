'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { MapPin, Car, Plus, Check, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';

const BookingMap = dynamic(() => import('@/components/BookingMap'), { ssr: false });

function AddressAutocomplete({ value, onChange, onSelect, placeholder, className }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);

  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.length < 3) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const data = await api.autocomplete(query);
      setSuggestions(data.suggestions || []);
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
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
        className={className}
        required
      />
      {showDropdown && (suggestions.length > 0 || loading) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 bg-navy-400 border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[220px] overflow-y-auto">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3">
              <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-white/40">Searching...</span>
            </div>
          )}
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full text-left px-4 py-3 hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-0"
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gold-400" />
                <span className="text-sm text-white/70 leading-tight">{s.display}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewBookingPage() {
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [extras, setExtras] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({
    customerName: '', pickupAddress: '', dropoffAddress: '',
    date: '', time: '', vehicleType: 'sedan', selectedExtras: [], notes: '', driverId: '',
  });
  const [success, setSuccess] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);

  useEffect(() => {
    api.getVehicleTypes().then(d => setVehicleTypes(d.vehicleTypes || [])).catch(console.error);
    api.getExtras().then(d => setExtras(d.extras || [])).catch(console.error);
    api.getDrivers().then(d => setDrivers(d.drivers || [])).catch(console.error);
  }, []);

  // Calculate route when both coords are available
  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      api.getDistance(pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng)
        .then(dist => { if (dist) setRouteInfo(dist); })
        .catch(() => {});
    }
  }, [pickupCoords, dropoffCoords]);

  const toggleExtra = (id) => {
    setForm(f => ({
      ...f,
      selectedExtras: f.selectedExtras.includes(id)
        ? f.selectedExtras.filter(e => e !== id)
        : [...f.selectedExtras, id],
    }));
  };

  const selectedVehicle = vehicleTypes.find(v => v.id === form.vehicleType);
  const extrasTotal = form.selectedExtras.reduce((sum, id) => {
    const ext = extras.find(e => e.id === id);
    return sum + (ext ? ext.price : 0);
  }, 0);

  const getVehicleFare = (vehicle) => {
    if (!vehicle) return 0;
    if (routeInfo && routeInfo.distanceKm > 0) {
      return Math.max(parseFloat((vehicle.baseRate * routeInfo.distanceKm).toFixed(2)), vehicle.minFare);
    }
    return vehicle.minFare;
  };
  const baseFare = getVehicleFare(selectedVehicle);
  const totalFare = baseFare + extrasTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Use stored coords or geocode as fallback
      let pLat = pickupCoords?.lat, pLng = pickupCoords?.lng;
      let dLat = dropoffCoords?.lat, dLng = dropoffCoords?.lng;

      if (!pLat || !dLat) {
        const [pickupGeo, dropoffGeo] = await Promise.all([
          !pLat ? api.geocode(form.pickupAddress).catch(() => null) : null,
          !dLat ? api.geocode(form.dropoffAddress).catch(() => null) : null,
        ]);
        if (!pLat && pickupGeo) { pLat = pickupGeo.lat; pLng = pickupGeo.lng; }
        if (!dLat && dropoffGeo) { dLat = dropoffGeo.lat; dLng = dropoffGeo.lng; }
      }

      const data = await api.createBooking({
        customerName: form.customerName,
        pickup: { address: form.pickupAddress, lat: pLat || 51.5074, lng: pLng || -0.1278 },
        dropoff: { address: form.dropoffAddress, lat: dLat || 51.4700, lng: dLng || -0.4543 },
        date: form.date,
        time: form.time,
        vehicleType: form.vehicleType,
        extras: form.selectedExtras,
        notes: form.notes,
        source: 'admin_portal',
      });

      if (form.driverId && data.booking) {
        await api.assignDriver(data.booking.id, form.driverId);
      }

      setCreatedBooking(data.booking);
      setSuccess(true);
    } catch (e) { console.error(e); }
  };

  if (success) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center h-96">
        <div className="glass-card p-12 text-center max-w-md">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
            <div className="w-20 h-20 rounded-full gold-gradient mx-auto flex items-center justify-center mb-6">
              <Check className="w-10 h-10 text-navy-900" />
            </div>
          </motion.div>
          <h2 className="text-2xl font-display font-bold text-white mb-2">Booking Created</h2>
          <p className="text-white/50 mb-2">Booking ID: <span className="text-gold-400 font-mono">{createdBooking?.id}</span></p>
          <p className="text-white/30 text-sm mb-6">The booking has been created and the chauffeur has been notified.</p>
          <button onClick={() => { setSuccess(false); setForm({ customerName: '', pickupAddress: '', dropoffAddress: '', date: '', time: '', vehicleType: 'sedan', selectedExtras: [], notes: '', driverId: '' }); setPickupCoords(null); setDropoffCoords(null); setRouteInfo(null); }} className="btn-gold">
            Create Another Booking
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-display font-bold text-white">New Booking</h1>
        <p className="text-white/40 mt-1">Create a booking and assign a chauffeur</p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-gold-400" /> Client Details</h3>
          <input type="text" placeholder="Client full name" value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} className="input-dark" required />
        </motion.div>

        {/* Trip Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2"><MapPin className="w-5 h-5 text-gold-400" /> Trip Details</h3>
          <AddressAutocomplete
            value={form.pickupAddress}
            onChange={val => setForm(f => ({ ...f, pickupAddress: val }))}
            onSelect={s => setPickupCoords({ lat: s.lat, lng: s.lng })}
            placeholder="Pickup address"
            className="input-dark"
          />
          <AddressAutocomplete
            value={form.dropoffAddress}
            onChange={val => setForm(f => ({ ...f, dropoffAddress: val }))}
            onSelect={s => setDropoffCoords({ lat: s.lat, lng: s.lng })}
            placeholder="Drop-off address"
            className="input-dark"
          />
          <div className="grid grid-cols-2 gap-4">
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-dark" required />
            <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="input-dark" required />
          </div>

          {/* Route info */}
          {routeInfo && (
            <div className="flex gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/40">Distance:</span>
                <span className="text-gold-400 font-semibold">{routeInfo.distanceKm} km</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/40">Est. time:</span>
                <span className="text-gold-400 font-semibold">~{routeInfo.durationMinutes} min</span>
              </div>
            </div>
          )}

          {/* Map */}
          {pickupCoords && dropoffCoords && (
            <div className="h-[250px] rounded-xl overflow-hidden border border-white/10 mt-2">
              <BookingMap pickupCoords={pickupCoords} dropoffCoords={dropoffCoords} pickupLabel={form.pickupAddress} dropoffLabel={form.dropoffAddress} />
            </div>
          )}
        </motion.div>

        {/* Vehicle Selection */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Car className="w-5 h-5 text-gold-400" /> Vehicle Selection</h3>
          <div className="grid grid-cols-2 gap-4">
            {vehicleTypes.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => setForm(f => ({ ...f, vehicleType: v.id }))}
                className={`p-4 rounded-xl border text-left transition-all ${
                  form.vehicleType === v.id
                    ? 'border-gold-500/50 bg-gold-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <p className="font-semibold text-white text-sm">{v.name}</p>
                <p className="text-xs text-white/40 mt-1">{v.description}</p>
                <p className="text-gold-400 font-bold mt-2">{routeInfo ? `£${getVehicleFare(v).toFixed(2)}` : `From £${v.minFare.toFixed(2)}`}</p>
                <p className="text-xs text-white/30">Up to {v.capacity} passengers • £{v.baseRate}/km</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Extras */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Plus className="w-5 h-5 text-gold-400" /> Premium Extras</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {extras.map(ext => (
              <button
                key={ext.id}
                type="button"
                onClick={() => toggleExtra(ext.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  form.selectedExtras.includes(ext.id)
                    ? 'border-gold-500/50 bg-gold-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <p className="text-sm text-white/80">{ext.name}</p>
                <p className="text-xs text-gold-400 mt-1">{ext.price > 0 ? `£${ext.price.toFixed(2)}` : 'Complimentary'}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Assign Driver */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Assign Chauffeur (Optional)</h3>
          <select value={form.driverId} onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))} className="input-dark">
            <option value="">Assign later...</option>
            {drivers.filter(d => d.status === 'available').map(d => (
              <option key={d.id} value={d.id} className="bg-navy-500">{d.id} — {d.name} ({d.vehicle.make} {d.vehicle.model})</option>
            ))}
          </select>
          <textarea placeholder="Special instructions or notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-dark" rows={3} />
        </motion.div>

        {/* Price Summary & Submit */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card p-6">
          {routeInfo && (
            <div className="flex items-center justify-between mb-4 text-sm">
              <span className="text-white/50">Route</span>
              <span className="text-white/70">{routeInfo.distanceKm} km • ~{routeInfo.durationMinutes} min</span>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/50">{routeInfo ? `${routeInfo.distanceKm} km × £${selectedVehicle?.baseRate}/km` : 'Base Fare'}</span>
            <span className="text-white font-semibold">£{baseFare.toFixed(2)}</span>
          </div>
          {extrasTotal > 0 && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/50">Extras</span>
              <span className="text-white font-semibold">£{extrasTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-white font-bold text-lg">Total</span>
            <span className="text-gold-400 font-bold text-2xl">£{totalFare.toFixed(2)}</span>
          </div>
          <button type="submit" className="btn-gold w-full mt-6 text-center text-lg">
            Create Booking
          </button>
        </motion.div>
      </form>
    </div>
  );
}
