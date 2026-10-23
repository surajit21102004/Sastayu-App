import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Linking,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { bookingsAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const SASTAYU_UPI_ID = '8910710493-2@ybl';
const SASTAYU_MERCHANT_NAME = 'Sastayu Services';

export const UpiPaymentModal = ({
  visible,
  booking,
  onClose,
  onPaymentSuccess,
}) => {
  const { authToken } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState('upi'); // 'upi' | 'cash'
  const [utrNumber, setUtrNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const amount = Number(booking?.totalAmount) || Number(booking?.proposedPrice) || 500;
  const bookingNumber = booking?.bookingNumber || `SY${booking?.id || '1042'}`;
  const technicianName = booking?.technicianName || 'Technician';
  const serviceTitle = booking?.serviceTitle || 'Home Service';

  // Standard NPCI UPI URI
  const upiUrl = `upi://pay?pa=${SASTAYU_UPI_ID}&pn=${encodeURIComponent(
    SASTAYU_MERCHANT_NAME
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Sastayu Booking ${bookingNumber}`)}`;

  // Handle opening installed UPI Apps (Google Pay, PhonePe, Paytm, BHIM)
  const handleOpenUpiApp = async (scheme = 'upi') => {
    let targetUrl = upiUrl;

    if (scheme === 'phonepe') {
      targetUrl = `phonepe://upi/pay?pa=${SASTAYU_UPI_ID}&pn=${encodeURIComponent(
        SASTAYU_MERCHANT_NAME
      )}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Sastayu ${bookingNumber}`)}`;
    } else if (scheme === 'gpay') {
      targetUrl = `tez://upi/pay?pa=${SASTAYU_UPI_ID}&pn=${encodeURIComponent(
        SASTAYU_MERCHANT_NAME
      )}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Sastayu ${bookingNumber}`)}`;
    } else if (scheme === 'paytm') {
      targetUrl = `paytmmp://upi/pay?pa=${SASTAYU_UPI_ID}&pn=${encodeURIComponent(
        SASTAYU_MERCHANT_NAME
      )}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Sastayu ${bookingNumber}`)}`;
    }

    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
      } else {
        // Fallback to generic upi://
        await Linking.openURL(upiUrl);
      }
    } catch (err) {
      // In simulator / browser, inform user
      Alert.alert(
        'UPI App Link',
        `Ready to pay ₹${amount} to ${SASTAYU_UPI_ID}.\n\nIf your UPI app didn't open automatically, you can scan the QR code below or send to UPI ID: ${SASTAYU_UPI_ID}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleCopyUpi = () => {
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 3000);
    Alert.alert('UPI ID Copied! 📋', `${SASTAYU_UPI_ID}\n\nPaste in your UPI app to complete payment of ₹${amount}.`);
  };

  const handleConfirmUpiPayment = async () => {
    setIsSubmitting(true);
    try {
      const res = await bookingsAPI.confirmPayment(
        booking?.id,
        'upi',
        amount,
        utrNumber.trim() || undefined,
        authToken
      );

      if (res && res.success) {
        Alert.alert(
          'Payment Confirmed! 🎉',
          `₹${amount} paid successfully via UPI to Sastayu Services.\nTransaction ID: ${res.booking?.transaction_id || 'Recorded'}\n\nThank you for choosing Sastayu!`,
          [
            {
              text: 'Done',
              onPress: () => {
                onClose();
                if (onPaymentSuccess) onPaymentSuccess('upi', amount);
              },
            },
          ]
        );
      } else {
        Alert.alert('Notice', res?.message || 'Could not verify payment.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCashPayment = async () => {
    setIsSubmitting(true);
    try {
      const res = await bookingsAPI.confirmPayment(
        booking?.id,
        'cash',
        amount,
        undefined,
        authToken
      );

      if (res && res.success) {
        Alert.alert(
          'Cash Payment Selected 💵',
          `Please hand ₹${amount} in cash directly to ${technicianName}.\n\nBooking marked as paid in cash.`,
          [
            {
              text: 'Done',
              onPress: () => {
                onClose();
                if (onPaymentSuccess) onPaymentSuccess('cash', amount);
              },
            },
          ]
        );
      } else {
        Alert.alert('Notice', res?.message || 'Could not record cash payment.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.headerTitle}>Pay for Service</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Bill Summary Card */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Total Amount to Pay</Text>
            <Text style={styles.amountValue}>₹{amount}</Text>
            <View style={styles.servicePill}>
              <Text style={styles.servicePillText}>
                {serviceTitle} • {bookingNumber}
              </Text>
            </View>
          </View>

          {/* CASH PAYMENT ONLY */}
          <View style={styles.cashContainer}>
            <View style={styles.cashCard}>
              <View style={styles.cashIconCircle}>
                <Text style={styles.cashEmoji}>💵</Text>
              </View>
              <Text style={styles.cashHeading}>Pay Cash on Service</Text>
              <Text style={styles.cashAmount}>₹{amount}</Text>
              <Text style={styles.cashInstructions}>
                Please pay exact cash of ₹{amount} to partner{' '}
                <Text style={styles.boldTech}>{technicianName}</Text> after your work
                is completely done.
              </Text>

              <View style={styles.cashSecurityBadge}>
                <Text style={styles.shieldIcon}>🛡️</Text>
                <Text style={styles.securityText}>
                  100% Sastayu Guarantee • Never pay more than the app bill
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleConfirmCashPayment}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.confirmCashBtn,
                (pressed || isSubmitting) && styles.btnPressed,
              ]}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmCashBtnText}>
                  Confirm Cash Payment (₹{amount}) ✓
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backArrow: {
    fontSize: 28,
    fontWeight: '700',
    color: BrandColors.primaryBlue,
    marginTop: -3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  amountCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  amountLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FACC15',
    marginBottom: 8,
  },
  servicePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  servicePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
    gap: 4,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  methodTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabEmoji: {
    fontSize: 16,
  },
  methodTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  methodTabTextActive: {
    color: '#0F172A',
  },
  upiContainer: {
    gap: 14,
  },
  payNowBtn: {
    backgroundColor: '#059669',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payNowBtnText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  payNowSubtext: {
    fontSize: 11,
    color: '#D1FAE5',
    fontWeight: '600',
  },
  appsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  appChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  appIconText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  upiIdCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  upiIdMeta: {
    flex: 1,
  },
  upiIdLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  upiIdText: {
    fontSize: 15,
    fontWeight: '900',
    color: BrandColors.primaryBlue,
    marginBottom: 2,
  },
  merchantName: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  copyBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  qrImage: {
    width: 190,
    height: 190,
    borderRadius: 8,
    marginBottom: 10,
  },
  qrHelper: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  confirmSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  confirmHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  confirmDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  utrInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 12,
  },
  confirmPaidBtn: {
    backgroundColor: BrandColors.primaryBlue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmPaidBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cashContainer: {
    gap: 16,
  },
  cashCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  cashIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cashEmoji: {
    fontSize: 32,
  },
  cashHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  cashAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: '#15803D',
    marginBottom: 12,
  },
  cashInstructions: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  boldTech: {
    fontWeight: '800',
    color: '#0F172A',
  },
  cashSecurityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shieldIcon: {
    fontSize: 14,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  confirmCashBtn: {
    backgroundColor: '#15803D',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmCashBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.85,
  },
});
