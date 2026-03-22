'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Car, Star, MapPin, Phone, Mail, TrendingUp } from 'lucide-react';

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    api.getDrivers().then(d => setDrivers(d.drivers || [])).catch(console.error);
  }, []);

  const statusColor = {
    available: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    on_trip: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    assigned: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    offline: 'bg-white/5 text-white/30 border-white/10',
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-display font-bold text-white">Chauffeurs</h1>
        <p className="text-white/40 mt-1">Manage chauffeur profiles and fleet vehicles</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {drivers.map((driver, i) => (
          <motion.div
            key={driver.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 hover:border-gold-500/20 transition-all duration-300 group"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-500/20 to-gold-700/20 border border-gold-500/20 flex items-center justify-center text-lg font-bold text-gold-400">
                  {driver.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-gold-400 transition-colors">{driver.name}</h3>
                  <p className="text-xs font-mono text-white/30">{driver.id}</p>
                </div>
              </div>
              <span className={`status-badge border ${statusColor[driver.status]}`}>
                {driver.status.replace('_', ' ')}
              </span>
            </div>

            {/* Vehicle */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-4 h-4 text-gold-400" />
                <span className="text-sm font-semibold text-white">{driver.vehicle.make} {driver.vehicle.model}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-white/40">
                <span>{driver.vehicle.year}</span>
                <span>{driver.vehicle.plate}</span>
                <span className="capitalize">{driver.vehicle.color}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="w-3 h-3 text-gold-400" />
                  <span className="text-sm font-bold text-white">{driver.rating}</span>
                </div>
                <p className="text-[10px] text-white/30 uppercase">Rating</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                <p className="text-sm font-bold text-white">{driver.totalTrips}</p>
                <p className="text-[10px] text-white/30 uppercase">Trips</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                <p className="text-sm font-bold text-emerald-400">£{(driver.earnings / 1000).toFixed(1)}k</p>
                <p className="text-[10px] text-white/30 uppercase">Earned</p>
              </div>
            </div>

            {/* Contact */}
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] text-xs text-white/40">
                <Phone className="w-3 h-3" />{driver.phone}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
