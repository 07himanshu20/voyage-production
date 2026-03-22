import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

export default function TripTrackScreen({ route, navigation }) {
  const [booking, setBooking] = useState(route.params.booking);
  const [driverLoc, setDriverLoc] = useState(null);
  const mapRef = useRef(null);

  // Connect to Socket.IO for real-time driver location
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      socket.emit('customer_connect', booking.customerId);
    });

    // Listen for driver location updates
    socket.on('driver_location_update', ({ driverId, location }) => {
      if (driverId === booking.driverId) {
        setDriverLoc({ lat: location.lat, lng: location.lng });
      }
    });

    // Listen for booking updates (trip status changes)
    socket.on('booking_updated', (updated) => {
      if (updated.id === booking.id) {
        setBooking(updated);
      }
    });

    socket.on(`customer_${booking.customerId}_update`, (updated) => {
      if (updated.id === booking.id) {
        setBooking(updated);
      }
    });

    return () => socket.disconnect();
  }, []);

  // Fit map to show all relevant points
  useEffect(() => {
    if (!mapRef.current) return;
    const coords = [];
    if (booking.pickup?.lat) coords.push({ latitude: booking.pickup.lat, longitude: booking.pickup.lng });
    if (booking.dropoff?.lat) coords.push({ latitude: booking.dropoff.lat, longitude: booking.dropoff.lng });
    if (driverLoc) coords.push({ latitude: driverLoc.lat, longitude: driverLoc.lng });
    if (coords.length >= 2) {
      mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 80, right: 60, bottom: 80, left: 60 }, animated: true });
    }
  }, [driverLoc]);

  const tripStatusLabel = {
    en_route: 'Chauffeur is on the way',
    arrived_pickup: 'Chauffeur has arrived',
    passenger_onboard: 'Trip in progress',
    completed: 'You have arrived',
  };

  const tripStatusIcon = {
    en_route: 'navigate',
    arrived_pickup: 'flag',
    passenger_onboard: 'car',
    completed: 'checkmark-circle',
  };

  const openNavigation = () => {
    const wazeUrl = `https://waze.com/ul?ll=${booking.dropoff.lat},${booking.dropoff.lng}&navigate=yes`;
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${booking.dropoff.lat},${booking.dropoff.lng}`;
    Alert.alert('Open Navigation', 'Track your route in:', [
      { text: 'Waze', onPress: () => Linking.openURL(wazeUrl) },
      { text: 'Google Maps', onPress: () => Linking.openURL(googleUrl) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickupCoord = booking.pickup?.lat ? { latitude: booking.pickup.lat, longitude: booking.pickup.lng } : null;
  const dropoffCoord = booking.dropoff?.lat ? { latitude: booking.dropoff.lat, longitude: booking.dropoff.lng } : null;

  return (
    <View style={styles.container}>
      {/* Real Map */}
      <View style={styles.mapArea}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: pickupCoord?.latitude || 51.5074,
            longitude: pickupCoord?.longitude || -0.1278,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onMapReady={() => {
            const coords = [];
            if (pickupCoord) coords.push(pickupCoord);
            if (dropoffCoord) coords.push(dropoffCoord);
            if (coords.length >= 2 && mapRef.current) {
              mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 80, right: 60, bottom: 80, left: 60 }, animated: false });
            }
          }}
        >
          {/* Pickup marker */}
          {pickupCoord && (
            <Marker coordinate={pickupCoord} title="Pickup" description={booking.pickup.address} pinColor="green" />
          )}
          {/* Dropoff marker */}
          {dropoffCoord && (
            <Marker coordinate={dropoffCoord} title="Drop-off" description={booking.dropoff.address} pinColor="red" />
          )}
          {/* Driver location marker */}
          {driverLoc && (
            <Marker
              coordinate={{ latitude: driverLoc.lat, longitude: driverLoc.lng }}
              title={booking.driverName || 'Chauffeur'}
              description={booking.vehicleName}
            >
              <View style={styles.driverMarker}>
                <Ionicons name="car" size={18} color="#fff" />
              </View>
            </Marker>
          )}
          {/* Route line */}
          {pickupCoord && dropoffCoord && (
            <Polyline
              coordinates={[pickupCoord, dropoffCoord]}
              strokeColor={colors.gold}
              strokeWidth={3}
              lineDashPattern={[6, 4]}
            />
          )}
        </MapView>

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>

        {/* Distance/time overlay */}
        {booking.distanceKm > 0 && (
          <View style={styles.distanceOverlay}>
            <Text style={styles.distanceText}>{booking.distanceKm} km</Text>
            <View style={styles.distanceDot} />
            <Text style={styles.distanceText}>{booking.durationMinutes} min</Text>
          </View>
        )}
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        {/* Status */}
        <View style={styles.statusSection}>
          <View style={styles.statusIconBox}>
            <Ionicons name={tripStatusIcon[booking.tripStatus] || 'time'} size={24} color={colors.gold} />
          </View>
          <View>
            <Text style={styles.statusLabel}>{tripStatusLabel[booking.tripStatus] || 'Awaiting chauffeur'}</Text>
            {booking.durationMinutes > 0 && (
              <Text style={styles.statusEta}>Est. journey: {booking.durationMinutes} min</Text>
            )}
          </View>
        </View>

        {/* Driver Info */}
        {booking.driverName && (
          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverInitials}>{booking.driverName.split(' ').map(n => n[0]).join('')}</Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{booking.driverName}</Text>
              <Text style={styles.driverVehicle}>{booking.vehicleName}</Text>
            </View>
            <View style={styles.driverActions}>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="call" size={18} color={colors.green} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="chatbubble" size={18} color={colors.blue} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Route Summary */}
        <View style={styles.routeSummary}>
          <View style={styles.routePoint}>
            <Ionicons name="ellipse" size={8} color={colors.green} />
            <Text style={styles.routeAddr} numberOfLines={1}>{booking.pickup.address}</Text>
          </View>
          <View style={styles.routePoint}>
            <Ionicons name="location" size={8} color={colors.red} />
            <Text style={styles.routeAddr} numberOfLines={1}>{booking.dropoff.address}</Text>
          </View>
        </View>

        {/* Open Navigation */}
        <TouchableOpacity style={styles.navButton} onPress={openNavigation}>
          <Ionicons name="navigate" size={18} color={colors.gold} />
          <Text style={styles.navButtonText}>Open in Maps</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  mapArea: { flex: 1 },
  map: { width: '100%', height: '100%' },
  driverMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#A855F7', borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  backBtn: { position: 'absolute', top: 56, left: 20, width: 44, height: 44, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, justifyContent: 'center', alignItems: 'center' },
  distanceOverlay: { position: 'absolute', top: 56, alignSelf: 'center', flexDirection: 'row', backgroundColor: 'rgba(15,20,35,0.9)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: 'center' },
  distanceText: { fontSize: 13, fontWeight: '700', color: colors.white },
  distanceDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textMuted },
  bottomSheet: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  statusSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  statusIconBox: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(200,169,81,0.1)', justifyContent: 'center', alignItems: 'center' },
  statusLabel: { fontSize: 16, fontWeight: '600', color: colors.white },
  statusEta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  driverCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 16, gap: 12 },
  driverAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.gold, justifyContent: 'center', alignItems: 'center' },
  driverInitials: { fontSize: 18, fontWeight: '700', color: colors.bg },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: '600', color: colors.white },
  driverVehicle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  driverActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  routeSummary: { gap: 8, marginBottom: 16 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeAddr: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  navButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, backgroundColor: 'rgba(200,169,81,0.1)', borderWidth: 1, borderColor: 'rgba(200,169,81,0.2)' },
  navButtonText: { fontSize: 15, fontWeight: '600', color: colors.gold },
});
