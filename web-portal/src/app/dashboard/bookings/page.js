'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Search, Filter, UserPlus, X, Check, ChevronDown } from 'lucide-react';

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="text-white/40 p-8">Loading bookings...</div>}>
      <BookingsContent />
    </Suspense>
  );
}

function BookingsContent() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all');
  const [search, setSearch] = useState('');
  const [assignModal, setAssignModal] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  // Real-time socket updates — new bookings appear instantly
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const handleNewBooking = (booking) => {
      console.log('[Bookings] new_booking received:', booking.id);
      setBookings(prev => {
        if (prev.some(b => b.id === booking.id)) return prev;
        return [booking, ...prev];
      });
    };

    const handleUpdated = (updated) => {
      console.log('[Bookings] booking_updated received:', updated.id);
      setBookings(prev => {
        const idx = prev.findIndex(b => b.id === updated.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
        return [updated, ...prev];
      });
    };

    socket.on('new_booking', handleNewBooking);
    socket.on('booking_updated', handleUpdated);

    return () => {
      socket.off('new_booking', handleNewBooking);
      socket.off('booking_updated', handleUpdated);
    };
  }, []);

  const loadData = async () => {
    try {
      const [bData, dData] = await Promise.all([api.getBookings(), api.getDrivers()]);
      setBookings(bData.bookings || []);
      setDrivers(dData.drivers || []);
    } catch (e) { console.error(e); }
  };

  const handleAssign = async () => {
    if (!assignModal || !selectedDriver) return;
    try {
      await api.assignDriver(assignModal.id, selectedDriver);
      setAssignModal(null);
      setSelectedDriver('');
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleCancel = async (id) => {
    try {
      await api.cancelBooking(id);
      loadData();
    } catch (e) { console.error(e); }
  };

  const filtered = bookings
    .filter(b => filter === 'all' || b.status === filter)
    .filter(b => !search || b.customerName.toLowerCase().includes(search.toLowerCase()) || b.id.toLowerCase().includes(search.toLowerCase()));

  const statusColor = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    assigned: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    in_progress: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const filters = ['all', 'pending', 'assigned', 'confirmed', 'in_progress', 'completed', 'cancelled'];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-display font-bold text-white">Bookings</h1>
        <p className="text-white/40 mt-1">Manage all chauffeur bookings</p>
      </motion.div>

      {/* Filters & Search */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search by client name or booking ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-11"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                filter === f ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30' : 'bg-white/5 text-white/40 hover:text-white/60'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Booking', 'Client', 'Pickup', 'Dropoff', 'Date/Time', 'Vehicle', 'Chauffeur', 'Status', 'Fare', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-xs text-white/30 font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <motion.tr
                  key={b.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-4 text-sm font-mono text-gold-400">{b.id}</td>
                  <td className="px-5 py-4 text-sm text-white/80">{b.customerName}</td>
                  <td className="px-5 py-4 text-xs text-white/50 max-w-[160px] truncate">{b.pickup.address}</td>
                  <td className="px-5 py-4 text-xs text-white/50 max-w-[160px] truncate">{b.dropoff.address}</td>
                  <td className="px-5 py-4 text-sm text-white/60 whitespace-nowrap">{b.date}<br/><span className="text-white/30">{b.time}</span></td>
                  <td className="px-5 py-4 text-sm text-white/60">{b.vehicleName}</td>
                  <td className="px-5 py-4 text-sm text-white/60">{b.driverName || '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`status-badge border ${statusColor[b.status] || ''}`}>{b.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-white">£{b.fare.total.toFixed(2)}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      {(b.status === 'pending') && (
                        <button
                          onClick={() => setAssignModal(b)}
                          className="px-3 py-1.5 rounded-lg bg-gold-500/10 text-gold-400 text-xs font-semibold hover:bg-gold-500/20 transition-all"
                        >
                          Assign
                        </button>
                      )}
                      {['pending', 'assigned', 'confirmed'].includes(b.status) && (
                        <button
                          onClick={() => handleCancel(b.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Assign Driver Modal */}
      <AnimatePresence>
        {assignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setAssignModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 w-full max-w-lg mx-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-display font-bold text-white">Assign Chauffeur</h3>
                <button onClick={() => setAssignModal(null)} className="text-white/30 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-white/50 mb-4">Booking {assignModal.id} — {assignModal.customerName}</p>
              <p className="text-xs text-white/30 mb-1">Pickup: {assignModal.pickup.address}</p>
              <p className="text-xs text-white/30 mb-6">Dropoff: {assignModal.dropoff.address}</p>

              <label className="block text-sm text-white/50 mb-2">Select Chauffeur</label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="input-dark mb-6"
              >
                <option value="">Choose a chauffeur...</option>
                {drivers.filter(d => d.status === 'available').map(d => (
                  <option key={d.id} value={d.id} className="bg-navy-500">
                    {d.id} — {d.name} ({d.vehicle.make} {d.vehicle.model})
                  </option>
                ))}
              </select>

              <div className="flex gap-3">
                <button onClick={handleAssign} className="btn-gold flex-1 text-center">
                  <Check className="w-4 h-4 inline mr-2" />Assign
                </button>
                <button onClick={() => setAssignModal(null)} className="btn-outline flex-1 text-center">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
