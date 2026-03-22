import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Dimensions } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function BookRideScreen({ navigation }) {
  const { user } = useAuth();
  const mapRef = useRef(null);
  const [step, setStep] = useState(1); // 1=route, 2=vehicle, 3=extras, 4=confirm
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [extras, setExtras] = useState([]);
  const [form, setForm] = useState({
    pickup: '', dropoff: '', date: '', time: '',
    vehicleType: '', selectedExtras: [], notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    api.getVehicleTypes().then(d => setVehicleTypes(d.vehicleTypes || [])).catch(console.error);
    api.getExtras().then(d => setExtras(d.extras || [])).catch(console.error);
  }, []);

  // Fit map to show both markers
  const fitMapToMarkers = (pickup, dropoff) => {
    if (mapRef.current && pickup && dropoff) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: pickup.lat, longitude: pickup.lng },
          { latitude: dropoff.lat, longitude: dropoff.lng },
        ],
        { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true }
      );
    }
  };

  // Geocode addresses and calculate distance
  const geocodeAndCalculate = async () => {
    if (!form.pickup || !form.dropoff) {
      Alert.alert('Missing Info', 'Please enter both pickup and drop-off locations.');
      return false;
    }
    setGeocoding(true);
    try {
      const [pickupGeo, dropoffGeo] = await Promise.all([
        api.geocode(form.pickup),
        api.geocode(form.dropoff),
      ]);

      if (!pickupGeo || !pickupGeo.lat) {
        Alert.alert('Location Not Found', `Could not find coordinates for: "${form.pickup}"`);
        setGeocoding(false);
        return false;
      }
      if (!dropoffGeo || !dropoffGeo.lat) {
        Alert.alert('Location Not Found', `Could not find coordinates for: "${form.dropoff}"`);
        setGeocoding(false);
        return false;
      }

      setPickupCoords(pickupGeo);
      setDropoffCoords(dropoffGeo);

      // Calculate distance
      const dist = await api.getDistance(pickupGeo.lat, pickupGeo.lng, dropoffGeo.lat, dropoffGeo.lng).catch(() => null);
      if (dist) {
        setRouteInfo(dist);
      } else {
        Alert.alert('Route Error', 'Could not calculate route distance. Minimum fares will apply.');
      }

      // Fit map after a tick
      setTimeout(() => fitMapToMarkers(pickupGeo, dropoffGeo), 300);
      setGeocoding(false);
      return true;
    } catch (e) {
      console.error('Geocoding error:', e);
      Alert.alert('Error', 'Failed to geocode addresses. Please check your connection.');
      setGeocoding(false);
      return false;
    }
  };

  const selectedVehicle = vehicleTypes.find(v => v.id === form.vehicleType);
  const extrasTotal = form.selectedExtras.reduce((sum, id) => {
    const ext = extras.find(e => e.id === id);
    return sum + (ext ? ext.price : 0);
  }, 0);

  // Dynamic pricing: baseRate × distanceKm, floored at minFare
  const getVehicleFare = (vehicle) => {
    if (!vehicle) return 0;
    if (routeInfo && routeInfo.distanceKm > 0) {
      return Math.max(parseFloat((vehicle.baseRate * routeInfo.distanceKm).toFixed(2)), vehicle.minFare);
    }
    return vehicle.minFare;
  };
  const baseFare = getVehicleFare(selectedVehicle);
  const totalFare = baseFare + extrasTotal;

  const toggleExtra = (id) => {
    setForm(f => ({
      ...f,
      selectedExtras: f.selectedExtras.includes(id) ? f.selectedExtras.filter(e => e !== id) : [...f.selectedExtras, id],
    }));
  };

  const handleBook = async () => {
    setLoading(true);
    try {
      await api.createBooking({
        customerId: user.id,
        customerName: user.name,
        pickup: { address: form.pickup, lat: pickupCoords?.lat || 51.5074, lng: pickupCoords?.lng || -0.1278 },
        dropoff: { address: form.dropoff, lat: dropoffCoords?.lat || 51.4700, lng: dropoffCoords?.lng || -0.4543 },
        date: form.date || new Date().toISOString().split('T')[0],
        time: form.time || '14:00',
        vehicleType: form.vehicleType,
        extras: form.selectedExtras,
        notes: form.notes,
        source: 'app',
      });
      setStep(5); // success
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const vehicleIcons = { sedan: 'car-sport', suv: 'car', mpv: 'bus', luxury: 'diamond' };

  // Step 5: Success
  if (step === 5) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
        <View style={styles.successIcon}><Ionicons name="checkmark" size={48} color={colors.bg} /></View>
        <Text style={styles.successTitle}>Booking Confirmed</Text>
        <Text style={styles.successDesc}>Your chauffeur booking has been submitted. Our team will assign a chauffeur shortly.</Text>
        <TouchableOpacity style={styles.goldBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.goldBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Chauffeur</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress */}
      <View style={styles.progressRow}>
        {[1, 2, 3, 4].map(s => (
          <View key={s} style={[styles.progressDot, step >= s && styles.progressDotActive]} />
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Step 1: Route */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Where are you going?</Text>
            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <Ionicons name="ellipse" size={8} color={colors.green} />
                <TextInput style={styles.input} placeholder="Pickup location" placeholderTextColor={colors.textMuted} value={form.pickup} onChangeText={t => setForm(f => ({ ...f, pickup: t }))} />
              </View>
              <View style={styles.inputDivider} />
              <View style={styles.inputRow}>
                <Ionicons name="location" size={8} color={colors.red} />
                <TextInput style={styles.input} placeholder="Drop-off location" placeholderTextColor={colors.textMuted} value={form.dropoff} onChangeText={t => setForm(f => ({ ...f, dropoff: t }))} />
              </View>
            </View>
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeField}>
                <Text style={styles.dtLabel}>Date</Text>
                <TextInput style={styles.dtInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} value={form.date} onChangeText={t => setForm(f => ({ ...f, date: t }))} />
              </View>
              <View style={styles.dateTimeField}>
                <Text style={styles.dtLabel}>Time</Text>
                <TextInput style={styles.dtInput} placeholder="HH:MM" placeholderTextColor={colors.textMuted} value={form.time} onChangeText={t => setForm(f => ({ ...f, time: t }))} />
              </View>
            </View>

            {/* Show loading indicator while geocoding */}
            {geocoding && (
              <View style={styles.geocodingOverlay}>
                <ActivityIndicator size="large" color={colors.gold} />
                <Text style={styles.geocodingText}>Finding locations & calculating route...</Text>
              </View>
            )}
          </View>
        )}

        {/* Step 2: Map + Vehicle Selection */}
        {step === 2 && (
          <View style={styles.stepContent}>
            {/* MAP showing pickup and dropoff */}
            {pickupCoords && dropoffCoords && (
              <View style={styles.mapContainer}>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  initialRegion={{
                    latitude: (pickupCoords.lat + dropoffCoords.lat) / 2,
                    longitude: (pickupCoords.lng + dropoffCoords.lng) / 2,
                    latitudeDelta: Math.abs(pickupCoords.lat - dropoffCoords.lat) * 1.5 + 0.02,
                    longitudeDelta: Math.abs(pickupCoords.lng - dropoffCoords.lng) * 1.5 + 0.02,
                  }}
                  onMapReady={() => fitMapToMarkers(pickupCoords, dropoffCoords)}
                >
                  {/* Pickup Marker */}
                  <Marker
                    coordinate={{ latitude: pickupCoords.lat, longitude: pickupCoords.lng }}
                    title="Pickup"
                    description={form.pickup}
                    pinColor="green"
                  />
                  {/* Dropoff Marker */}
                  <Marker
                    coordinate={{ latitude: dropoffCoords.lat, longitude: dropoffCoords.lng }}
                    title="Drop-off"
                    description={form.dropoff}
                    pinColor="red"
                  />
                  {/* Route line */}
                  <Polyline
                    coordinates={[
                      { latitude: pickupCoords.lat, longitude: pickupCoords.lng },
                      { latitude: dropoffCoords.lat, longitude: dropoffCoords.lng },
                    ]}
                    strokeColor={colors.gold}
                    strokeWidth={3}
                    lineDashPattern={[6, 4]}
                  />
                </MapView>

                {/* Route info overlay on map */}
                {routeInfo && (
                  <View style={styles.mapInfoOverlay}>
                    <View style={styles.mapInfoItem}>
                      <Ionicons name="speedometer-outline" size={14} color={colors.gold} />
                      <Text style={styles.mapInfoText}>{routeInfo.distanceKm} km</Text>
                    </View>
                    <View style={styles.mapInfoDot} />
                    <View style={styles.mapInfoItem}>
                      <Ionicons name="time-outline" size={14} color={colors.gold} />
                      <Text style={styles.mapInfoText}>{routeInfo.durationMinutes} min</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Route addresses summary */}
            <View style={styles.routeSummaryCard}>
              <View style={styles.routeSummaryRow}>
                <Ionicons name="ellipse" size={8} color={colors.green} />
                <Text style={styles.routeSummaryText} numberOfLines={1}>{form.pickup}</Text>
              </View>
              <View style={styles.routeSummaryDivider} />
              <View style={styles.routeSummaryRow}>
                <Ionicons name="location" size={8} color={colors.red} />
                <Text style={styles.routeSummaryText} numberOfLines={1}>{form.dropoff}</Text>
              </View>
            </View>

            {/* Distance & Time info card */}
            {routeInfo && (
              <View style={styles.routeInfoCard}>
                <View style={styles.routeInfoItem}>
                  <Ionicons name="speedometer-outline" size={20} color={colors.gold} />
                  <Text style={styles.routeInfoVal}>{routeInfo.distanceKm} km</Text>
                  <Text style={styles.routeInfoLabel}>Road Distance</Text>
                </View>
                <View style={styles.routeInfoDivider} />
                <View style={styles.routeInfoItem}>
                  <Ionicons name="time-outline" size={20} color={colors.gold} />
                  <Text style={styles.routeInfoVal}>{routeInfo.durationMinutes} min</Text>
                  <Text style={styles.routeInfoLabel}>Est. Travel Time</Text>
                </View>
              </View>
            )}

            <Text style={styles.stepTitle}>Choose your vehicle</Text>
            {routeInfo && (
              <Text style={styles.stepDesc}>Prices calculated for {routeInfo.distanceKm} km journey</Text>
            )}

            {vehicleTypes.map(v => {
              const fare = getVehicleFare(v);
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.vehicleCard, form.vehicleType === v.id && styles.vehicleCardActive]}
                  onPress={() => setForm(f => ({ ...f, vehicleType: v.id }))}
                >
                  <View style={styles.vehicleIconBox}>
                    <Ionicons name={vehicleIcons[v.id] || 'car'} size={28} color={form.vehicleType === v.id ? colors.gold : colors.textMuted} />
                  </View>
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleName}>{v.name}</Text>
                    <Text style={styles.vehicleDesc}>{v.description}</Text>
                    <Text style={styles.vehicleCap}>Up to {v.capacity} passengers • £{v.baseRate}/km</Text>
                  </View>
                  <View style={styles.vehiclePrice}>
                    {routeInfo ? (
                      <Text style={styles.vehiclePriceVal}>£{fare.toFixed(0)}</Text>
                    ) : (
                      <>
                        <Text style={styles.vehiclePriceText}>From</Text>
                        <Text style={styles.vehiclePriceVal}>£{v.minFare.toFixed(0)}</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Step 3: Extras */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Enhance your journey</Text>
            <Text style={styles.stepDesc}>Add premium extras to your ride</Text>
            {extras.map(ext => (
              <TouchableOpacity
                key={ext.id}
                style={[styles.extraCard, form.selectedExtras.includes(ext.id) && styles.extraCardActive]}
                onPress={() => toggleExtra(ext.id)}
              >
                <View style={[styles.extraCheck, form.selectedExtras.includes(ext.id) && styles.extraCheckActive]}>
                  {form.selectedExtras.includes(ext.id) && <Ionicons name="checkmark" size={14} color={colors.bg} />}
                </View>
                <Text style={styles.extraName}>{ext.name}</Text>
                <Text style={styles.extraPrice}>{ext.price > 0 ? `£${ext.price.toFixed(2)}` : 'Free'}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={[styles.input, { marginTop: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, padding: 16 }]}
              placeholder="Special requests or notes..."
              placeholderTextColor={colors.textMuted}
              value={form.notes}
              onChangeText={t => setForm(f => ({ ...f, notes: t }))}
              multiline
            />
          </View>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Confirm booking</Text>

            {/* Mini map on confirm */}
            {pickupCoords && dropoffCoords && (
              <View style={styles.miniMapContainer}>
                <MapView
                  style={styles.miniMap}
                  initialRegion={{
                    latitude: (pickupCoords.lat + dropoffCoords.lat) / 2,
                    longitude: (pickupCoords.lng + dropoffCoords.lng) / 2,
                    latitudeDelta: Math.abs(pickupCoords.lat - dropoffCoords.lat) * 1.5 + 0.02,
                    longitudeDelta: Math.abs(pickupCoords.lng - dropoffCoords.lng) * 1.5 + 0.02,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker coordinate={{ latitude: pickupCoords.lat, longitude: pickupCoords.lng }} pinColor="green" />
                  <Marker coordinate={{ latitude: dropoffCoords.lat, longitude: dropoffCoords.lng }} pinColor="red" />
                  <Polyline
                    coordinates={[
                      { latitude: pickupCoords.lat, longitude: pickupCoords.lng },
                      { latitude: dropoffCoords.lat, longitude: dropoffCoords.lng },
                    ]}
                    strokeColor={colors.gold}
                    strokeWidth={2}
                    lineDashPattern={[6, 4]}
                  />
                </MapView>
              </View>
            )}

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Pickup</Text><Text style={styles.summaryValue} numberOfLines={1}>{form.pickup}</Text></View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Drop-off</Text><Text style={styles.summaryValue} numberOfLines={1}>{form.dropoff}</Text></View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Date & Time</Text><Text style={styles.summaryValue}>{form.date} at {form.time}</Text></View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Vehicle</Text><Text style={styles.summaryValue}>{selectedVehicle?.name}</Text></View>
              {routeInfo && (
                <>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Distance</Text><Text style={styles.summaryValue}>{routeInfo.distanceKm} km</Text></View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Est. Travel Time</Text><Text style={styles.summaryValue}>{routeInfo.durationMinutes} min</Text></View>
                </>
              )}
              {form.selectedExtras.length > 0 && (
                <>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Extras</Text><Text style={styles.summaryValue}>{form.selectedExtras.length} items</Text></View>
                </>
              )}
            </View>

            {/* Price Breakdown */}
            <View style={styles.priceCard}>
              <Text style={styles.priceTitle}>Price Breakdown</Text>
              {routeInfo && routeInfo.distanceKm > 0 ? (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{routeInfo.distanceKm} km × £{selectedVehicle?.baseRate}/km</Text>
                  <Text style={styles.priceVal}>£{baseFare.toFixed(2)}</Text>
                </View>
              ) : (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Base fare</Text>
                  <Text style={styles.priceVal}>£{baseFare.toFixed(2)}</Text>
                </View>
              )}
              {extrasTotal > 0 && <View style={styles.priceRow}><Text style={styles.priceLabel}>Extras</Text><Text style={styles.priceVal}>£{extrasTotal.toFixed(2)}</Text></View>}
              <View style={[styles.priceRow, styles.priceTotalRow]}>
                <Text style={styles.priceTotalLabel}>Total</Text>
                <Text style={styles.priceTotalVal}>£{totalFare.toFixed(2)}</Text>
              </View>
            </View>

            {/* Payment Method (placeholder) */}
            <View style={styles.paymentCard}>
              <Ionicons name="card-outline" size={20} color={colors.gold} />
              <Text style={styles.paymentText}>Payment on account</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      {step < 5 && (
        <View style={styles.bottomBar}>
          {step === 4 ? (
            <TouchableOpacity style={styles.goldBtn} onPress={handleBook} disabled={loading}>
              <Text style={styles.goldBtnText}>{loading ? 'Booking...' : 'Confirm & Book'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.goldBtn, ((step === 1 && (!form.pickup || !form.dropoff)) || geocoding) && styles.btnDisabled]}
              onPress={async () => {
                if (step === 1) {
                  const success = await geocodeAndCalculate();
                  if (success) setStep(2);
                } else {
                  setStep(step + 1);
                }
              }}
              disabled={(step === 1 && (!form.pickup || !form.dropoff)) || (step === 2 && !form.vehicleType) || geocoding}
            >
              <Text style={styles.goldBtnText}>{geocoding ? 'Calculating route...' : 'Continue'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.white },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  progressDot: { width: 32, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' },
  progressDotActive: { backgroundColor: colors.gold },
  stepContent: { paddingHorizontal: 20 },
  stepTitle: { fontSize: 24, fontWeight: '700', color: colors.white, marginBottom: 8 },
  stepDesc: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
  inputGroup: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden', marginBottom: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12 },
  input: { flex: 1, paddingVertical: 18, color: colors.white, fontSize: 15 },
  inputDivider: { height: 1, backgroundColor: colors.cardBorder, marginLeft: 40 },
  dateTimeRow: { flexDirection: 'row', gap: 12 },
  dateTimeField: { flex: 1 },
  dtLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  dtInput: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, color: colors.white, fontSize: 15 },
  geocodingOverlay: { alignItems: 'center', marginTop: 32, gap: 12 },
  geocodingText: { fontSize: 14, color: colors.gold, fontWeight: '500' },

  // Map styles
  mapContainer: { height: 220, borderRadius: 20, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  map: { width: '100%', height: '100%' },
  mapInfoOverlay: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', backgroundColor: 'rgba(15,20,35,0.9)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: 'center' },
  mapInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mapInfoText: { fontSize: 13, fontWeight: '700', color: colors.white },
  mapInfoDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textMuted },

  // Route summary
  routeSummaryCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 14, marginBottom: 12, gap: 8 },
  routeSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeSummaryText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  routeSummaryDivider: { height: 1, backgroundColor: colors.cardBorder, marginLeft: 18 },

  // Route info card
  routeInfoCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.gold, padding: 16, marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  routeInfoItem: { flex: 1, alignItems: 'center', gap: 4 },
  routeInfoVal: { fontSize: 20, fontWeight: '700', color: colors.white },
  routeInfoLabel: { fontSize: 11, color: colors.textSecondary },
  routeInfoDivider: { width: 1, height: 36, backgroundColor: colors.cardBorder },

  // Vehicle cards
  vehicleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 20, borderWidth: 1.5, borderColor: colors.cardBorder, padding: 20, marginBottom: 12, gap: 16 },
  vehicleCardActive: { borderColor: colors.gold, backgroundColor: 'rgba(200,169,81,0.06)' },
  vehicleIconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 16, fontWeight: '600', color: colors.white },
  vehicleDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  vehicleCap: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  vehiclePrice: { alignItems: 'flex-end' },
  vehiclePriceText: { fontSize: 10, color: colors.textMuted },
  vehiclePriceVal: { fontSize: 20, fontWeight: '700', color: colors.gold },

  // Extras
  extraCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, marginBottom: 8, gap: 12 },
  extraCardActive: { borderColor: colors.gold, backgroundColor: 'rgba(200,169,81,0.06)' },
  extraCheck: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: colors.textMuted, justifyContent: 'center', alignItems: 'center' },
  extraCheckActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  extraName: { flex: 1, fontSize: 14, color: colors.white },
  extraPrice: { fontSize: 13, fontWeight: '600', color: colors.gold },

  // Summary
  summaryCard: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 13, color: colors.white, fontWeight: '500', maxWidth: '55%', textAlign: 'right' },
  summaryDivider: { height: 1, backgroundColor: colors.cardBorder, marginLeft: 20 },

  // Mini map on confirm
  miniMapContainer: { height: 150, borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  miniMap: { width: '100%', height: '100%' },

  // Price
  priceCard: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, padding: 20, marginBottom: 16 },
  priceTitle: { fontSize: 14, fontWeight: '600', color: colors.white, marginBottom: 16 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 14, color: colors.textSecondary },
  priceVal: { fontSize: 14, color: colors.white },
  priceTotalRow: { borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 12, marginTop: 8, marginBottom: 0 },
  priceTotalLabel: { fontSize: 16, fontWeight: '700', color: colors.white },
  priceTotalVal: { fontSize: 22, fontWeight: '700', color: colors.gold },

  // Payment
  paymentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, gap: 12 },
  paymentText: { flex: 1, fontSize: 14, color: colors.white },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 16, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  goldBtn: { backgroundColor: colors.gold, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  goldBtnText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.4 },

  // Success
  successIcon: { width: 96, height: 96, borderRadius: 32, backgroundColor: colors.gold, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle: { fontSize: 26, fontWeight: '700', color: colors.white, marginBottom: 12 },
  successDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
});
