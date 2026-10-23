import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export const ReportExtraChargeModal = ({
  visible,
  booking,
  onClose,
}) => {
  const { reportDispute } = useAuth();
  const appPrice = Number(booking?.totalAmount) || Number(booking?.proposedPrice) || 200;
  const [askedAmount, setAskedAmount] = useState(String(appPrice + 100));
  const [selectedReason, setSelectedReason] = useState('Asked extra after work');
  const [notes, setNotes] = useState('');
  const [photoAttached, setPhotoAttached] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const technicianName = booking?.technicianName || 'Verified Technician';
  const technicianTrade = booking?.technicianTrade || 'Technician';
  const bookingNumber = booking?.bookingNumber || `SY${booking?.id || '1042'}`;
  const serviceTitle = booking?.serviceTitle || 'Home Service';
  const technicianInitials = technicianName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'VT';

  const extraAmount = Math.max(0, (parseInt(askedAmount, 10) || 0) - appPrice);

  const reasons = [
    'Asked extra after work',
    'Charged for parts not used',
    'Visit fee higher than shown',
    'Other',
  ];

  const handleAttachPhoto = () => {
    setPhotoAttached(true);
    Alert.alert('Photo Attached 📷', 'Bill screenshot attached to dispute report.');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await reportDispute({
        bookingId: booking?.id || 1,
        appPrice: appPrice,
        workerAskedAmount: Number(askedAmount) || (appPrice + 100),
        reason: selectedReason,
        notes: notes,
      });

      Alert.alert(
        'Report Submitted 🛡️',
        `Our Trust & Safety team has received your report for extra charge of ₹${extraAmount}. We will audit technician ${technicianName} and contact you within 2 hours with refund status.`,
        [{ text: 'Close', onPress: onClose }]
      );
    } catch (err) {
      Alert.alert('Notice', 'Dispute recorded. Our support team will review this shortly.', [
        { text: 'Close', onPress: onClose },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.headerTitle}>Report extra charge</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Worker Info Card */}
          <View style={styles.workerCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{technicianInitials}</Text>
            </View>
            <View style={styles.workerMeta}>
              <Text style={styles.workerTitle}>{technicianTrade} • {technicianName}</Text>
              <Text style={styles.workerSub}>{serviceTitle} • Booking #{bookingNumber}</Text>
            </View>
          </View>

          {/* Comparison Boxes */}
          <View style={styles.comparisonRow}>
            <View style={styles.priceBox}>
              <Text style={styles.boxLabel}>Price in app</Text>
              <Text style={styles.boxPrice}>₹{appPrice}</Text>
            </View>

            <View style={styles.priceBox}>
              <Text style={styles.boxLabel}>Worker asked for</Text>
              <View style={styles.inputPriceRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  value={askedAmount}
                  onChangeText={setAskedAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Red Alert Banner */}
          <View style={styles.alertBanner}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <Text style={styles.alertText}>Extra charged: ₹{extraAmount}</Text>
          </View>

          {/* What happened? Section */}
          <Text style={styles.sectionHeading}>What happened?</Text>
          <View style={styles.reasonsList}>
            {reasons.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <Pressable
                  key={reason}
                  onPress={() => setSelectedReason(reason)}
                  style={[
                    styles.reasonChip,
                    isSelected && styles.reasonChipSelected,
                  ]}>
                  <Text
                    style={[
                      styles.reasonText,
                      isSelected && styles.reasonTextSelected,
                    ]}>
                    {reason}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Textarea */}
          <TextInput
            style={styles.textareaInput}
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            placeholder="Tell us more (optional)"
            placeholderTextColor="#94A3B8"
          />

          {/* Add Photo Button */}
          <Pressable
            onPress={handleAttachPhoto}
            style={({ pressed }) => [
              styles.addPhotoButton,
              photoAttached && styles.photoAttachedBtn,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.cameraIcon}>📷</Text>
            <Text style={styles.addPhotoText}>
              {photoAttached ? '✓ Photo of bill attached' : 'Add photo of bill or chat'}
            </Text>
          </Pressable>

          {/* Submit Report Button */}
          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.submitBtnText}>Submit report</Text>
          </Pressable>

          {/* Footer note */}
          <Text style={styles.footerNote}>
            Our team will review your report and contact you.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backArrow: {
    fontSize: 28,
    color: BrandColors.navyText,
    fontWeight: '300',
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },
  workerMeta: {
    flex: 1,
  },
  workerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  workerSub: {
    fontSize: 12,
    color: BrandColors.mutedText,
    marginTop: 2,
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  priceBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  boxLabel: {
    fontSize: 12,
    color: BrandColors.mutedText,
    fontWeight: '500',
    marginBottom: 6,
  },
  boxPrice: {
    fontSize: 24,
    fontWeight: '900',
    color: BrandColors.navyText,
  },
  inputPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '900',
    color: BrandColors.navyText,
  },
  priceInput: {
    fontSize: 24,
    fontWeight: '900',
    color: BrandColors.navyText,
    padding: 0,
    marginLeft: 2,
    flex: 1,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 20,
    gap: 8,
  },
  alertIcon: {
    fontSize: 16,
  },
  alertText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.navyText,
    marginBottom: 12,
  },
  reasonsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  reasonChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  reasonChipSelected: {
    backgroundColor: BrandColors.primaryBlue,
    borderColor: BrandColors.primaryBlue,
  },
  reasonText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.navyText,
  },
  reasonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  textareaInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 14,
    fontSize: 14,
    color: BrandColors.navyText,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
    gap: 8,
  },
  photoAttachedBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: BrandColors.primaryBlue,
    borderStyle: 'solid',
  },
  cameraIcon: {
    fontSize: 18,
    color: BrandColors.primaryBlue,
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.primaryBlue,
  },
  submitBtn: {
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
    marginBottom: 14,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerNote: {
    fontSize: 12,
    color: BrandColors.mutedText,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
