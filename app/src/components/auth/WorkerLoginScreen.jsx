import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/services/api';

export const WorkerLoginScreen = ({ onSwitchToCustomer }) => {
  const { loginWorker, isLoading } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedTrade, setSelectedTrade] = useState('Electrician');
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');

  const handleLogin = async () => {
    const raw = String(phoneNumber || '').replace(/\D/g, '');
    const isAdmin = raw === '999999999' || raw === '9999999999';
    const clean = isAdmin ? '999999999' : raw.slice(-10);

    if (!isAdmin && clean.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter your registered mobile number.');
      return;
    }

    if (showOtp) {
      const code = otp.trim() || (isAdmin ? '9999' : '1234');
      const res = await loginWorker(clean, code, selectedTrade);
      if (!res || !res.success) {
        Alert.alert('Login Notice', res?.message || 'Login failed. Please check your credentials or register.');
      }
    } else {
      setShowOtp(true);
      const code = isAdmin ? '9999' : '1234';
      Alert.alert(
        isAdmin ? 'Admin Portal OTP 👑' : 'OTP Sent',
        `Verification code sent to +91 ${clean}.\n\n(Verification code: ${code})`
      );
    }
  };

  const handleRegister = () => {
    const clean = phoneNumber.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      Alert.alert('Mobile Number Required', 'Please enter your 10-digit mobile number above first.');
      return;
    }

    Alert.prompt
      ? Alert.prompt(
          'Join as Sastayu Partner',
          `Enter your full name to register as a verified ${selectedTrade}:`,
          async (name) => {
            if (!name || name.trim().length === 0) return;
            try {
              const res = await authAPI.workerRegister(clean, name.trim(), selectedTrade);
              if (res && res.success) {
                Alert.alert('Registration Complete! 🎉', 'Welcome to Sastayu Partner Network.', [
                  { text: 'Enter Dashboard', onPress: () => loginWorker(clean, '1234', selectedTrade) },
                ]);
              } else {
                Alert.alert('Registration Notice', res?.message || 'Could not complete registration.');
              }
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          }
        )
      : Alert.alert(
          'Partner Registration',
          `Register +91 ${clean} as a partner?`,
          [
            {
              text: 'Register Now',
              onPress: async () => {
                const res = await authAPI.workerRegister(clean, `Partner ${clean.slice(-4)}`, selectedTrade);
                if (res && res.success) {
                  loginWorker(clean, '1234', selectedTrade);
                } else {
                  Alert.alert('Notice', res?.message || 'Could not register.');
                }
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1527" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Sastayu PARTNER Brand Logo Header (Screenshot 1) */}
            <View style={styles.logoRow}>
              <View style={styles.roofAndPipe}>
                {/* White Roof Chevron */}
                <Text style={styles.roofChevron}>^</Text>
                {/* Yellow S Pipe */}
                <View style={styles.pipeSquircle}>
                  <Text style={styles.pipeLetterS}>S</Text>
                </View>
              </View>
              <View style={styles.logoTextCol}>
                <Text style={styles.logoBrandName}>Sastayu</Text>
                <Text style={styles.logoPartnerTag}>PARTNER</Text>
              </View>
            </View>

            {/* Headline matching Screenshot 1 */}
            <View style={styles.heroTextSection}>
              <Text style={styles.headline}>Get jobs near you.{"\n"}Earn on your time.</Text>
              <Text style={styles.subtitle}>
                Login to accept bookings and track your earnings.
              </Text>
            </View>

            {/* Mobile Number Input matching Screenshot 1 */}
            <View style={styles.phoneInputCard}>
              <View style={styles.countryCodeCol}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <View style={styles.inputDivider} />
              <TextInput
                style={styles.phoneTextInput}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                placeholder="98765 43210"
                placeholderTextColor="#64748B"
              />
            </View>

            {/* Optional OTP Box if clicked once */}
            {showOtp && (
              <View style={styles.otpCard}>
                <Text style={styles.otpLabel}>Enter 4-Digit OTP sent to your phone (OTP: 1234)</Text>
                <TextInput
                  style={styles.otpInput}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="numeric"
                  placeholder="1234"
                  placeholderTextColor="#64748B"
                  maxLength={4}
                />
              </View>
            )}

            {/* Yellow "Login with OTP" Button (Screenshot 1) */}
            <Pressable
              onPress={() => handleLogin()}
              style={({ pressed }) => [
                styles.yellowLoginBtn,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.yellowLoginBtnText}>
                {showOtp ? 'Verify & Enter Partner Portal' : 'Login with OTP'}
              </Text>
            </Pressable>

            {/* Switch to Customer Link */}
            {onSwitchToCustomer && (
              <Pressable
                onPress={onSwitchToCustomer}
                style={({ pressed }) => [styles.switchBtn, pressed && styles.pressed]}>
                <Text style={styles.switchText}>
                  Are you a customer? <Text style={styles.switchHighlight}>Customer Login →</Text>
                </Text>
              </Pressable>
            )}

            {/* Bottom Footer Section (Screenshot 1) */}
            <View style={styles.footerSection}>
              <Text style={styles.newToText}>New to Sastayu?</Text>
              <Pressable
                onPress={handleRegister}
                style={({ pressed }) => [
                  styles.registerOutlineBtn,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.registerOutlineBtnText}>
                  Register as a professional
                </Text>
              </Pressable>

              {/* Admin Portal Shortcut (Prompt 5: 999999999 / 9999) */}
              <Pressable
                onPress={() => {
                  setPhoneNumber('999999999');
                  setShowOtp(true);
                  setOtp('9999');
                  Alert.alert(
                    'Admin Credentials Loaded 👑',
                    'Mobile: 999999999\nOTP: 9999\n\nTap "Login" to open the Sastayu Executive Admin HQ.'
                  );
                }}
                style={styles.adminQuickBtn}>
                <Text style={styles.adminQuickText}>👑 Admin Portal (999999999 / 9999)</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1527',
  },
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 44,
  },
  roofAndPipe: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  roofChevron: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '900',
    lineHeight: 18,
    marginBottom: -2,
  },
  pipeSquircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipeLetterS: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  logoTextCol: {
    justifyContent: 'center',
  },
  logoBrandName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  logoPartnerTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 3,
    marginTop: 2,
  },
  heroTextSection: {
    marginBottom: 32,
  },
  headline: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 12,
    lineHeight: 22,
  },
  phoneInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 58,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  countryCodeCol: {
    paddingRight: 14,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#E2E8F0',
    marginRight: 14,
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  otpCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  otpLabel: {
    fontSize: 12,
    color: '#FBBF24',
    fontWeight: '600',
    marginBottom: 8,
  },
  otpInput: {
    backgroundColor: '#0D1527',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 4,
    textAlign: 'center',
  },
  yellowLoginBtn: {
    backgroundColor: '#FBBF24',
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  yellowLoginBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  switchBtn: {
    marginTop: 18,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  switchHighlight: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  footerSection: {
    marginTop: 40,
    paddingTop: 20,
    alignItems: 'center',
  },
  newToText: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
  },
  registerOutlineBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerOutlineBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  adminQuickBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  adminQuickText: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '800',
  },
});
