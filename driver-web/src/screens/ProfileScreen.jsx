import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../App';
import { api } from '../api';
import { Star, Phone, Mail, Car, LogOut, Edit3, Save } from 'lucide-react';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [driver, setDriver] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    api.getDriver(user.id).then(d => {
      setDriver(d.driver);
      setForm({
        name: d.driver.name, phone: d.driver.phone,
        make: d.driver.vehicle.make, model: d.driver.vehicle.model,
        plate: d.driver.vehicle.plate, color: d.driver.vehicle.color,
      });
    }).catch(console.error);
  }, [user]);

  const handleSave = async () => {
    try {
      const res = await api.updateProfile(user.id, {
        name: form.name, phone: form.phone,
        vehicle: { make: form.make, model: form.model, plate: form.plate, color: form.color },
      });
      if (res.driver) {
        setDriver(res.driver);
        setForm({
          name: res.driver.name, phone: res.driver.phone,
          make: res.driver.vehicle.make, model: res.driver.vehicle.model,
          plate: res.driver.vehicle.plate, color: res.driver.vehicle.color,
        });
      }
      setEditing(false);
    } catch (e) { alert(e.message); }
  };

  if (!driver) return (
    <div className="flex items-center justify-center h-80">
      <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const Field = ({ label, value, field }) => (
    <div className="flex items-center justify-between py-4 px-5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
      {editing && field ? (
        <input
          type="text"
          value={form[field] || ''}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          className="text-sm text-white text-right bg-white/5 px-3 py-1.5 rounded-lg outline-none border border-white/10 focus:border-gold-500/50 w-44"
        />
      ) : (
        <span className="text-sm font-medium text-white">{value}</span>
      )}
    </div>
  );

  return (
    <div className="px-5">
      <div className="pt-14 pb-2">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
      </div>

      {/* Avatar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-6">
        <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center text-3xl font-extrabold shadow-lg shadow-yellow-600/20"
          style={{ background: 'linear-gradient(135deg, #C8A951, #FFD94D)', color: '#0A1628' }}>
          {driver.name.split(' ').map(n => n[0]).join('')}
        </div>
        <p className="text-xl font-bold text-white">{driver.name}</p>
        <p className="text-xs font-mono mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>{driver.id}</p>
        <div className="flex items-center justify-center gap-1.5 mt-3">
          <Star size={14} fill="#C8A951" style={{ color: '#C8A951' }} />
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{driver.rating} rating</span>
          <span className="mx-1" style={{ color: 'rgba(255,255,255,0.15)' }}>•</span>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{driver.totalTrips} trips</span>
        </div>
      </motion.div>

      {/* Personal */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Personal Information</h3>
          <button onClick={() => editing ? handleSave() : setEditing(true)}
            className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#C8A951' }}>
            {editing ? <><Save size={14} /> Save</> : <><Edit3 size={14} /> Edit</>}
          </button>
        </div>
        <div className="card overflow-hidden mb-5">
          <Field label="Full Name" value={driver.name} field="name" />
          <Field label="Email" value={driver.email} />
          <Field label="Phone" value={driver.phone} field="phone" />
        </div>
      </motion.div>

      {/* Vehicle */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h3 className="text-base font-semibold text-white mb-3">Vehicle Information</h3>
        <div className="card overflow-hidden mb-5">
          <Field label="Make" value={driver.vehicle.make} field="make" />
          <Field label="Model" value={driver.vehicle.model} field="model" />
          <Field label="Registration" value={driver.vehicle.plate} field="plate" />
          <Field label="Colour" value={driver.vehicle.color} field="color" />
          <Field label="Year" value={driver.vehicle.year} />
          <Field label="Type" value={driver.vehicle.type} />
        </div>
      </motion.div>

      {/* Logout */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <button onClick={() => { if (confirm('Sign out?')) logout(); }}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-semibold mb-6 transition-all hover:bg-red-500/10"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', color: '#EF4444' }}>
          <LogOut size={18} /> Sign Out
        </button>
      </motion.div>
    </div>
  );
}
