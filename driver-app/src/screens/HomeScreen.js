import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = useCallback(async () => {
    try {
      const data = await api.getBookings(user.id);
      setBookings(data.bookings || []);
    } catch (e) { console.error(e); }
  }, [user]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const toggleOnline = async (val) => {
    setIsOnline(val);
    try {
      await api.updateStatus(user.id, val ? 'available' : 'offline');
    } catch (e) { console.error(e); }
  };

  const assigned = bookings.filter(b => b.status === 'assigned');
  const active = bookings.filter(b => b.status === 'in_progress' || b.status === 'confirmed');
  const today = bookings.filter(b => b.date === new Date().toISOString().split('T')[0]);

  const statusIcon = { pending: 'time-outline', assigned: 'notifications-outline', confirmed: 'checkmark-circle-outline', in_progress: 'car-outline', completed: 'flag-outline' };
  const statusColor = { pending: colors.amber, assigned: colors.blue, confirmed: colors.green, in_progress: colors.purple, completed: colors.green };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
          <View style={styles.onlineToggle}>
            <Text style={[styles.onlineText, { color: isOnline ? colors.green : colors.red }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={toggleOnline}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(16,185,129,0.3)' }}
              thumbColor={isOnline ? colors.green : '#666'}
            />
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="car-outline" size={20} color={colors.gold} />
            <Text style={styles.statValue}>{today.length}</Text>
            <Text style={styles.statLabel}>Today's Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="notifications-outline" size={20} color={colors.amber} />
            <Text style={styles.statValue}>{assigned.length}</Text>
            <Text style={styles.statLabel}>New Requests</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="navigate-outline" size={20} color={colors.purple} />
            <Text style={styles.statValue}>{active.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        {/* New Trip Assignments */}
        {assigned.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New Trip Assignments</Text>
            {assigned.map(booking => (
              <TouchableOpacity
                key={booking.id}
                style={styles.assignmentCard}
                onPress={() => navigation.navigate('TripDetail', { booking })}
              >
                <View style={styles.assignmentBadge}>
                  <Ionicons name="notifications" size={16} color={colors.bg} />
                </View>
                <View style={styles.assignmentContent}>
                  <Text style={styles.assignmentId}>{booking.id}</Text>
                  <Text style={styles.assignmentClient}>{booking.customerName}</Text>
                  <Text style={styles.assignmentRoute} numberOfLines={1}>
                    {booking.pickup.address.split(',')[0]} → {booking.dropoff.address.split(',')[0]}
                  </Text>
                  <Text style={styles.assignmentTime}>{booking.date} at {booking.time}</Text>
                </View>
                <View style={styles.assignmentFare}>
                  <Text style={styles.fareAmount}>£{booking.fare.total.toFixed(0)}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Today's Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          {today.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No trips scheduled for today</Text>
            </View>
          ) : (
            today.map(booking => (
              <TouchableOpacity
                key={booking.id}
                style={styles.tripCard}
                onPress={() => navigation.navigate('TripDetail', { booking })}
              >
                <View style={styles.tripTime}>
                  <Text style={styles.tripTimeText}>{booking.time}</Text>
                  <View style={[styles.statusDot, { backgroundColor: statusColor[booking.status] }]} />
                </View>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripClient}>{booking.customerName}</Text>
                  <View style={styles.tripRoute}>
                    <Ionicons name="ellipse" size={6} color={colors.green} />
                    <Text style={styles.tripAddress} numberOfLines={1}>{booking.pickup.address.split(',')[0]}</Text>
                  </View>
                  <View style={styles.tripRoute}>
                    <Ionicons name="location" size={6} color={colors.red} />
                    <Text style={styles.tripAddress} numberOfLines={1}>{booking.dropoff.address.split(',')[0]}</Text>
                  </View>
                </View>
                <Text style={[styles.tripStatus, { color: statusColor[booking.status] }]}>
                  {booking.status.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  greeting: { fontSize: 14, color: colors.textSecondary },
  name: { fontSize: 24, fontWeight: '700', color: colors.white, marginTop: 4 },
  onlineToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineText: { fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, alignItems: 'center', gap: 8 },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.white },
  statLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.white, marginBottom: 12 },
  assignmentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(200,169,81,0.08)', borderWidth: 1, borderColor: 'rgba(200,169,81,0.2)', borderRadius: 16, padding: 16, marginBottom: 10, gap: 12 },
  assignmentBadge: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.gold, justifyContent: 'center', alignItems: 'center' },
  assignmentContent: { flex: 1 },
  assignmentId: { fontSize: 11, fontFamily: 'monospace', color: colors.gold, marginBottom: 2 },
  assignmentClient: { fontSize: 15, fontWeight: '600', color: colors.white },
  assignmentRoute: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  assignmentTime: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  assignmentFare: { alignItems: 'center', gap: 4 },
  fareAmount: { fontSize: 18, fontWeight: '700', color: colors.gold },
  tripCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, padding: 16, marginBottom: 10, gap: 12 },
  tripTime: { alignItems: 'center', gap: 6 },
  tripTimeText: { fontSize: 14, fontWeight: '700', color: colors.white },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  tripInfo: { flex: 1, gap: 4 },
  tripClient: { fontSize: 14, fontWeight: '600', color: colors.white },
  tripRoute: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripAddress: { fontSize: 12, color: colors.textSecondary },
  tripStatus: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
