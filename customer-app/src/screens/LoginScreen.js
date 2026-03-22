import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const otpRefs = useRef([]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSendOTP = async () => {
    if (!email.includes('@')) return Alert.alert('Error', 'Please enter a valid email');
    setLoading(true);
    try {
      await api.sendOTP(email);
      setStep('otp');
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length !== 5) return Alert.alert('Error', 'Please enter the complete OTP');
    setLoading(true);
    try {
      const data = await api.verifyOTP(email, code);
      await login(data.token, data.user);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 4) otpRefs.current[index + 1]?.focus();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Branding */}
          <View style={styles.brandSection}>
            <View style={styles.logoBox}>
              <Text style={styles.logoNum}>8</Text>
            </View>
            <Text style={styles.brandName}>Best Class</Text>
            <Text style={styles.brandTagline}>Premium Chauffeur Services</Text>
          </View>

          {step === 'email' ? (
            <View style={styles.form}>
              <Text style={styles.welcomeText}>Welcome</Text>
              <Text style={styles.descText}>Book your premium chauffeur experience</Text>

              <View style={styles.inputWrap}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor="rgba(255,255,255,0.15)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity style={styles.goldBtn} onPress={handleSendOTP} disabled={loading}>
                <Text style={styles.goldBtnText}>{loading ? 'Sending...' : 'Continue'}</Text>
              </TouchableOpacity>

              <Text style={styles.hint}>Prototype: richard@example.com or any email</Text>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.welcomeText}>Verification</Text>
              <Text style={styles.descText}>Enter the 5-digit code sent to {email}</Text>

              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={ref => otpRefs.current[i] = ref}
                    style={[styles.otpBox, digit ? styles.otpBoxActive : null]}
                    value={digit}
                    onChangeText={text => handleOtpChange(text, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                  />
                ))}
              </View>

              <TouchableOpacity style={styles.goldBtn} onPress={handleVerifyOTP} disabled={loading}>
                <Text style={styles.goldBtnText}>{loading ? 'Verifying...' : 'Verify'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep('email')}>
                <Text style={styles.backText}>← Change email</Text>
              </TouchableOpacity>

              <Text style={styles.hint}>Prototype OTP: 12345</Text>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  keyboardView: { flex: 1, justifyContent: 'center' },
  content: { paddingHorizontal: 32 },
  brandSection: { alignItems: 'center', marginBottom: 56 },
  logoBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.gold, justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: colors.gold, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 12 },
  logoNum: { fontSize: 36, fontWeight: '800', color: colors.bg },
  brandName: { fontSize: 36, fontWeight: '700', color: colors.gold, letterSpacing: 3 },
  brandTagline: { fontSize: 12, color: colors.textMuted, letterSpacing: 2, marginTop: 8, textTransform: 'uppercase' },
  form: {},
  welcomeText: { fontSize: 26, fontWeight: '700', color: colors.white, marginBottom: 8 },
  descText: { fontSize: 14, color: colors.textSecondary, marginBottom: 32 },
  inputWrap: { marginBottom: 24 },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18, color: colors.white, fontSize: 16 },
  goldBtn: { backgroundColor: colors.gold, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 16, shadowColor: colors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  goldBtnText: { color: colors.bg, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  hint: { textAlign: 'center', color: 'rgba(255,255,255,0.12)', fontSize: 11, marginTop: 20 },
  backText: { textAlign: 'center', color: colors.gold, fontSize: 14, marginTop: 8 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 32 },
  otpBox: { width: 54, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', color: colors.white, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  otpBoxActive: { borderColor: colors.gold, backgroundColor: 'rgba(200,169,81,0.06)' },
});
