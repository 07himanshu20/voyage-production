'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { BarChart3, Star, TrendingUp, Car } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState(null);

  useEffect(() => {
    api.getReports().then(setReports).catch(console.error);
  }, []);

  if (!reports) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const vehicleLabels = { sedan: 'Executive Sedan', suv: 'Luxury SUV', mpv: 'Executive MPV', luxury: 'Ultra Luxury' };
  const sourceLabels = { app: 'Client App', admin_portal: 'Admin Portal', hotel_partner: 'Hotel Partner' };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-display font-bold text-white">Reports & Analytics</h1>
        <p className="text-white/40 mt-1">Business intelligence and performance metrics</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Car className="w-5 h-5 text-gold-400" /> Bookings by Vehicle Type
          </h3>
          <div className="space-y-4">
            {Object.entries(reports.vehicleBreakdown).map(([type, count]) => {
              const total = Object.values(reports.vehicleBreakdown).reduce((s, v) => s + v, 0);
              const pct = Math.round((count / total) * 100);
              const colors = { sedan: 'bg-blue-500', suv: 'bg-emerald-500', mpv: 'bg-purple-500', luxury: 'bg-gold-500' };
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/70">{vehicleLabels[type] || type}</span>
                    <span className="text-sm font-semibold text-white">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className={`h-full rounded-full ${colors[type] || 'bg-gold-500'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Source Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gold-400" /> Bookings by Source
          </h3>
          <div className="space-y-4">
            {Object.entries(reports.sourceBreakdown).map(([source, count]) => {
              const total = Object.values(reports.sourceBreakdown).reduce((s, v) => s + v, 0);
              const pct = Math.round((count / total) * 100);
              const colors = { app: 'bg-blue-500', admin_portal: 'bg-gold-500', hotel_partner: 'bg-emerald-500' };
              return (
                <div key={source}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/70">{sourceLabels[source] || source}</span>
                    <span className="text-sm font-semibold text-white">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: 0.7 }}
                      className={`h-full rounded-full ${colors[source] || 'bg-gold-500'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Top Chauffeurs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Star className="w-5 h-5 text-gold-400" /> Top Chauffeurs
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs text-white/30 font-medium uppercase tracking-wider">Rank</th>
                  <th className="text-left px-4 py-3 text-xs text-white/30 font-medium uppercase tracking-wider">Chauffeur</th>
                  <th className="text-left px-4 py-3 text-xs text-white/30 font-medium uppercase tracking-wider">Trips</th>
                  <th className="text-left px-4 py-3 text-xs text-white/30 font-medium uppercase tracking-wider">Earnings</th>
                  <th className="text-left px-4 py-3 text-xs text-white/30 font-medium uppercase tracking-wider">Rating</th>
                </tr>
              </thead>
              <tbody>
                {reports.topDrivers.map((d, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-4">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        i === 0 ? 'gold-gradient text-navy-900' : i === 1 ? 'bg-gray-400/20 text-gray-300' : 'bg-white/5 text-white/40'
                      }`}>{i + 1}</span>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-white">{d.name}</td>
                    <td className="px-4 py-4 text-sm text-white/60">{d.trips}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-emerald-400">£{d.earnings.toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-gold-400 fill-gold-400" />
                        <span className="text-sm text-white">{d.rating}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
