'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { CreditCard, TrendingUp, CheckCircle, Clock, PoundSterling } from 'lucide-react';

export default function PaymentsPage() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    api.getBookings().then(d => setBookings(d.bookings || [])).catch(console.error);
  }, []);

  const completed = bookings.filter(b => b.status === 'completed');
  const pending = bookings.filter(b => ['pending', 'assigned', 'confirmed', 'in_progress'].includes(b.status));
  const totalRevenue = completed.reduce((s, b) => s + b.fare.total, 0);
  const pendingRevenue = pending.reduce((s, b) => s + b.fare.total, 0);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-display font-bold text-white">Payments</h1>
        <p className="text-white/40 mt-1">Payment tracking and financial overview</p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <PoundSterling className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-white/40">Collected Revenue</p>
              <p className="text-2xl font-bold text-emerald-400">£{totalRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <p className="text-xs text-white/30">{completed.length} completed trips</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-white/40">Pending Revenue</p>
              <p className="text-2xl font-bold text-amber-400">£{pendingRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <p className="text-xs text-white/30">{pending.length} active bookings</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-gold-400" />
            </div>
            <div>
              <p className="text-sm text-white/40">Total Revenue</p>
              <p className="text-2xl font-bold text-gold-400">£{(totalRevenue + pendingRevenue).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <p className="text-xs text-white/30">All bookings combined</p>
        </motion.div>
      </div>

      {/* Transactions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">Transaction History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Booking ID', 'Client', 'Date', 'Vehicle', 'Base Fare', 'Extras', 'Total', 'Status'].map(h => (
                  <th key={h} className="text-left px-6 py-4 text-xs text-white/30 font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => (
                <motion.tr
                  key={b.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.03 }}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-mono text-gold-400">{b.id}</td>
                  <td className="px-6 py-4 text-sm text-white/80">{b.customerName}</td>
                  <td className="px-6 py-4 text-sm text-white/50">{b.date}</td>
                  <td className="px-6 py-4 text-sm text-white/50">{b.vehicleName}</td>
                  <td className="px-6 py-4 text-sm text-white/60">£{b.fare.base.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-white/60">£{b.fare.extras.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-white">£{b.fare.total.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`status-badge ${b.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      {b.status === 'completed' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
