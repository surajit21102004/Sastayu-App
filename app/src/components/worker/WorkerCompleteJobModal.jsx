import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { bookingsAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export const WorkerCompleteJobModal = ({
  visible,
  booking,
  onClose,
  onSuccess,
}) => {
  const { authToken } = useAuth();
  const [enteredOtp, setEnteredOtp] = useState('');
  const [partsCharge, setPartsCharge] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customerName = booking?.customerName || booking?.userName || 'Customer';
  const serviceTitle = booking?.title || booking?.serviceTitle || 'Home Service';
  const agreedPrice = booking?.price || booking?.totalAmount || 200;

  const handleVerifyAndComplete = async () => {
    const cleanOtp = enteredOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 4) {
      Alert.alert(
        '4-Digit OTP Required',
        'Please enter the 4-digit completion code provided by the customer.'
      );
      return;
    }

    const partsNum = Number(partsCharge) || 0;
    if (isNaN(partsNum) || partsNum < 0) {
      Alert.alert('Invalid Charge', 'Please enter a valid amount for extra parts or 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await bookingsAPI.completeBooking(
        booking?.id,
        cleanOtp,
        partsNum,
        authToken
      );

      if (res && res.success) {
        Alert.alert(
          'Job Completed! 🎉',
          `OTP verified successfully.\nTotal amount: ₹${res.totalAmount || (Number(agreedPrice) + partsNum)}.\n\nPayment has been settled into your partner balance.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setEnteredOtp('');
                setPartsCharge('0');
                onClose();
                if (onSuccess) onSuccess(booking, res.totalAmount);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'OTP Verification Failed ❌',
          res?.message || 'Invalid completion OTP. Please ask customer to check their booking screen.'
        );
      }
    } catch (err) {
      Alert.alert(
        'Verification Error',
        err.message || 'Could not verify OTP. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Text style={styles.headerIcon}>🔑</Text>
            </View>
            <Text style={styles.title}>Verify Completion OTP</Text>
            <Text style={styles.subtitle}>
              Ask {customerName} for the 4-digit code shown on their Sastayu screen to finalize the job.
            </Text>
          </View>

          {/* Job Summary */}
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service</Text>
              <Text style={styles.summaryVal} numberOfLines={1}>{serviceTitle}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Agreed Price</Text>
              <Text style={styles.summaryPrice}>₹{agreedPrice}</Text>
            </View>
          </View>

          {/* 4-Digit OTP Input */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>Customer Completion OTP (4 Digits)</Text>
            <TextInput
              style={styles.otpInput}
              value={enteredOtp}
              onChangeText={(val) => setEnteredOtp(val.replace(/\D/g, '').slice(0, 4))}
              placeholder="• • • •"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={4}
              autoFocus={true}
            />
          </View>

          {/* Optional Extra Parts Charge */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>New Parts / Extra Materials (₹, Optional)</Text>
            <TextInput
              style={styles.chargeInput}
              value={partsCharge}
              onChangeText={(val) => setPartsCharge(val.replace(/\D/g, ''))}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
            />
          </View>

          {/* Buttons */}
          <View style={styles.actionsRow}>
            <Pressable
              onPress={onClose}
              disabled={isSubmitting}
              style={[styles.cancelBtn, isSubmitting && styles.btnDisabled]}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleVerifyAndComplete}
              disabled={isSubmitting}
              style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Verify & Complete ✓</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  headerIcon: {
    fontSize: 26,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    maxWidth: '65%',
  },
  summaryPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },
  fieldSection: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  otpInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    height: 54,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 12,
    color: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  chargeInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  submitBtn: {
    flex: 1.6,
    height: 48,
    borderRadius: 12,
    backgroundColor: BrandColors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
