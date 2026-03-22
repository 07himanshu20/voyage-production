import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getBookings(user.id);
      setBookings(data.bookings || []);
    } catch (e) { console.error(e); }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const active = bookings.filter(b => ['assigned', 'confirmed', 'in_progress'].includes(b.status));
  const upcoming = bookings.filter(b => b.status === 'confirmed' || b.status === 'assigned');
  const completed = bookings.filter(b => b.status === 'completed');

  const statusColor = { pending: colors.amber, assigned: colors.blue, confirmed: colors.green, in_progress: colors.purple, completed: colors.green };
  const tripStatusLabel = { en_route: 'Chauffeur en route', arrived_pickup: 'Arrived at pickup', passenger_onboard: 'On the way', completed: 'Arrived' };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.name || 'Guest'}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.white} />
            {active.length > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>

        {/* Book Now CTA */}
        <TouchableOpacity style={styles.bookCta} onPress={() => navigation.navigate('BookRide')} activeOpacity={0.9}>
          <View style={styles.bookCtaContent}>
            <Text style={styles.bookCtaTitle}>Book a Chauffeur</Text>
            <Text style={styles.bookCtaDesc}>Premium vehicles at your service</Text>
          </View>
          <View style={styles.bookCtaIcon}>
            <Ionicons name="arrow-forward" size={24} color={colors.bg} />
          </View>
        </TouchableOpacity>

        {/* Active Trip */}
        {active.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Trip</Text>
            {active.map(b => (
              <TouchableOpacity key={b.id} style={styles.activeCard} onPress={() => navigation.navigate('TripTrack', { booking: b })}>
                <View style={styles.activeHeader}>
                  <Text style={styles.activeId}>{b.id}</Text>
                  <View style={[styles.liveIndicator]}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                </View>
                {b.driverName && <Text style={styles.activeDriver}>Chauffeur: {b.driverName}</Text>}
                <Text style={styles.activeVehicle}>{b.vehicleName}</Text>
                {b.tripStatus && <Text style={styles.activeTripStatus}>{tripStatusLabel[b.tripStatus] || b.tripStatus}</Text>}
                <View style={styles.activeRoute}>
                  <View style={styles.routeRow}>
                    <Ionicons name="ellipse" size={6} color={colors.green} />
                    <Text style={styles.routeText} numberOfLines={1}>{b.pickup.address.split(',')[0]}</Text>
                  </View>
                  <View style={styles.routeRow}>
                    <Ionicons name="location" size={6} color={colors.red} />
                    <Text style={styles.routeText} numberOfLines={1}>{b.dropoff.address.split(',')[0]}</Text>
                  </View>
                </View>
                <View style={styles.trackBtnRow}>
                  <TouchableOpacity style={styles.trackBtn} onPress={() => navigation.navigate('TripTrack', { booking: b })}>
                    <Ionicons name="navigate" size={14} color={colors.gold} />
                    <Text style={styles.trackBtnText}>Track Chauffeur</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
            {upcoming.map(b => (
              <View key={b.id} style={styles.upcomingCard}>
                <View style={styles.upcomingHeader}>
                  <Text style={styles.upcomingId}>{b.id}</Text>
                  <Text style={[styles.upcomingStatus, { color: statusColor[b.status] }]}>{b.status}</Text>
                </View>
                <Text style={styles.upcomingVehicle}>{b.vehicleName}</Text>
                <Text style={styles.upcomingDate}>{b.date} at {b.time}</Text>
                <Text style={styles.upcomingRoute} numberOfLines={1}>{b.pickup.address.split(',')[0]} → {b.dropoff.address.split(',')[0]}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Trips</Text>
          {completed.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="car-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No trips yet</Text>
              <Text style={styles.emptyDesc}>Book your first premium chauffeur experience</Text>
            </View>
          ) : (
            completed.slice(0, 5).map(b => (
              <View key={b.id} style={styles.historyCard}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyDate}>{b.date}</Text>
                  <Text style={styles.historyRoute} numberOfLines={1}>{b.pickup.address.split(',')[0]} → {b.dropoff.address.split(',')[0]}</Text>
                  <Text style={styles.historyVehicle}>{b.vehicleName}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyFare}>£{b.fare.total.toFixed(2)}</Text>
                  {b.rating && (
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={12} color={colors.gold} />
                      <Text style={styles.ratingText}>{b.rating}</Text>
                    </View>
                  )}
                </View>
              </View>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  greeting: { fontSize: 14, color: colors.textSecondary },
  name: { fontSize: 24, fontWeight: '700', color: colors.white, marginTop: 4 },
  bellBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, justifyContent: 'center', alignItems: 'center' },
  bellDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
  bookCta: { marginHorizontal: 20, borderRadius: 20, padding: 24, flexDirection: 'row', alignItems: 'center', marginBottom: 24, backgroundColor: colors.gold },
  bookCtaContent: { flex: 1 },
  bookCtaTitle: { fontSize: 20, fontWeight: '700', color: colors.bg },
  bookCtaDesc: { fontSize: 13, color: 'rgba(10,22,40,0.6)', marginTop: 4 },
  bookCtaIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(10,22,40,0.15)', justifyContent: 'center', alignItems: 'center' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.white, marginBottom: 12 },
  activeCard: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)', padding: 20 },
  activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  activeId: { fontSize: 11, fontFamily: 'monospace', color: colors.gold },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.red },
  liveText: { fontSize: 9, fontWeight: '800', color: colors.red, letterSpacing: 1 },
  activeDriver: { fontSize: 16, fontWeight: '600', color: colors.white },
  activeVehicle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  activeTripStatus: { fontSize: 13, color: colors.purple, fontWeight: '600', marginTop: 8 },
  activeRoute: { marginTop: 12, gap: 6 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeText: { fontSize: 13, color: colors.textSecondary },
  trackBtnRow: { marginTop: 16 },
  trackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(200,169,81,0.1)', borderWidth: 1, borderColor: 'rgba(200,169,81,0.2)' },
  trackBtnText: { fontSize: 14, fontWeight: '600', color: colors.gold },
  upcomingCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, marginBottom: 8 },
  upcomingHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  upcomingId: { fontSize: 11, fontFamily: 'monospace', color: colors.gold },
  upcomingStatus: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  upcomingVehicle: { fontSize: 14, fontWeight: '600', color: colors.white },
  upcomingDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  upcomingRoute: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  emptyCard: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, padding: 48, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.white },
  emptyDesc: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  historyCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, marginBottom: 8 },
  historyLeft: { flex: 1 },
  historyDate: { fontSize: 12, color: colors.textMuted },
  historyRoute: { fontSize: 14, color: colors.white, fontWeight: '500', marginTop: 4 },
  historyVehicle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  historyRight: { alignItems: 'flex-end', justifyContent: 'center' },
  historyFare: { fontSize: 16, fontWeight: '700', color: colors.gold },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontSize: 12, color: colors.gold },
});
