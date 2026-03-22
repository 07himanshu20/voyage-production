import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [driver, setDriver] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', vehicleMake: '', vehicleModel: '', vehiclePlate: '', vehicleColor: '' });

  useEffect(() => {
    api.getDriver(user.id).then(d => {
      setDriver(d.driver);
      setForm({
        name: d.driver.name, phone: d.driver.phone,
        vehicleMake: d.driver.vehicle.make, vehicleModel: d.driver.vehicle.model,
        vehiclePlate: d.driver.vehicle.plate, vehicleColor: d.driver.vehicle.color,
      });
    }).catch(console.error);
  }, []);

  const handleSave = async () => {
    try {
      await api.updateProfile(user.id, {
        name: form.name, phone: form.phone,
        vehicle: { make: form.vehicleMake, model: form.vehicleModel, plate: form.vehiclePlate, color: form.vehicleColor },
      });
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  if (!driver) return <View style={styles.container}><Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 100 }}>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Avatar & Name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{driver.name.split(' ').map(n => n[0]).join('')}</Text>
          </View>
          <Text style={styles.driverName}>{driver.name}</Text>
          <Text style={styles.driverId}>{driver.id}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={colors.gold} />
            <Text style={styles.ratingText}>{driver.rating} rating</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.ratingText}>{driver.totalTrips} trips</Text>
          </View>
        </View>

        {/* Personal Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)}>
              <Text style={styles.editBtn}>{editing ? 'Save' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              {editing ? (
                <TextInput style={styles.fieldInput} value={form.name} onChangeText={t => setForm(f => ({ ...f, name: t }))} />
              ) : (
                <Text style={styles.fieldValue}>{driver.name}</Text>
              )}
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{driver.email}</Text>
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Phone</Text>
              {editing ? (
                <TextInput style={styles.fieldInput} value={form.phone} onChangeText={t => setForm(f => ({ ...f, phone: t }))} />
              ) : (
                <Text style={styles.fieldValue}>{driver.phone}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Vehicle Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Make</Text>
              {editing ? (
                <TextInput style={styles.fieldInput} value={form.vehicleMake} onChangeText={t => setForm(f => ({ ...f, vehicleMake: t }))} />
              ) : (
                <Text style={styles.fieldValue}>{driver.vehicle.make}</Text>
              )}
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Model</Text>
              {editing ? (
                <TextInput style={styles.fieldInput} value={form.vehicleModel} onChangeText={t => setForm(f => ({ ...f, vehicleModel: t }))} />
              ) : (
                <Text style={styles.fieldValue}>{driver.vehicle.model}</Text>
              )}
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Registration</Text>
              {editing ? (
                <TextInput style={styles.fieldInput} value={form.vehiclePlate} onChangeText={t => setForm(f => ({ ...f, vehiclePlate: t }))} />
              ) : (
                <Text style={styles.fieldValue}>{driver.vehicle.plate}</Text>
              )}
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Colour</Text>
              {editing ? (
                <TextInput style={styles.fieldInput} value={form.vehicleColor} onChangeText={t => setForm(f => ({ ...f, vehicleColor: t }))} />
              ) : (
                <Text style={styles.fieldValue}>{driver.vehicle.color}</Text>
              )}
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Year</Text>
              <Text style={styles.fieldValue}>{driver.vehicle.year}</Text>
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Type</Text>
              <Text style={styles.fieldValue}>{driver.vehicle.type}</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.red} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: colors.white },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.gold, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 28, fontWeight: '800', color: colors.bg },
  driverName: { fontSize: 22, fontWeight: '700', color: colors.white },
  driverId: { fontSize: 12, fontFamily: 'monospace', color: colors.textMuted, marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  ratingText: { fontSize: 13, color: colors.textSecondary },
  dot: { color: colors.textMuted },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.white, marginBottom: 12 },
  editBtn: { fontSize: 14, color: colors.gold, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' },
  field: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  fieldLabel: { fontSize: 14, color: colors.textSecondary },
  fieldValue: { fontSize: 14, color: colors.white, fontWeight: '500' },
  fieldInput: { fontSize: 14, color: colors.white, fontWeight: '500', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, minWidth: 160, textAlign: 'right' },
  fieldDivider: { height: 1, backgroundColor: colors.cardBorder, marginLeft: 20 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  logoutText: { fontSize: 16, fontWeight: '600', color: colors.red },
});
