import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TRIP_STAGES = [
  { key: 'en_route', label: 'En Route to Pickup', icon: 'navigate', btnText: 'Start Trip – En Route', color: colors.blue },
  { key: 'arrived_pickup', label: 'Arrived at Pickup', icon: 'flag', btnText: 'Arrived at Pickup', color: colors.amber },
  { key: 'passenger_onboard', label: 'Passenger Onboard', icon: 'people', btnText: 'Passenger Onboarded', color: colors.purple },
  { key: 'completed', label: 'Trip Completed', icon: 'checkmark-circle', btnText: 'Complete Trip', color: colors.green },
];

export default function TripDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const [booking, setBooking] = useState(route.params.booking);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const data = await api.respondBooking(booking.id, 'accept');
      setBooking(data.booking);
      Alert.alert('Accepted', 'Trip has been accepted. You will be notified before pickup time.');
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const handleReject = async () => {
    Alert.alert('Reject Trip', 'Are you sure you want to decline this trip?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive', onPress: async () => {
          setLoading(true);
          try {
            await api.respondBooking(booking.id, 'reject');
            navigation.goBack();
          } catch (e) { Alert.alert('Error', e.message); }
          finally { setLoading(false); }
        },
      },
    ]);
  };

  const handleTripUpdate = async (tripStatus) => {
    setLoading(true);
    try {
      const data = await api.updateTripStatus(booking.id, tripStatus);
      setBooking(data.booking);
      if (tripStatus === 'completed') {
        Alert.alert('Trip Completed', 'Well done! Trip has been marked as completed.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const openNavigation = (lat, lng, label) => {
    // Open in Waze (preferred by drivers)
    const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    Alert.alert('Navigate', 'Choose your preferred navigation app', [
      { text: 'Waze', onPress: () => Linking.openURL(wazeUrl) },
      { text: 'Google Maps', onPress: () => Linking.openURL(googleUrl) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const currentStageIndex = TRIP_STAGES.findIndex(s => s.key === booking.tripStatus);
  const nextStage = booking.status === 'confirmed'
    ? TRIP_STAGES[0]
    : TRIP_STAGES[currentStageIndex + 1] || null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Booking Info */}
        <View style={styles.bookingCard}>
          <View style={styles.bookingHeader}>
            <Text style={styles.bookingId}>{booking.id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${colors.gold}15` }]}>
              <Text style={[styles.statusText, { color: colors.gold }]}>{booking.status.replace('_', ' ')}</Text>
            </View>
          </View>
          <Text style={styles.clientName}>{booking.customerName}</Text>
          <Text style={styles.vehicleText}>{booking.vehicleName}</Text>

          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Trip Fare</Text>
            <Text style={styles.fareValue}>£{booking.fare.total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Route */}
        <View style={styles.routeCard}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: colors.green }]} />
            <View style={styles.routeLineContainer}>
              <View style={styles.routeLine} />
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>PICKUP</Text>
              <Text style={styles.routeAddress}>{booking.pickup.address}</Text>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => openNavigation(booking.pickup.lat, booking.pickup.lng, 'Pickup')}
              >
                <Ionicons name="navigate" size={14} color={colors.gold} />
                <Text style={styles.navBtnText}>Navigate</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: colors.red }]} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>DROP-OFF</Text>
              <Text style={styles.routeAddress}>{booking.dropoff.address}</Text>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => openNavigation(booking.dropoff.lat, booking.dropoff.lng, 'Dropoff')}
              >
                <Ionicons name="navigate" size={14} color={colors.gold} />
                <Text style={styles.navBtnText}>Navigate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.infoText}>{booking.date}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.infoText}>{booking.time}</Text>
          </View>
          {booking.notes ? (
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.infoText}>{booking.notes}</Text>
            </View>
          ) : null}
          {booking.extras?.length > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="gift-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.infoText}>{booking.extras.join(', ')}</Text>
            </View>
          )}
        </View>

        {/* Trip Progress */}
        {(booking.status === 'confirmed' || booking.status === 'in_progress') && (
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>Trip Progress</Text>
            {TRIP_STAGES.map((stage, i) => {
              const isCompleted = i <= currentStageIndex;
              const isCurrent = i === currentStageIndex;
              return (
                <View key={stage.key} style={styles.progressRow}>
                  <View style={[styles.progressDot, isCompleted && { backgroundColor: stage.color }, isCurrent && styles.progressDotCurrent]} >
                    <Ionicons name={isCompleted ? 'checkmark' : stage.icon} size={14} color={isCompleted ? colors.white : colors.textMuted} />
                  </View>
                  {i < TRIP_STAGES.length - 1 && <View style={[styles.progressLine, isCompleted && { backgroundColor: stage.color }]} />}
                  <Text style={[styles.progressLabel, isCompleted && { color: colors.white }]}>{stage.label}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Extras info */}
        {booking.extras?.length > 0 && (
          <View style={styles.extrasCard}>
            <Text style={styles.extrasTitle}>Client Extras</Text>
            {booking.extras.map((ext, i) => (
              <View key={i} style={styles.extraRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.green} />
                <Text style={styles.extraText}>{ext}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        {booking.status === 'assigned' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.rejectBtn} onPress={handleReject} disabled={loading}>
              <Ionicons name="close" size={20} color={colors.red} />
              <Text style={styles.rejectBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} disabled={loading}>
              <Ionicons name="checkmark" size={20} color={colors.bg} />
              <Text style={styles.acceptBtnText}>{loading ? 'Processing...' : 'Accept Trip'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {nextStage && (booking.status === 'confirmed' || booking.status === 'in_progress') && (
          <TouchableOpacity
            style={[styles.tripActionBtn, { backgroundColor: nextStage.color }]}
            onPress={() => handleTripUpdate(nextStage.key)}
            disabled={loading}
          >
            <Ionicons name={nextStage.icon} size={20} color={colors.white} />
            <Text style={styles.tripActionText}>{loading ? 'Updating...' : nextStage.btnText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.white },
  bookingCard: { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, padding: 20, marginBottom: 12 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bookingId: { fontSize: 12, fontFamily: 'monospace', color: colors.gold },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  clientName: { fontSize: 20, fontWeight: '700', color: colors.white, marginBottom: 4 },
  vehicleText: { fontSize: 13, color: colors.textSecondary },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  fareLabel: { fontSize: 14, color: colors.textSecondary },
  fareValue: { fontSize: 24, fontWeight: '700', color: colors.gold },
  routeCard: { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, padding: 20, marginBottom: 12 },
  routePoint: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  routeDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  routeLineContainer: { position: 'absolute', left: 5, top: 18, bottom: -8, width: 2 },
  routeLine: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  routeInfo: { flex: 1 },
  routeLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  routeAddress: { fontSize: 14, color: colors.white, lineHeight: 20 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: 'rgba(200,169,81,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  navBtnText: { fontSize: 12, color: colors.gold, fontWeight: '600' },
  infoCard: { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, padding: 20, marginBottom: 12, gap: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  progressCard: { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, padding: 20, marginBottom: 12 },
  progressTitle: { fontSize: 16, fontWeight: '600', color: colors.white, marginBottom: 16 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  progressDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  progressDotCurrent: { borderWidth: 2, borderColor: colors.gold },
  progressLine: { position: 'absolute', left: 15, top: 34, width: 2, height: 16, backgroundColor: 'rgba(255,255,255,0.05)' },
  progressLabel: { fontSize: 14, color: colors.textMuted },
  extrasCard: { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, padding: 20, marginBottom: 12 },
  extrasTitle: { fontSize: 16, fontWeight: '600', color: colors.white, marginBottom: 12 },
  extraRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  extraText: { fontSize: 14, color: colors.textSecondary },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 16, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  actionRow: { flexDirection: 'row', gap: 12 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  rejectBtnText: { fontSize: 16, fontWeight: '600', color: colors.red },
  acceptBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, backgroundColor: colors.gold },
  acceptBtnText: { fontSize: 16, fontWeight: '700', color: colors.bg },
  tripActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 14 },
  tripActionText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
