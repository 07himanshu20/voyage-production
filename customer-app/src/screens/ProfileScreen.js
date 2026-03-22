import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Personal Information', sub: 'Name, email, phone' },
    { icon: 'card-outline', label: 'Payment Methods', sub: 'Manage payment options' },
    { icon: 'location-outline', label: 'Saved Addresses', sub: 'Home, office, favourites' },
    { icon: 'notifications-outline', label: 'Notifications', sub: 'Push & email preferences' },
    { icon: 'shield-checkmark-outline', label: 'Privacy & Security', sub: 'Password, data settings' },
    { icon: 'help-circle-outline', label: 'Help & Support', sub: 'FAQs, contact us' },
    { icon: 'document-text-outline', label: 'Terms & Conditions', sub: 'Legal information' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Avatar Card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {user?.loyaltyTier && (
            <View style={styles.tierBadge}>
              <Ionicons name="diamond" size={12} color={colors.gold} />
              <Text style={styles.tierText}>{user.loyaltyTier} Member</Text>
            </View>
          )}
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} style={styles.menuItem} activeOpacity={0.6}>
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={20} color={colors.gold} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.red} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Best Class v1.0.0 — Prototype</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: colors.white },
  avatarCard: { alignItems: 'center', paddingVertical: 28 },
  avatar: { width: 88, height: 88, borderRadius: 28, backgroundColor: colors.gold, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: colors.gold, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 12 },
  avatarText: { fontSize: 32, fontWeight: '800', color: colors.bg },
  userName: { fontSize: 22, fontWeight: '700', color: colors.white },
  userEmail: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: 'rgba(200,169,81,0.1)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  tierText: { fontSize: 12, fontWeight: '600', color: colors.gold },
  menuCard: { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden', marginBottom: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, gap: 14 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(200,169,81,0.08)', justifyContent: 'center', alignItems: 'center' },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '500', color: colors.white },
  menuSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, paddingVertical: 16, borderRadius: 16, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  logoutText: { fontSize: 16, fontWeight: '600', color: colors.red },
  version: { textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: 24 },
});
