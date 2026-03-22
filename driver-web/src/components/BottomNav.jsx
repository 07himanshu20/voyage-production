import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Wallet, User } from 'lucide-react';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/earnings', icon: Wallet, label: 'Earnings' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on trip detail page
  if (location.pathname.startsWith('/trip/')) return null;

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50">
      <div className="flex items-center justify-around py-3 px-4 border-t"
        style={{ background: '#141F35', borderColor: 'rgba(255,255,255,0.05)' }}>
        {tabs.map(tab => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-1 py-1 px-6 rounded-xl transition-all"
              style={{ background: active ? 'rgba(200,169,81,0.08)' : 'transparent' }}
            >
              <tab.icon size={20} strokeWidth={active ? 2.5 : 1.5}
                style={{ color: active ? '#C8A951' : 'rgba(255,255,255,0.25)' }} />
              <span className="text-[10px] font-semibold"
                style={{ color: active ? '#C8A951' : 'rgba(255,255,255,0.25)' }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
