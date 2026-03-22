import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { Clock, UserCheck, CheckCircle, Car, Flag, XCircle, Navigation, Star, MapPin } from 'lucide-react';

export default function BookingsScreen({ navigation }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState('upcoming');
  const socketRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getBookings(user.id);
      setBookings(data.bookings || []);
    } catch (e) { console.error(e); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Real-time updates
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('customer_connect', user.id));

    const handleUpdate = (updated) => {
      if (updated.customerId !== user.id) return;
      setBookings(prev => {
        const idx = prev.findIndex(b => b.id === updated.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
        return [updated, ...prev];
      });
    };

    socket.on(`customer_${user.id}_update`, handleUpdate);
    socket.on('booking_updated', handleUpdate);
    socket.on('new_booking', (booking) => {
      if (booking.customerId !== user.id) return;
      setBookings(prev => prev.some(b => b.id === booking.id) ? prev : [booking, ...prev]);
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [user.id]);

  const upcoming = bookings.filter(b => ['pending', 'assigned', 'confirmed', 'in_progress'].includes(b.status));
  const past = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));
  const displayed = tab === 'upcoming' ? upcoming : past;

  const statusConfig = {
    pending: { color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Pending', Icon: Clock },
    assigned: { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Assigned', Icon: UserCheck },
    confirmed: { color: 'text-green-400', bg: 'bg-green-400/10', label: 'Confirmed', Icon: CheckCircle },
    in_progress: { color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'In Progress', Icon: Car },
    completed: { color: 'text-green-400', bg: 'bg-green-400/10', label: 'Completed', Icon: Flag },
    cancelled: { color: 'text-red-400', bg: 'bg-red-400/10', label: 'Cancelled', Icon: XCircle },
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try { await api.cancelBooking(id); load(); } catch (e) { alert(e.message); }
  };

  const handleRate = async (booking, rating) => {
    const reviews = { 5: 'Excellent service!', 4: 'Great experience.', 3: 'Good.' };
    try { await api.rateBooking(booking.id, rating, reviews[rating] || ''); load(); } catch (e) { alert(e.message); }
  };

  return (
    <div className="px-5 pt-14 pb-4">
      <h1 className="text-[28px] font-bold text-white mb-4">My Bookings</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {['upcoming', 'past'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 rounded-[14px] text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${tab === t ? 'bg-gold/10 border border-gold/30 text-gold' : 'bg-card text-text-muted'}`}>
            {t === 'upcoming' ? 'Upcoming' : 'Past'}
            {t === 'upcoming' && upcoming.length > 0 && (
              <span className="bg-gold text-bg text-[10px] font-bold px-1.5 py-0.5 rounded-full">{upcoming.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <div className="glass-card py-12 flex flex-col items-center gap-3 mt-10">
          <Clock size={40} className="text-text-muted" />
          <p className="text-base text-text-muted">No {tab} bookings</p>
        </div>
      ) : (
        displayed.map(b => {
          const sc = statusConfig[b.status] || statusConfig.pending;
          const Icon = sc.Icon;
          return (
            <div key={b.id} className="glass-card p-5 mb-3"
              onClick={() => b.status === 'in_progress' ? navigation.navigate('TripTrack', { booking: b }) : null}
              style={{ cursor: b.status === 'in_progress' ? 'pointer' : 'default' }}
            >
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[11px] font-mono text-gold">{b.id}</span>
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${sc.color} ${sc.bg}`}>
                  <Icon size={12} /> {sc.label}
                </span>
              </div>

              <p className="text-base font-semibold text-white">{b.vehicleName}</p>
              {b.driverName && <p className="text-[13px] text-text-secondary mt-0.5">Chauffeur: {b.driverName}</p>}

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /><span className="text-[13px] text-text-secondary truncate">{b.pickup.address.split(',')[0]}</span></div>
                <div className="flex items-center gap-2"><MapPin size={6} className="text-red-500" /><span className="text-[13px] text-text-secondary truncate">{b.dropoff.address.split(',')[0]}</span></div>
              </div>

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-card-border">
                <span className="text-[13px] text-text-muted">{b.date} at {b.time}</span>
                <span className="text-base font-bold text-gold">£{b.fare.total.toFixed(2)}</span>
              </div>

              {/* Actions */}
              {b.status === 'in_progress' && (
                <button onClick={() => navigation.navigate('TripTrack', { booking: b })} className="w-full mt-3 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gold/10 border border-gold/20 text-gold text-[13px] font-semibold">
                  <Navigation size={14} /> Track Live
                </button>
              )}
              {['pending', 'assigned', 'confirmed'].includes(b.status) && (
                <button onClick={() => handleCancel(b.id)} className="w-full mt-2.5 text-[13px] text-red-400 font-medium py-1">Cancel Booking</button>
              )}
              {b.status === 'completed' && !b.rating && (
                <div className="mt-3 flex items-center justify-center gap-1">
                  {[3,4,5].map(r => (
                    <button key={r} onClick={() => handleRate(b, r)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gold/[0.08] text-gold text-xs font-semibold hover:bg-gold/20 transition-colors">
                      <Star size={12} /> {r}
                    </button>
                  ))}
                </div>
              )}
              {b.rating && (
                <div className="flex items-center justify-center gap-0.5 mt-3">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={14} className={s <= b.rating ? 'text-gold fill-gold' : 'text-text-muted'} />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
