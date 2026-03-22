import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import TripMap from '../components/TripMap';
import { ChevronLeft, Navigation, Clock, FileText, Gift, MapPin, Check, X, Car, Flag, Users, CheckCircle } from 'lucide-react';

const STAGES = [
  { key: 'en_route', label: 'En Route to Pickup', icon: Navigation, btn: 'Start Trip – En Route', color: '#3B82F6' },
  { key: 'arrived_pickup', label: 'Arrived at Pickup', icon: Flag, btn: 'Arrived at Pickup', color: '#F59E0B' },
  { key: 'passenger_onboard', label: 'Passenger Onboard', icon: Users, btn: 'Passenger Onboarded', color: '#A855F7' },
  { key: 'completed', label: 'Trip Completed', icon: CheckCircle, btn: 'Complete Trip', color: '#10B981' },
];

function getDriverLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      // Fallback: simulate near London
      resolve({ lat: 51.5074 + (Math.random() - 0.5) * 0.02, lng: -0.1278 + (Math.random() - 0.5) * 0.02 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: 51.5074 + (Math.random() - 0.5) * 0.02, lng: -0.1278 + (Math.random() - 0.5) * 0.02 }),
      { timeout: 5000, enableHighAccuracy: false }
    );
  });
}

export default function TripDetailScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(location.state?.booking);
  const [loading, setLoading] = useState(false);

  // Listen for real-time booking updates via socket
  useEffect(() => {
    if (!booking) return;
    const socket = io(SOCKET_URL);
    socket.on('booking_updated', (updated) => {
      if (updated.id === booking.id) {
        setBooking(updated);
      }
    });
    return () => socket.disconnect();
  }, [booking?.id]);

  // Also poll for fresh booking data to stay in sync
  useEffect(() => {
    if (!booking) return;
    const interval = setInterval(async () => {
      try {
        const data = await api.getBooking(booking.id);
        if (data.booking) setBooking(data.booking);
      } catch (e) { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [booking?.id]);

  if (!booking) { navigate('/'); return null; }

  const handleAccept = async () => {
    setLoading(true);
    try { const d = await api.respondBooking(booking.id, 'accept'); setBooking(d.booking); } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!confirm('Decline this trip?')) return;
    setLoading(true);
    try { await api.respondBooking(booking.id, 'reject'); navigate('/'); } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const handleTripUpdate = async (status) => {
    setLoading(true);
    try {
      const driverLocation = await getDriverLocation();
      const d = await api.updateTripStatus(booking.id, status, driverLocation);
      setBooking(d.booking);
      if (status === 'completed') { alert('Trip completed!'); navigate('/'); }
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const openNav = (lat, lng, app) => {
    const urls = {
      waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
      google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    };
    window.open(urls[app], '_blank');
  };

  const curIdx = STAGES.findIndex(s => s.key === booking.tripStatus);
  const nextStage = booking.status === 'confirmed' ? STAGES[0] : STAGES[curIdx + 1] || null;

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <button onClick={() => navigate('/')} className="card w-10 h-10 flex items-center justify-center">
          <ChevronLeft size={20} className="text-white" />
        </button>
        <h2 className="text-lg font-semibold text-white">Trip Details</h2>
        <div className="w-10" />
      </div>

      {/* Booking Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card mx-5 p-5 mb-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono" style={{ color: '#C8A951' }}>{booking.id}</span>
          <span className="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider"
            style={{ background: 'rgba(200,169,81,0.1)', color: '#C8A951' }}>
            {booking.status.replace('_', ' ')}
          </span>
        </div>
        <p className="text-xl font-bold text-white">{booking.customerName}</p>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{booking.vehicleName}</p>
        <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Trip Fare</span>
          <span className="text-2xl font-bold" style={{ color: '#C8A951' }}>£{booking.fare.total.toFixed(2)}</span>
        </div>
      </motion.div>

      {/* Map */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="card mx-5 mb-3 overflow-hidden" style={{ height: '260px' }}>
        <TripMap
          pickup={booking.pickup}
          dropoff={booking.dropoff}
          tripEvents={booking.tripEvents || []}
        />
      </motion.div>

      {/* Route */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card mx-5 p-5 mb-3">
        {/* Pickup */}
        <div className="flex gap-3 mb-5 relative">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-emerald-400 flex-shrink-0 mt-1" />
            <div className="w-0.5 flex-1 mt-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>PICKUP</p>
            <p className="text-sm text-white leading-relaxed">{booking.pickup.address}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => openNav(booking.pickup.lat, booking.pickup.lng, 'waze')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(200,169,81,0.1)', color: '#C8A951' }}>
                <Navigation size={12} /> Waze
              </button>
              <button onClick={() => openNav(booking.pickup.lat, booking.pickup.lng, 'google')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(200,169,81,0.1)', color: '#C8A951' }}>
                <MapPin size={12} /> Google
              </button>
            </div>
          </div>
        </div>
        {/* Dropoff */}
        <div className="flex gap-3">
          <div className="w-3 h-3 rounded-full bg-red-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>DROP-OFF</p>
            <p className="text-sm text-white leading-relaxed">{booking.dropoff.address}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => openNav(booking.dropoff.lat, booking.dropoff.lng, 'waze')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(200,169,81,0.1)', color: '#C8A951' }}>
                <Navigation size={12} /> Waze
              </button>
              <button onClick={() => openNav(booking.dropoff.lat, booking.dropoff.lng, 'google')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(200,169,81,0.1)', color: '#C8A951' }}>
                <MapPin size={12} /> Google
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card mx-5 p-5 mb-3 space-y-3.5">
        <div className="flex items-center gap-3">
          <Clock size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{booking.date} at {booking.time}</span>
        </div>
        {booking.notes && (
          <div className="flex items-center gap-3">
            <FileText size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{booking.notes}</span>
          </div>
        )}
        {booking.extras?.length > 0 && (
          <div className="flex items-center gap-3">
            <Gift size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{booking.extras.join(', ')}</span>
          </div>
        )}
      </motion.div>

      {/* Trip Progress */}
      {(booking.status === 'confirmed' || booking.status === 'in_progress') && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card mx-5 p-5 mb-3">
          <h4 className="text-base font-semibold text-white mb-4">Trip Progress</h4>
          {STAGES.map((stage, i) => {
            const done = i <= curIdx;
            const current = i === curIdx;
            const event = (booking.tripEvents || []).find(e => e.status === stage.key);
            return (
              <div key={stage.key} className="flex items-center gap-3 mb-4 last:mb-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: done ? stage.color : 'rgba(255,255,255,0.04)',
                    border: current ? `2px solid #C8A951` : 'none',
                  }}>
                  {done ? <Check size={14} className="text-white" /> : <stage.icon size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />}
                </div>
                <div className="flex-1">
                  <span className="text-sm" style={{ color: done ? '#fff' : 'rgba(255,255,255,0.2)' }}>{stage.label}</span>
                  {event && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {event.driverLocation && ` · ${event.driverLocation.lat.toFixed(4)}, ${event.driverLocation.lng.toFixed(4)}`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 pb-8 pt-4"
        style={{ background: 'linear-gradient(transparent, #0A1628 30%)' }}>
        {booking.status === 'assigned' && (
          <div className="flex gap-3">
            <button onClick={handleReject} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-semibold transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
              <X size={18} /> Decline
            </button>
            <button onClick={handleAccept} disabled={loading}
              className="flex-[2] flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold transition-all hover:scale-[1.02]"
              style={{ background: '#C8A951', color: '#0A1628' }}>
              <Check size={18} /> {loading ? 'Processing...' : 'Accept Trip'}
            </button>
          </div>
        )}

        {nextStage && (booking.status === 'confirmed' || booking.status === 'in_progress') && (
          <button onClick={() => handleTripUpdate(nextStage.key)} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold text-white transition-all hover:scale-[1.02]"
            style={{ background: nextStage.color }}>
            <nextStage.icon size={18} /> {loading ? 'Updating...' : nextStage.btn}
          </button>
        )}
      </div>
    </div>
  );
}
