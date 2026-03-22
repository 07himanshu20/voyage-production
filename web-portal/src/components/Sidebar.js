'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, CalendarCheck, MapPin, Users, Car, BarChart3,
  PlusCircle, CreditCard, Settings, LogOut, Crown, MessageSquare
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/bookings', icon: CalendarCheck, label: 'Bookings' },
  { href: '/dashboard/new-booking', icon: PlusCircle, label: 'New Booking' },
  { href: '/dashboard/tracking', icon: MapPin, label: 'Live Tracking' },
  { href: '/dashboard/drivers', icon: Car, label: 'Chauffeurs' },
  { href: '/dashboard/customers', icon: Users, label: 'Clients' },
  { href: '/dashboard/messages', icon: MessageSquare, label: 'Customer Messages' },
  { href: '/dashboard/payments', icon: CreditCard, label: 'Payments' },
  { href: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('bestclass_admin_token');
    localStorage.removeItem('bestclass_admin_user');
    router.push('/login');
  };

  return (
    <aside className="w-72 h-screen bg-navy-600/50 backdrop-blur-xl border-r border-white/5 flex flex-col fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
            <Crown className="w-5 h-5 text-navy-900" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold gold-text">Best Class</h1>
            <p className="text-[10px] text-white/30 tracking-[0.2em] uppercase">Chauffeurs</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-gold-400' : 'text-white/30 group-hover:text-white/60'}`} />
                <span className="text-sm font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-gold-400"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
