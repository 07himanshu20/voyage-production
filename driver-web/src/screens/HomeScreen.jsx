import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { useAuth } from '../App';
import { api } from '../api';
import { Car, Bell, Navigation, Calendar, MapPin, ChevronRight } from 'lucide-react';

export default function HomeScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const socketRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getBookings(user.id);
      if (data) setBookings(data.bookings || []);
    } catch (e) { console.error('Failed to load bookings:', e); }
  }, [user]);

  // Initial load + fallback polling every 15s
  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [load]);

  // Real-time Socket.IO for instant booking notifications
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('driver_connect', user.id);
    });

    // When a booking is assigned to this driver
    socket.on(`driver_${user.id}_booking`, (booking) => {
      setBookings(prev => {
        const idx = prev.findIndex(b => b.id === booking.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = booking;
          return next;
        }
        return [booking, ...prev];
      });
    });

    // When any booking is updated (status changes, etc.)
    socket.on('booking_updated', (updated) => {
      setBookings(prev => {
        const idx = prev.findIndex(b => b.id === updated.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        // If this booking belongs to this driver but wasn't in list yet
        if (updated.driverId === user.id) return [updated, ...prev];
        return prev;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user.id]);

  const toggleOnline = async () => {
    const next = !isOnline;
    setIsOnline(next);
    try { await api.updateStatus(user.id, next ? 'available' : 'offline'); } catch (e) { console.error(e); }
  };

  const assigned = bookings.filter(b => b.status === 'assigned');
  const today = bookings.filter(b => b.date === new Date().toISOString().split('T')[0]);
  const active = bookings.filter(b => ['in_progress', 'confirmed'].includes(b.status));

  const assignedRef = useRef(null);
  const todayRef = useRef(null);

  const handleStatClick = (type) => {
    if (type === 'today') {
      if (today.length > 0) todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (type === 'requests') {
      if (assigned.length > 0) {
        assignedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (type === 'active') {
      if (active.length >= 1) {
        navigate(`/trip/${active[0].id}`, { state: { booking: active[0] } });
      }
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const statusColor = { pending: '#F59E0B', assigned: '#3B82F6', confirmed: '#10B981', in_progress: '#A855F7', completed: '#10B981' };

  return (
    <div className="px-5">
      {/* Header */}
      <div className="flex items-center justify-between pt-14 pb-5">
        <div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{greeting}</p>
          <h1 className="text-2xl font-bold text-white mt-1">{user?.name}</h1>
        </div>
        <button onClick={toggleOnline} className="flex items-center gap-2 px-4 py-2 rounded-full transition-all"
          style={{ background: isOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: isOnline ? '#10B981' : '#EF4444' }} />
          <span className="text-xs font-semibold" style={{ color: isOnline ? '#10B981' : '#EF4444' }}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: Car, value: today.length, label: "Today's Trips", color: '#C8A951', type: 'today' },
          { icon: Bell, value: assigned.length, label: 'New Requests', color: '#F59E0B', type: 'requests' },
          { icon: Navigation, value: active.length, label: 'Active', color: '#A855F7', type: 'active' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            onClick={() => handleStatClick(s.type)}
            className="card p-4 text-center cursor-pointer hover:border-white/10 transition-all active:scale-95">
            <s.icon size={18} style={{ color: s.color, margin: '0 auto 8px' }} />
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-[9px] uppercase tracking-wider mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* New Assignments */}
      {assigned.length > 0 && (
        <div className="mb-6" ref={assignedRef}>
          <h3 className="text-base font-semibold text-white mb-3">New Trip Assignments</h3>
          {assigned.map((b, i) => (
            <motion.button
              key={b.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              onClick={() => navigate(`/trip/${b.id}`, { state: { booking: b } })}
              className="w-full card p-4 mb-2.5 flex items-center gap-3 text-left hover:border-yellow-600/30 transition-all"
              style={{ background: 'rgba(200,169,81,0.06)', borderColor: 'rgba(200,169,81,0.15)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#C8A951' }}>
                <Bell size={16} style={{ color: '#0A1628' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono" style={{ color: '#C8A951' }}>{b.id}</p>
                <p className="text-sm font-semibold text-white truncate">{b.customerName}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {b.pickup.address.split(',')[0]} → {b.dropoff.address.split(',')[0]}
                </p>
                <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>{b.date} at {b.time}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold" style={{ color: '#C8A951' }}>£{b.fare.total.toFixed(0)}</p>
                <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.15)', marginLeft: 'auto' }} />
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Today's Schedule */}
      <div className="mb-6" ref={todayRef}>
        <h3 className="text-base font-semibold text-white mb-3">Today's Schedule</h3>
        {today.length === 0 ? (
          <div className="card py-12 text-center">
            <Calendar size={36} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 12px' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>No trips scheduled for today</p>
          </div>
        ) : (
          today.map((b, i) => (
            <motion.button
              key={b.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              onClick={() => navigate(`/trip/${b.id}`, { state: { booking: b } })}
              className="w-full card p-4 mb-2 flex items-center gap-3 text-left hover:border-white/10 transition-all"
            >
              <div className="text-center flex-shrink-0 w-12">
                <p className="text-sm font-bold text-white">{b.time}</p>
                <div className="w-2 h-2 rounded-full mx-auto mt-1.5" style={{ background: statusColor[b.status] }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{b.customerName}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{b.pickup.address.split(',')[0]}</p>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin size={6} className="text-red-400 flex-shrink-0" />
                  <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{b.dropoff.address.split(',')[0]}</p>
                </div>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider flex-shrink-0" style={{ color: statusColor[b.status] }}>
                {b.status.replace('_', ' ')}
              </span>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}
