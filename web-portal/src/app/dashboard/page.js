'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import {
  CalendarCheck, MapPin, CheckCircle, DollarSign,
  Car, Users, Clock, TrendingUp, ArrowUpRight
} from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, sub, color, delay, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    onClick={onClick}
    className={`glass-card p-6 hover:border-gold-500/20 transition-all duration-300 group ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-gold-400 transition-colors" />
    </div>
    <p className="text-3xl font-bold text-white mb-1">{value}</p>
    <p className="text-sm text-white/40">{label}</p>
    {sub && <p className="text-xs text-gold-400 mt-2">{sub}</p>}
  </motion.div>
);

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
    api.getBookings().then(d => setBookings(d.bookings || [])).catch(console.error);
  }, []);

  // Real-time socket updates for dashboard
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const handleNewBooking = (booking) => {
      console.log('[Dashboard] new_booking received:', booking.id);
      setBookings(prev => {
        if (prev.some(b => b.id === booking.id)) return prev;
        return [booking, ...prev];
      });
      api.getStats().then(setStats).catch(console.error);
    };

    const handleUpdated = (updated) => {
      console.log('[Dashboard] booking_updated received:', updated.id);
      setBookings(prev => {
        const idx = prev.findIndex(b => b.id === updated.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
        return [updated, ...prev];
      });
      api.getStats().then(setStats).catch(console.error);
    };

    socket.on('new_booking', handleNewBooking);
    socket.on('booking_updated', handleUpdated);

    return () => {
      socket.off('new_booking', handleNewBooking);
      socket.off('booking_updated', handleUpdated);
    };
  }, []);

  const statusColor = {
    pending: 'bg-amber-500/10 text-amber-400',
    assigned: 'bg-blue-500/10 text-blue-400',
    confirmed: 'bg-emerald-500/10 text-emerald-400',
    in_progress: 'bg-purple-500/10 text-purple-400',
    completed: 'bg-green-500/10 text-green-400',
    cancelled: 'bg-red-500/10 text-red-400',
  };

  if (!stats) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-display font-bold text-white">Operations Dashboard</h1>
        <p className="text-white/40 mt-1">Real-time overview of Best Class Chauffeur operations</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={CalendarCheck} label="Total Bookings" value={stats.totalBookings} sub="+3 today" color="bg-gold-500/10 text-gold-400" delay={0} onClick={() => router.push('/dashboard/bookings')} />
        <StatCard icon={Clock} label="Pending Requests" value={stats.pendingBookings} sub="Awaiting assignment" color="bg-amber-500/10 text-amber-400" delay={0.1} onClick={() => router.push('/dashboard/bookings?filter=pending')} />
        <StatCard icon={MapPin} label="Active Trips" value={stats.activeTrips} sub="Live tracking" color="bg-purple-500/10 text-purple-400" delay={0.2} onClick={() => router.push('/dashboard/tracking')} />
        <StatCard icon={DollarSign} label="Revenue" value={`£${stats.totalRevenue.toLocaleString()}`} sub="From completed trips" color="bg-emerald-500/10 text-emerald-400" delay={0.3} onClick={() => router.push('/dashboard/payments')} />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Car} label="Total Chauffeurs" value={stats.totalDrivers} color="bg-blue-500/10 text-blue-400" delay={0.4} onClick={() => router.push('/dashboard/drivers')} />
        <StatCard icon={Car} label="Available Now" value={stats.availableDrivers} sub="Ready for assignment" color="bg-teal-500/10 text-teal-400" delay={0.5} onClick={() => router.push('/dashboard/drivers?filter=available')} />
        <StatCard icon={Users} label="Total Clients" value={stats.totalCustomers} color="bg-indigo-500/10 text-indigo-400" delay={0.6} onClick={() => router.push('/dashboard/customers')} />
        <StatCard icon={CheckCircle} label="Completed Trips" value={stats.completedTrips} color="bg-green-500/10 text-green-400" delay={0.7} onClick={() => router.push('/dashboard/bookings?filter=completed')} />
      </div>

      {/* Recent Bookings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Bookings</h2>
          <button onClick={() => router.push('/dashboard/bookings')} className="text-xs text-gold-400 hover:text-gold-300 transition-colors">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-4 text-xs text-white/30 font-medium uppercase tracking-wider">Booking ID</th>
                <th className="text-left px-6 py-4 text-xs text-white/30 font-medium uppercase tracking-wider">Client</th>
                <th className="text-left px-6 py-4 text-xs text-white/30 font-medium uppercase tracking-wider">Chauffeur</th>
                <th className="text-left px-6 py-4 text-xs text-white/30 font-medium uppercase tracking-wider">Vehicle</th>
                <th className="text-left px-6 py-4 text-xs text-white/30 font-medium uppercase tracking-wider">Date & Time</th>
                <th className="text-left px-6 py-4 text-xs text-white/30 font-medium uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs text-white/30 font-medium uppercase tracking-wider">Fare</th>
              </tr>
            </thead>
            <tbody>
              {bookings.slice(0, 10).map((b, i) => (
                <motion.tr
                  key={b.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => router.push('/dashboard/bookings')}
                >
                  <td className="px-6 py-4 text-sm font-mono text-gold-400">{b.id}</td>
                  <td className="px-6 py-4 text-sm text-white/80">{b.customerName}</td>
                  <td className="px-6 py-4 text-sm text-white/60">{b.driverName || '—'}</td>
                  <td className="px-6 py-4 text-sm text-white/60">{b.vehicleName}</td>
                  <td className="px-6 py-4 text-sm text-white/60">{b.date} {b.time}</td>
                  <td className="px-6 py-4">
                    <span className={`status-badge ${statusColor[b.status] || ''}`}>{b.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-white">£{b.fare.total.toFixed(2)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
