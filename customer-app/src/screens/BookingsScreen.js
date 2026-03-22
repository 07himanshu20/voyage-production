import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function BookingsScreen({ navigation }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getBookings(user.id);
      setBookings(data.bookings || []);
    } catch (e) { console.error(e); }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const upcoming = bookings.filter(b => ['pending', 'assigned', 'confirmed', 'in_progress'].includes(b.status));
  const past = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));
  const displayed = tab === 'upcoming' ? upcoming : past;

  const statusConfig = {
    pending: { color: colors.amber, label: 'Pending', icon: 'time' },
    assigned: { color: colors.blue, label: 'Assigned', icon: 'person' },
    confirmed: { color: colors.green, label: 'Confirmed', icon: 'checkmark-circle' },
    in_progress: { color: colors.purple, label: 'In Progress', icon: 'car' },
    completed: { color: colors.green, label: 'Completed', icon: 'flag' },
    cancelled: { color: colors.red, label: 'Cancelled', icon: 'close-circle' },
  };

  const handleCancel = (id) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        try { await api.cancelBooking(id); load(); } catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const handleRate = (booking) => {
    Alert.alert('Rate your experience', 'How was your trip?', [
      { text: '5 Stars', onPress: () => api.rateBooking(booking.id, 5, 'Excellent service!').then(load) },
      { text: '4 Stars', onPress: () => api.rateBooking(booking.id, 4, 'Great experience.').then(load) },
      { text: '3 Stars', onPress: () => api.rateBooking(booking.id, 3, 'Good.').then(load) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {['upcoming', 'past'].map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'upcoming' ? 'Upcoming' : 'Past'}</Text>
            {t === 'upcoming' && upcoming.length > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{upcoming.length}</Text></View>}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
        {displayed.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No {tab} bookings</Text>
          </View>
        ) : (
          displayed.map(b => {
            const sc = statusConfig[b.status] || statusConfig.pending;
            return (
              <TouchableOpacity
                key={b.id}
                style={styles.bookingCard}
                onPress={() => b.status === 'in_progress' ? navigation.navigate('TripTrack', { booking: b }) : null}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardId}>{b.id}</Text>
                  <View style={[styles.cardBadge, { backgroundColor: `${sc.color}15` }]}>
                    <Ionicons name={sc.icon} size={12} color={sc.color} />
                    <Text style={[styles.cardBadgeText, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                </View>

                <Text style={styles.cardVehicle}>{b.vehicleName}</Text>
                {b.driverName && <Text style={styles.cardDriver}>Chauffeur: {b.driverName}</Text>}

                <View style={styles.cardRoute}>
                  <View style={styles.routeItem}><Ionicons name="ellipse" size={6} color={colors.green} /><Text style={styles.routeText} numberOfLines={1}>{b.pickup.address.split(',')[0]}</Text></View>
                  <View style={styles.routeItem}><Ionicons name="location" size={6} color={colors.red} /><Text style={styles.routeText} numberOfLines={1}>{b.dropoff.address.split(',')[0]}</Text></View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.cardDate}>{b.date} at {b.time}</Text>
                  <Text style={styles.cardFare}>£{b.fare.total.toFixed(2)}</Text>
                </View>

                {/* Actions */}
                {b.status === 'in_progress' && (
                  <TouchableOpacity style={styles.trackBtn} onPress={() => navigation.navigate('TripTrack', { booking: b })}>
                    <Ionicons name="navigate" size={14} color={colors.gold} />
                    <Text style={styles.trackBtnText}>Track Live</Text>
                  </TouchableOpacity>
                )}
                {['pending', 'assigned', 'confirmed'].includes(b.status) && (
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(b.id)}>
                    <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                  </TouchableOpacity>
                )}
                {b.status === 'completed' && !b.rating && (
                  <TouchableOpacity style={styles.rateBtn} onPress={() => handleRate(b)}>
                    <Ionicons name="star-outline" size={14} color={colors.gold} />
                    <Text style={styles.rateBtnText}>Rate this trip</Text>
                  </TouchableOpacity>
                )}
                {b.rating && (
                  <View style={styles.ratingDisplay}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Ionicons key={s} name={s <= b.rating ? 'star' : 'star-outline'} size={16} color={colors.gold} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: colors.white },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginVertical: 16 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabActive: { backgroundColor: 'rgba(200,169,81,0.12)', borderWidth: 1, borderColor: 'rgba(200,169,81,0.3)' },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.gold },
  tabBadge: { backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: colors.bg },
  emptyCard: { marginHorizontal: 20, marginTop: 40, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, padding: 48, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 16, color: colors.textMuted },
  bookingCard: { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, padding: 20, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardId: { fontSize: 11, fontFamily: 'monospace', color: colors.gold },
  cardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  cardBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  cardVehicle: { fontSize: 16, fontWeight: '600', color: colors.white },
  cardDriver: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  cardRoute: { marginTop: 12, gap: 6 },
  routeItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  cardDate: { fontSize: 13, color: colors.textMuted },
  cardFare: { fontSize: 16, fontWeight: '700', color: colors.gold },
  trackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(200,169,81,0.1)', borderWidth: 1, borderColor: 'rgba(200,169,81,0.2)' },
  trackBtnText: { fontSize: 13, fontWeight: '600', color: colors.gold },
  cancelBtn: { alignItems: 'center', marginTop: 10 },
  cancelBtnText: { fontSize: 13, color: colors.red, fontWeight: '500' },
  rateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(200,169,81,0.08)' },
  rateBtnText: { fontSize: 13, fontWeight: '600', color: colors.gold },
  ratingDisplay: { flexDirection: 'row', gap: 2, marginTop: 10, justifyContent: 'center' },
});
