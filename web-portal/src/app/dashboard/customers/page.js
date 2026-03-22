'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Users, Crown, Mail, Phone, CalendarCheck } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    api.getCustomers().then(d => setCustomers(d.customers || [])).catch(console.error);
  }, []);

  const tierColor = {
    Platinum: 'from-gray-300 to-gray-500 text-gray-900',
    Gold: 'from-gold-400 to-gold-600 text-navy-900',
    Silver: 'from-gray-400 to-gray-500 text-navy-900',
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-display font-bold text-white">Clients</h1>
        <p className="text-white/40 mt-1">Client database and booking history</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {customers.map((customer, i) => (
          <motion.div
            key={customer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 hover:border-gold-500/20 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-300/20 to-navy-400/20 border border-white/10 flex items-center justify-center text-lg font-bold text-gold-400">
                  {customer.name ? customer.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{customer.name || 'New Client'}</h3>
                  <p className="text-xs font-mono text-white/30">{customer.id}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r ${tierColor[customer.loyaltyTier] || tierColor.Silver}`}>
                {customer.loyaltyTier}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-white/50">
                <Mail className="w-4 h-4 text-white/20" />
                {customer.email}
              </div>
              {customer.phone && (
                <div className="flex items-center gap-3 text-sm text-white/50">
                  <Phone className="w-4 h-4 text-white/20" />
                  {customer.phone}
                </div>
              )}
              <div className="flex items-center gap-3 text-sm text-white/50">
                <CalendarCheck className="w-4 h-4 text-white/20" />
                {customer.totalBookings} bookings
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/5 flex gap-2">
              <button className="btn-outline flex-1 text-center text-xs py-2">View History</button>
              <button className="btn-gold flex-1 text-center text-xs py-2">New Booking</button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
