import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../App';
import { api } from '../api';
import { Car, CheckCircle, Check } from 'lucide-react';

export default function EarningsScreen() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getEarnings(user.id).then(setData).catch(console.error);
  }, [user]);

  if (!data) return (
    <div className="flex items-center justify-center h-80">
      <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const completed = data.trips?.filter(t => t.status === 'completed') || [];

  return (
    <div className="px-5">
      <div className="pt-14 pb-5">
        <h1 className="text-2xl font-bold text-white">Earnings</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Your performance overview</p>
      </div>

      {/* Gold card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-7 mb-4 shadow-lg shadow-yellow-600/10"
        style={{ background: 'linear-gradient(135deg, #C8A951, #FFD94D)' }}>
        <p className="text-xs font-medium" style={{ color: 'rgba(10,22,40,0.5)' }}>Total Earnings</p>
        <p className="text-4xl font-extrabold mt-1" style={{ color: '#0A1628' }}>
          £{data.totalEarnings.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
        </p>
        <div className="mt-5 pt-5 flex" style={{ borderTop: '1px solid rgba(10,22,40,0.1)' }}>
          <div className="flex-1 text-center">
            <p className="text-xl font-bold" style={{ color: '#0A1628' }}>£{data.todayEarnings.toFixed(2)}</p>
            <p className="text-[10px]" style={{ color: 'rgba(10,22,40,0.4)' }}>Today</p>
          </div>
          <div className="flex-1 text-center" style={{ borderLeft: '1px solid rgba(10,22,40,0.1)' }}>
            <p className="text-xl font-bold" style={{ color: '#0A1628' }}>£{data.weekEarnings.toFixed(2)}</p>
            <p className="text-[10px]" style={{ color: 'rgba(10,22,40,0.4)' }}>This Week</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="card p-5 text-center">
          <Car size={22} style={{ color: '#C8A951', margin: '0 auto 8px' }} />
          <p className="text-2xl font-bold text-white">{data.totalTrips}</p>
          <p className="text-[9px] uppercase tracking-wider mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Total Trips</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="card p-5 text-center">
          <CheckCircle size={22} style={{ color: '#10B981', margin: '0 auto 8px' }} />
          <p className="text-2xl font-bold text-white">{data.completedTrips}</p>
          <p className="text-[9px] uppercase tracking-wider mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Completed</p>
        </motion.div>
      </div>

      {/* History */}
      <h3 className="text-base font-semibold text-white mb-3">Trip History</h3>
      {completed.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>No completed trips yet</p>
        </div>
      ) : (
        completed.map((trip, i) => (
          <motion.div key={trip.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.05 }}
            className="card p-4 mb-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.1)' }}>
              <Check size={14} style={{ color: '#10B981' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-mono" style={{ color: '#C8A951' }}>{trip.id}</p>
              <p className="text-sm font-semibold text-white">{trip.customerName}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{trip.date} at {trip.time}</p>
            </div>
            <span className="text-base font-bold" style={{ color: '#10B981' }}>£{trip.fare.total.toFixed(2)}</span>
          </motion.div>
        ))
      )}
    </div>
  );
}
