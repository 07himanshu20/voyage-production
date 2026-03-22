import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { ArrowRight, Bell, MapPin, Navigation, Star, Car, MessageCircle } from 'lucide-react';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const socketRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getBookings(user.id);
      setBookings(data.bookings || []);
    } catch (e) { console.error(e); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Real-time socket updates
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('customer_connect', user.id));

    // When booking status changes (assigned, driver en route, etc.)
    socket.on(`customer_${user.id}_update`, (updated) => {
      setBookings(prev => {
        const idx = prev.findIndex(b => b.id === updated.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
        return [updated, ...prev];
      });
    });

    socket.on('booking_updated', (updated) => {
      if (updated.customerId !== user.id) return;
      setBookings(prev => {
        const idx = prev.findIndex(b => b.id === updated.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
        return [updated, ...prev];
      });
    });

    socket.on('new_booking', (booking) => {
      if (booking.customerId !== user.id) return;
      setBookings(prev => {
        if (prev.some(b => b.id === booking.id)) return prev;
        return [booking, ...prev];
      });
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [user.id]);

  const active = bookings.filter(b => ['assigned', 'confirmed', 'in_progress'].includes(b.status));
  const upcoming = bookings.filter(b => b.status === 'confirmed' || b.status === 'assigned');
  const completed = bookings.filter(b => b.status === 'completed');

  const tripStatusLabel = { en_route: 'Chauffeur en route', arrived_pickup: 'Arrived at pickup', passenger_onboard: 'On the way', completed: 'Arrived' };

  return (
    <div className="px-5 pt-14 pb-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-sm text-text-secondary">Welcome back,</p>
          <h1 className="text-2xl font-bold text-white mt-1">{user?.name || 'Guest'}</h1>
        </div>
        <div className="relative w-11 h-11 rounded-[14px] bg-card border border-card-border flex items-center justify-center">
          <Bell size={18} className="text-white" />
          {active.length > 0 && <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500" />}
        </div>
      </div>

      {/* Book CTA */}
      <button
        onClick={() => navigation.navigate('BookRide')}
        className="w-full rounded-[20px] p-6 flex items-center bg-gold mb-6 text-left hover:brightness-105 transition-all"
      >
        <div className="flex-1">
          <h2 className="text-xl font-bold text-bg">Book a Chauffeur</h2>
          <p className="text-[13px] text-bg/60 mt-1">Premium vehicles at your service</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-bg/15 flex items-center justify-center">
          <ArrowRight size={20} className="text-bg" />
        </div>
      </button>

      {/* Active Trip */}
      {active.map(b => (
        <div key={b.id} className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Active Trip</h3>
          <div
            className="glass-card p-5 cursor-pointer hover:border-purple-500/20 transition-colors"
            onClick={() => navigation.navigate('TripTrack', { booking: b })}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-mono text-gold">{b.id}</span>
              <div className="flex items-center gap-1.5 bg-red-500/10 px-2.5 py-1 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] font-extrabold text-red-500 tracking-wider">LIVE</span>
              </div>
            </div>
            {b.driverName && <p className="text-base font-semibold text-white">Chauffeur: {b.driverName}</p>}
            <p className="text-[13px] text-text-secondary mt-0.5">{b.vehicleName}</p>
            {b.tripStatus && <p className="text-[13px] text-purple-400 font-semibold mt-2">{tripStatusLabel[b.tripStatus] || b.tripStatus}</p>}

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[13px] text-text-secondary truncate">{b.pickup.address.split(',')[0]}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={6} className="text-red-500" />
                <span className="text-[13px] text-text-secondary truncate">{b.dropoff.address.split(',')[0]}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gold/10 border border-gold/20 text-gold text-sm font-semibold">
                <Navigation size={14} /> Track
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); navigation.navigate('Chat', { booking: b }); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-semibold"
              >
                <MessageCircle size={14} /> Chat
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Upcoming Bookings</h3>
          {upcoming.map(b => (
            <div key={b.id} className="glass-card p-4 mb-2">
              <div className="flex justify-between mb-1.5">
                <span className="text-[11px] font-mono text-gold">{b.id}</span>
                <span className="text-[10px] font-bold uppercase text-green-500">{b.status}</span>
              </div>
              <p className="text-sm font-semibold text-white">{b.vehicleName}</p>
              <p className="text-xs text-text-secondary mt-0.5">{b.date} at {b.time}</p>
              <p className="text-xs text-text-muted mt-1 truncate">{b.pickup.address.split(',')[0]} → {b.dropoff.address.split(',')[0]}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent Trips */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Recent Trips</h3>
        {completed.length === 0 ? (
          <div className="glass-card py-12 flex flex-col items-center gap-2">
            <Car size={40} className="text-text-muted" />
            <p className="text-lg font-semibold text-white">No trips yet</p>
            <p className="text-[13px] text-text-muted">Book your first premium chauffeur experience</p>
          </div>
        ) : (
          completed.slice(0, 5).map(b => (
            <div key={b.id} className="glass-card p-4 mb-2 flex items-center">
              <div className="flex-1">
                <p className="text-xs text-text-muted">{b.date}</p>
                <p className="text-sm text-white font-medium mt-1 truncate">{b.pickup.address.split(',')[0]} → {b.dropoff.address.split(',')[0]}</p>
                <p className="text-xs text-text-secondary mt-0.5">{b.vehicleName}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-gold">£{b.fare.total.toFixed(2)}</p>
                {b.rating && (
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    <Star size={12} className="text-gold fill-gold" />
                    <span className="text-xs text-gold">{b.rating}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
