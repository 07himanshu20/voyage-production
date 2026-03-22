import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { SOCKET_URL } from './config';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import TripDetailScreen from './screens/TripDetailScreen';
import EarningsScreen from './screens/EarningsScreen';
import ProfileScreen from './screens/ProfileScreen';
import BottomNav from './components/BottomNav';
import ChatPopup from './components/ChatPopup';
import { api } from './api';

// Auth Context
const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('driver_token');
    const u = localStorage.getItem('driver_user');
    if (t && u) { setUser(JSON.parse(u)); }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('driver_token', token);
    localStorage.setItem('driver_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatBooking, setChatBooking] = useState(null);
  const [driver, setDriver] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notification, setNotification] = useState(null);

  // Load driver data and listen for chat messages
  useEffect(() => {
    if (!user) return;
    api.getDriver(user.id).then(d => setDriver(d.driver)).catch(() => {});

    const socket = io(SOCKET_URL);
    socket.on('connect', () => socket.emit('driver_connect', user.id));

    const seenMsgIds = new Set();
    socket.on('chat_message', (msg) => {
      if (msg.from === 'customer') {
        // Deduplicate — may receive from both driver room and chat room
        if (seenMsgIds.has(msg.id)) return;
        seenMsgIds.add(msg.id);

        // Update chatBooking to the booking this message belongs to
        setChatBooking(prev => {
          if (prev && prev.id === msg.bookingId) return prev;
          // Switch to the new booking - fetch it
          api.getBooking(msg.bookingId).then(data => {
            if (data.booking) setChatBooking(data.booking);
          }).catch(() => {});
          setUnreadCount(c => c + 1);
          return prev;
        });
        // Show notification toast
        setNotification({ from: msg.fromName, message: msg.message, bookingId: msg.bookingId });
        setTimeout(() => setNotification(null), 4000);
      }
    });

    return () => socket.disconnect();
  }, [user]);

  // Load active booking for chat
  useEffect(() => {
    if (!user) return;
    api.getBookings(user.id).then(data => {
      const active = (data.bookings || []).find(b => ['assigned', 'confirmed', 'in_progress'].includes(b.status));
      if (active) setChatBooking(active);
    }).catch(() => {});
  }, [user]);

  if (loading) return (
    <div className="mobile-frame flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <LoginScreen />;

  return (
    <div className="mobile-frame pb-20">
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/trip/:id" element={<TripDetailScreen />} />
        <Route path="/earnings" element={<EarningsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <BottomNav />

      {/* Chat notification toast */}
      <AnimatePresence>
        {notification && (
          <div
            onClick={() => {
              // Switch to the booking that the message is about
              if (notification.bookingId) {
                api.getBooking(notification.bookingId).then(data => {
                  if (data.booking) setChatBooking(data.booking);
                }).catch(() => {});
              }
              setChatOpen(true); setUnreadCount(0); setNotification(null);
            }}
            className="fixed top-4 right-4 left-4 max-w-[400px] mx-auto z-50 cursor-pointer"
          >
            <div className="bg-green-500/15 border border-green-500/30 rounded-2xl p-4 backdrop-blur-lg shadow-xl"
              style={{ background: 'rgba(15,26,46,0.95)' }}>
              <p className="text-xs font-bold text-green-400 mb-1">New message from {notification.from}</p>
              <p className="text-sm text-white truncate">{notification.message}</p>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating chat button */}
      {chatBooking && !chatOpen && (
        <button
          onClick={() => { setChatOpen(true); setUnreadCount(0); }}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center z-40 hover:bg-green-500/25 transition-all shadow-lg"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
          </svg>
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{unreadCount}</span>
            </div>
          )}
        </button>
      )}

      {/* Chat popup */}
      <AnimatePresence>
        {chatOpen && chatBooking && driver && (
          <ChatPopup
            booking={chatBooking}
            driver={driver}
            onClose={() => setChatOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
