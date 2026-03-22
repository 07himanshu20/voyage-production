'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Circle } from 'lucide-react';
import { io } from 'socket.io-client';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('@/components/TrackingMap'), { ssr: false });

export default function TrackingPage() {
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const socketRef = useRef(null);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      try {
        const [dData, bData] = await Promise.all([api.getDrivers(), api.getBookings()]);
        setDrivers(dData.drivers || []);
        setBookings(bData.bookings || []);
      } catch (e) { console.error(e); }
    };
    loadData();
  }, []);

  // Socket.IO for real-time updates — NO polling needed
  useEffect(() => {
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('admin_connect');
    });

    // When any booking is updated (trip status change, accept, etc.)
    socket.on('booking_updated', (updatedBooking) => {
      setBookings(prev => {
        const idx = prev.findIndex(b => b.id === updatedBooking.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updatedBooking;
          return next;
        }
        return [updatedBooking, ...prev];
      });
    });

    // When a new booking is created
    socket.on('new_booking', (newBooking) => {
      setBookings(prev => [newBooking, ...prev]);
    });

    // Real-time driver location updates
    socket.on('driver_location_update', ({ driverId, location, name }) => {
      setDrivers(prev => prev.map(d =>
        d.id === driverId ? { ...d, location } : d
      ));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const activeTrips = bookings.filter(b => b.status === 'in_progress');
  // Show recently completed trips (within last 30 min) so the completion point stays visible
  const recentlyCompleted = bookings.filter(b => {
    if (b.status !== 'completed') return false;
    const lastEvent = b.tripEvents?.find(e => e.status === 'completed');
    if (!lastEvent) return false;
    return (Date.now() - new Date(lastEvent.timestamp).getTime()) < 30 * 60 * 1000;
  });

  const statusLabel = {
    available: 'Available',
    on_trip: 'On Trip',
    assigned: 'Assigned',
    offline: 'Offline',
  };

  const statusDot = {
    available: 'bg-emerald-400',
    on_trip: 'bg-purple-400',
    assigned: 'bg-blue-400',
    offline: 'bg-white/20',
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-display font-bold text-white">Live Tracking</h1>
        <p className="text-white/40 mt-1">Real-time location of all chauffeurs and active trips</p>
      </motion.div>

      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-2 glass-card overflow-hidden"
        >
          <MapComponent drivers={drivers} selectedDriver={selectedDriver} activeTrips={activeTrips} recentlyCompleted={recentlyCompleted} />
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden flex flex-col"
        >
          <div className="p-5 border-b border-white/5">
            <h3 className="font-semibold text-white">Chauffeurs ({drivers.length})</h3>
            <div className="flex gap-3 mt-3 text-xs">
              <span className="flex items-center gap-1.5"><Circle className="w-2 h-2 fill-emerald-400 text-emerald-400" /> {drivers.filter(d => d.status === 'available').length} Available</span>
              <span className="flex items-center gap-1.5"><Circle className="w-2 h-2 fill-purple-400 text-purple-400" /> {drivers.filter(d => d.status === 'on_trip').length} On Trip</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {drivers.map(driver => (
              <button
                key={driver.id}
                onClick={() => setSelectedDriver(driver.id === selectedDriver ? null : driver.id)}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  selectedDriver === driver.id
                    ? 'bg-gold-500/10 border border-gold-500/30'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-gold-400">
                    {driver.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{driver.name}</p>
                    <p className="text-xs text-white/40">{driver.vehicle.make} {driver.vehicle.model}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={`w-2 h-2 rounded-full ${statusDot[driver.status]}`} />
                      <span className="text-xs text-white/50">{statusLabel[driver.status]}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-white/20">{driver.id}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Active Trips */}
          {activeTrips.length > 0 && (
            <div className="border-t border-white/5 p-4">
              <h4 className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-3">Active Trips</h4>
              {activeTrips.map(trip => (
                <div key={trip.id} className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 mb-2">
                  <p className="text-xs font-mono text-purple-400">{trip.id}</p>
                  <p className="text-sm text-white/80 mt-1">{trip.driverName}</p>
                  <p className="text-xs text-white/30 mt-1 truncate">{trip.pickup.address} → {trip.dropoff.address}</p>
                  <span className="text-xs text-purple-300 mt-1 inline-block">{trip.tripStatus?.replace('_', ' ')}</span>
                  {trip.tripEvents?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                      {trip.tripEvents.map((evt, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px]">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                            background: evt.status === 'en_route' ? '#3B82F6' : evt.status === 'arrived_pickup' ? '#F59E0B' : evt.status === 'passenger_onboard' ? '#A855F7' : '#10B981'
                          }} />
                          <span className="text-white/50">{evt.status.replace(/_/g, ' ')}</span>
                          <span className="text-white/30 ml-auto">{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Recently Completed */}
          {recentlyCompleted.length > 0 && (
            <div className="border-t border-white/5 p-4">
              <h4 className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-3">Recently Completed</h4>
              {recentlyCompleted.map(trip => {
                const completedEvent = trip.tripEvents?.find(e => e.status === 'completed');
                return (
                  <div key={trip.id} className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 mb-2">
                    <p className="text-xs font-mono text-emerald-400">{trip.id}</p>
                    <p className="text-sm text-white/80 mt-1">{trip.driverName}</p>
                    <p className="text-xs text-white/30 mt-1 truncate">{trip.pickup.address} → {trip.dropoff.address}</p>
                    <span className="text-xs text-emerald-300 mt-1 inline-block">
                      Completed at {completedEvent ? new Date(completedEvent.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
