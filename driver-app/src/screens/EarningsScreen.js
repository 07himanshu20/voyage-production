import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function EarningsScreen() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const d = await api.getEarnings(user.id);
      setData(d);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!data) return <View style={styles.container}><Text style={styles.loading}>Loading...</Text></View>;

  const completed = data.trips?.filter(t => t.status === 'completed') || [];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
        <View style={styles.header}>
          <Text style={styles.title}>Earnings</Text>
          <Text style={styles.subtitle}>Your performance overview</Text>
        </View>

        {/* Main Earnings Card */}
        <View style={styles.mainCard}>
          <Text style={styles.mainLabel}>Total Earnings</Text>
          <Text style={styles.mainValue}>£{data.totalEarnings.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</Text>
          <View style={styles.mainDivider} />
          <View style={styles.mainRow}>
            <View style={styles.mainStat}>
              <Text style={styles.mainStatValue}>£{data.todayEarnings.toFixed(2)}</Text>
              <Text style={styles.mainStatLabel}>Today</Text>
            </View>
            <View style={[styles.mainStat, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.05)' }]}>
              <Text style={styles.mainStatValue}>£{data.weekEarnings.toFixed(2)}</Text>
              <Text style={styles.mainStatLabel}>This Week</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Ionicons name="car-outline" size={24} color={colors.gold} />
            <Text style={styles.statValue}>{data.totalTrips}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="checkmark-circle-outline" size={24} color={colors.green} />
            <Text style={styles.statValue}>{data.completedTrips}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* Trip History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip History</Text>
          {completed.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No completed trips yet</Text>
            </View>
          ) : (
            completed.map(trip => (
              <View key={trip.id} style={styles.tripRow}>
                <View style={styles.tripDot}>
                  <Ionicons name="checkmark" size={14} color={colors.green} />
                </View>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripId}>{trip.id}</Text>
                  <Text style={styles.tripClient}>{trip.customerName}</Text>
                  <Text style={styles.tripDate}>{trip.date} at {trip.time}</Text>
                </View>
                <Text style={styles.tripFare}>£{trip.fare.total.toFixed(2)}</Text>
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
  loading: { color: colors.textMuted, textAlign: 'center', marginTop: 100 },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: colors.white },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  mainCard: { marginHorizontal: 20, borderRadius: 24, padding: 28, marginBottom: 16, backgroundColor: colors.gold, overflow: 'hidden' },
  mainLabel: { fontSize: 13, color: 'rgba(10,22,40,0.6)', fontWeight: '500' },
  mainValue: { fontSize: 38, fontWeight: '800', color: colors.bg, marginTop: 4 },
  mainDivider: { height: 1, backgroundColor: 'rgba(10,22,40,0.1)', marginVertical: 20 },
  mainRow: { flexDirection: 'row' },
  mainStat: { flex: 1, alignItems: 'center' },
  mainStatValue: { fontSize: 20, fontWeight: '700', color: colors.bg },
  mainStatLabel: { fontSize: 11, color: 'rgba(10,22,40,0.5)', marginTop: 2 },
  statsGrid: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, padding: 20, alignItems: 'center', gap: 8 },
  statValue: { fontSize: 28, fontWeight: '700', color: colors.white },
  statLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase' },
  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.white, marginBottom: 12 },
  emptyCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: colors.textMuted },
  tripRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, marginBottom: 8, gap: 12 },
  tripDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(16,185,129,0.1)', justifyContent: 'center', alignItems: 'center' },
  tripInfo: { flex: 1 },
  tripId: { fontSize: 10, fontFamily: 'monospace', color: colors.gold },
  tripClient: { fontSize: 14, fontWeight: '600', color: colors.white, marginTop: 2 },
  tripDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  tripFare: { fontSize: 16, fontWeight: '700', color: colors.green },
});
