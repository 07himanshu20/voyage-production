'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Shield, Bell, Globe, Check, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [notifications, setNotifications] = useState({
    newBookingAlerts: true,
    tripStatusChanges: true,
    driverLocationUpdates: true,
    paymentConfirmations: true,
    customerReviews: true,
  });

  useEffect(() => {
    api.getSettings().then(data => {
      if (data?.settings) {
        const s = data.settings;
        setCompanyName(s.companyName || '');
        setContactEmail(s.contactEmail || '');
        setPhone(s.phone || '');
        setWebsite(s.website || '');
        if (s.notifications) setNotifications(s.notifications);
      }
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSettings({ companyName, contactEmail, phone, website, notifications });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const notificationItems = [
    { key: 'newBookingAlerts', label: 'New booking alerts' },
    { key: 'tripStatusChanges', label: 'Trip status changes' },
    { key: 'driverLocationUpdates', label: 'Driver location updates' },
    { key: 'paymentConfirmations', label: 'Payment confirmations' },
    { key: 'customerReviews', label: 'Customer reviews' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-display font-bold text-white">Settings</h1>
        <p className="text-white/40 mt-1">System configuration and access controls</p>
      </motion.div>

      {/* Company Info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Globe className="w-5 h-5 text-gold-400" /> Company Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/40 mb-1">Company Name</label>
            <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="input-dark" />
          </div>
          <div>
            <label className="block text-sm text-white/40 mb-1">Contact Email</label>
            <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="input-dark" />
          </div>
          <div>
            <label className="block text-sm text-white/40 mb-1">Phone</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="input-dark" />
          </div>
          <div>
            <label className="block text-sm text-white/40 mb-1">Website</label>
            <input type="text" value={website} onChange={e => setWebsite(e.target.value)} className="input-dark" />
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Bell className="w-5 h-5 text-gold-400" /> Notifications</h3>
        {notificationItems.map((item) => (
          <label key={item.key} className="flex items-center justify-between py-2 cursor-pointer group">
            <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">{item.label}</span>
            <input
              type="checkbox"
              checked={notifications[item.key]}
              onChange={() => toggleNotification(item.key)}
              className="w-5 h-5 rounded accent-gold-500"
            />
          </label>
        ))}
      </motion.div>

      {/* Access Control */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Shield className="w-5 h-5 text-gold-400" /> Access Control</h3>
        <div className="space-y-3">
          {[
            { role: 'Super Admin', desc: 'Full system access', users: 1 },
            { role: 'Admin', desc: 'Manage bookings, drivers, clients', users: 1 },
            { role: 'Operator', desc: 'View and manage bookings only', users: 0 },
            { role: 'Viewer', desc: 'Read-only access', users: 0 },
          ].map((r, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div>
                <p className="text-sm font-semibold text-white">{r.role}</p>
                <p className="text-xs text-white/30">{r.desc}</p>
              </div>
              <span className="text-xs text-white/40">{r.users} user(s)</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <button onClick={handleSave} disabled={saving} className="btn-gold">
          {saving ? <><Loader2 className="w-4 h-4 inline mr-2 animate-spin" />Saving...</> :
           saved ? <><Check className="w-4 h-4 inline mr-2" />Saved</> : 'Save Changes'}
        </button>
      </motion.div>
    </div>
  );
}
