import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const otpRefs = useRef([]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSendOTP = async () => {
    if (!email.includes('@')) return Alert.alert('Error', 'Please enter a valid email');
    setLoading(true);
    try {
      await api.sendOTP(email);
      setStep('otp');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length !== 5) return Alert.alert('Error', 'Please enter the complete OTP');
    setLoading(true);
    try {
      const data = await api.verifyOTP(email, code);
      await login(data.token, data.user);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
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
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoText}>8</Text>
            </View>
            <Text style={styles.brandName}>Best Class</Text>
            <Text style={styles.brandSub}>CHAUFFEUR</Text>
          </View>

          {step === 'email' ? (
            <View style={styles.form}>
              <Text style={styles.heading}>Welcome Back</Text>
              <Text style={styles.subheading}>Sign in with your registered email</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="james@bestclass.com"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity style={styles.btnGold} onPress={handleSendOTP} disabled={loading}>
                <Text style={styles.btnGoldText}>{loading ? 'Sending OTP...' : 'Continue'}</Text>
              </TouchableOpacity>

              <Text style={styles.hint}>Prototype: Use james@bestclass.com</Text>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.heading}>Verify OTP</Text>
              <Text style={styles.subheading}>Enter the 5-digit code sent to {email}</Text>

              <View style={styles.otpContainer}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={ref => otpRefs.current[i] = ref}
                    style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                    value={digit}
                    onChangeText={text => handleOtpChange(text, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <TouchableOpacity style={styles.btnGold} onPress={handleVerifyOTP} disabled={loading}>
                <Text style={styles.btnGoldText}>{loading ? 'Verifying...' : 'Verify & Sign In'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep('email')}>
                <Text style={styles.backLink}>← Back to email</Text>
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
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logoIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.gold, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoText: { fontSize: 32, fontWeight: '800', color: colors.bg },
  brandName: { fontSize: 32, fontWeight: '700', color: colors.gold, letterSpacing: 2 },
  brandSub: { fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 6, marginTop: 4 },
  form: {},
  heading: { fontSize: 24, fontWeight: '700', color: colors.white, marginBottom: 8 },
  subheading: { fontSize: 14, color: colors.textSecondary, marginBottom: 32 },
  inputContainer: { marginBottom: 24 },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, color: colors.white, fontSize: 16 },
  btnGold: { backgroundColor: colors.gold, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginBottom: 16 },
  btnGoldText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
  hint: { textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: 11, marginTop: 16 },
  backLink: { textAlign: 'center', color: colors.gold, fontSize: 14, marginTop: 8 },
  otpContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 32 },
  otpInput: { width: 52, height: 60, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', color: colors.white, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  otpInputFilled: { borderColor: colors.gold, backgroundColor: 'rgba(200,169,81,0.08)' },
});
