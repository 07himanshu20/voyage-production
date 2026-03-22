import { useAuth } from '../AuthContext';
import { User, CreditCard, MapPin, Bell, Shield, HelpCircle, FileText, LogOut, Diamond, ChevronRight } from 'lucide-react';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const menuItems = [
    { Icon: User, label: 'Personal Information', sub: 'Name, email, phone' },
    { Icon: CreditCard, label: 'Payment Methods', sub: 'Manage payment options' },
    { Icon: MapPin, label: 'Saved Addresses', sub: 'Home, office, favourites' },
    { Icon: Bell, label: 'Notifications', sub: 'Push & email preferences' },
    { Icon: Shield, label: 'Privacy & Security', sub: 'Password, data settings' },
    { Icon: HelpCircle, label: 'Help & Support', sub: 'FAQs, contact us' },
    { Icon: FileText, label: 'Terms & Conditions', sub: 'Legal information' },
  ];

  return (
    <div className="px-5 pt-14 pb-4">
      <h1 className="text-[28px] font-bold text-white mb-6">Profile</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center py-7">
        <div className="w-[88px] h-[88px] rounded-[28px] bg-gold flex items-center justify-center mb-4" style={{ boxShadow: '0 8px 32px rgba(200,169,81,0.2)' }}>
          <span className="text-[32px] font-extrabold text-bg">
            {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
          </span>
        </div>
        <p className="text-[22px] font-bold text-white">{user?.name || 'Guest'}</p>
        <p className="text-sm text-text-secondary mt-1">{user?.email}</p>
        {user?.loyaltyTier && (
          <div className="flex items-center gap-1.5 mt-3 bg-gold/10 px-4 py-1.5 rounded-xl">
            <Diamond size={12} className="text-gold" />
            <span className="text-xs font-semibold text-gold">{user.loyaltyTier} Member</span>
          </div>
        )}
      </div>

      {/* Menu */}
      <div className="glass-card overflow-hidden mb-5">
        {menuItems.map((item, i) => (
          <button key={i} className="w-full flex items-center gap-3.5 px-5 py-[18px] border-b border-card-border last:border-b-0 hover:bg-white/[0.02] transition-colors text-left">
            <div className="w-10 h-10 rounded-xl bg-gold/[0.08] flex items-center justify-center">
              <item.Icon size={18} className="text-gold" />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-medium text-white">{item.label}</p>
              <p className="text-xs text-text-muted mt-0.5">{item.sub}</p>
            </div>
            <ChevronRight size={16} className="text-text-muted" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button onClick={() => { if (confirm('Are you sure you want to sign out?')) logout(); }} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-500/[0.08] border border-red-500/15 hover:bg-red-500/15 transition-colors">
        <LogOut size={18} className="text-red-400" />
        <span className="text-base font-semibold text-red-400">Sign Out</span>
      </button>

      <p className="text-center text-text-muted text-[11px] mt-6">Best Class v1.0.0 — Prototype</p>
    </div>
  );
}
