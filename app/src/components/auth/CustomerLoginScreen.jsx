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
import { SastayuHeroStacked } from '@/components/brand/SastayuLogo';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/services/api';

export const CustomerLoginScreen = ({ onSwitchToWorker }) => {
  const { loginCustomer, isLoading } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  const handleGetOtp = async (overrideNumber) => {
    const num = typeof overrideNumber === 'string' ? overrideNumber : (phoneNumber || '');
    const raw = String(num).replace(/\D/g, '');
    const isAdmin = raw === '999999999' || raw === '9999999999';
    const clean = isAdmin ? '999999999' : raw.slice(-10);

    if (!isAdmin && clean.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setSendingOtp(true);
    try {
      const res = await authAPI.customerSendOtp(clean);
      if (res && res.success) {
        setShowOtpInput(true);
        const code = res.otp || (isAdmin ? '9999' : '1234');
        Alert.alert(
          isAdmin ? 'Admin Portal OTP 👑' : 'OTP Sent',
          `Verification code sent to +91 ${clean}.\n\n(Verification code: ${code})`
        );
      } else {
        Alert.alert('Error', res?.message || 'Could not send verification code.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValue || otpValue.trim().length === 0) {
      Alert.alert('Missing OTP', 'Please enter the verification code.');
      return;
    }
    const raw = String(phoneNumber || '').replace(/\D/g, '');
    const isAdmin = raw === '999999999' || raw === '9999999999';
    const clean = isAdmin ? '999999999' : raw.slice(-10);
    const res = await loginCustomer(clean, otpValue.trim());
    if (!res || !res.success) {
      Alert.alert('Login Failed', res?.message || 'Invalid verification code.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BrandColors.primaryBlue} />

      {/* Blue Top Half (Brand Header) */}
      <View style={styles.topBrandSection}>
        <SafeAreaView edges={['top']} style={styles.brandSafeArea}>
          <SastayuHeroStacked subtitle="One App with 100+ Solutions" />
        </SafeAreaView>
      </View>

      {/* White Bottom Half (Sheet) */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetContainer}>
        <ScrollView
          contentContainerStyle={styles.sheetScroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          {!showOtpInput ? (
            <>
              <Text style={styles.sheetTitle}>Login or Sign up</Text>
              <Text style={styles.sheetSubtitle}>Enter your mobile number to continue</Text>

              {/* Mobile Number Box */}
              <View style={styles.phoneInputRow}>
                <View style={styles.countryCodeBox}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneTextInput}
                  placeholder="98765 43210"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  maxLength={14}
                />
              </View>

              {/* Get OTP Button */}
              <Pressable
                onPress={() => handleGetOtp()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.primaryButtonText}>Get OTP</Text>
              </Pressable>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Service professional?</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Login as Worker Button */}
              <Pressable
                onPress={onSwitchToWorker}
                style={({ pressed }) => [
                  styles.outlineButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.outlineButtonText}>Login as Worker</Text>
              </Pressable>

              {/* Admin Portal Button (Prompt 5: 999999999 / 9999) */}
              <Pressable
                onPress={() => {
                  setPhoneNumber('999999999');
                  setShowOtpInput(true);
                  setOtpValue('9999');
                  Alert.alert(
                    'Admin Credentials Loaded 👑',
                    'Mobile: 999999999\nOTP: 9999\n\nTap "Verify & Login" to enter Sastayu Executive Admin HQ.'
                  );
                }}
                style={styles.adminQuickBtn}>
                <Text style={styles.adminQuickText}>👑 Admin Portal (999999999 / 9999)</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.sheetTitle}>Enter Verification Code</Text>
              <Text style={styles.sheetSubtitle}>
                OTP sent to +91 {phoneNumber} (OTP: 1234)
              </Text>

              <View style={styles.otpInputWrapper}>
                <TextInput
                  style={styles.otpInput}
                  value={otpValue}
                  onChangeText={setOtpValue}
                  keyboardType="number-pad"
                  maxLength={4}
                  autoFocus
                />
              </View>

              <Pressable
                onPress={handleVerifyOtp}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.primaryButtonText}>Verify & Login</Text>
              </Pressable>

              <Pressable
                onPress={() => setShowOtpInput(false)}
                style={styles.backToPhoneButton}>
                <Text style={styles.backToPhoneText}>Change Mobile Number</Text>
              </Pressable>
            </>
          )}

          {/* Footer Terms */}
          <Text style={styles.termsText}>
            By continuing you agree to our Terms and Privacy Policy
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.primaryBlue,
  },
  topBrandSection: {
    flex: 1,
    backgroundColor: BrandColors.primaryBlue,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  brandSafeArea: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    minHeight: 420,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  sheetScroll: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: BrandColors.navyText,
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: BrandColors.mutedText,
    marginBottom: 24,
    fontWeight: '500',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  countryCodeBox: {
    width: 68,
    height: 54,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    borderRightWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.navyText,
  },
  phoneTextInput: {
    flex: 1,
    height: 54,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.navyText,
  },
  primaryButton: {
    backgroundColor: BrandColors.primaryBlue,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 13,
    color: BrandColors.mutedText,
    fontWeight: '500',
  },
  outlineButton: {
    backgroundColor: '#FFFFFF',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BrandColors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: BrandColors.primaryBlue,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  termsText: {
    fontSize: 12,
    color: BrandColors.mutedText,
    textAlign: 'center',
    marginTop: 28,
    lineHeight: 16,
  },
  otpInputWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  otpInput: {
    width: 200,
    height: 56,
    borderWidth: 2,
    borderColor: BrandColors.primaryBlue,
    borderRadius: 14,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 12,
    color: BrandColors.navyText,
    backgroundColor: '#EFF6FF',
  },
  backToPhoneButton: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  backToPhoneText: {
    fontSize: 13,
    color: BrandColors.primaryBlue,
    fontWeight: '600',
  },
  adminQuickBtn: {
    backgroundColor: '#0F172A',
    height: 48,
    borderRadius: 14,
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
