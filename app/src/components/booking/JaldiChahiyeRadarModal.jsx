import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Alert,
  Animated,
  Easing,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Linking,
  AppState,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { bookingsAPI } from '@/services/api';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';

const EMERGENCY_CATEGORIES = ['Electrician', 'Plumber', 'AC Repair', 'Appliance', 'Carpenter'];

export const JaldiChahiyeRadarModal = ({
  visible,
  serviceName,
  onClose,
  onSuccess,
}) => {
  const { userLocation, authToken, refreshBookings } = useAuth();

  // Step 1: Input details, Step 2: Live Radar Search (Wait for real worker), Step 3: Worker Matched
  const [step, setStep] = useState('input'); // 'input' | 'radar' | 'matched'
  const [category, setCategory] = useState(serviceName || 'Electrician');
  const [issueText, setIssueText] = useState('');
  const [emergencyPrice, setEmergencyPrice] = useState('249');
  const [voiceAttached, setVoiceAttached] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [matchedPartner, setMatchedPartner] = useState(null);

  // Payment Method: Default to 'cash' (Pay After Service / Cash on Delivery)
  const paymentMethod = 'cash';
  const [alertConfig, setAlertConfig] = useState(null);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      setStep('input');
      setActiveBookingId(null);
      setMatchedPartner(null);
      setVoiceAttached(false);
      setIsSubmitting(false);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }
    setCategory(serviceName || 'Electrician');
  }, [visible, serviceName]);

  // Radar Pulse Animation
  useEffect(() => {
    if (step !== 'radar') return;

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [step]);

  // Live real-time polling to check if a REAL worker has accepted the Jaldi request (NO AUTO-ACCEPT!)
  useEffect(() => {
    if (step !== 'radar' || !activeBookingId) return;

    const checkAcceptance = async () => {
      try {
        const res = await bookingsAPI.getBookingById(activeBookingId);
        if (res && res.success && res.booking) {
          const b = res.booking;
          // When a real worker accepts, status changes to 'accepted' or 'in_progress'
          if (b.status === 'accepted' || b.status === 'in_progress') {
            setMatchedPartner({
              id: b.worker_id,
              name: b.worker_name || 'Verified Technician',
              phone: b.worker_phone || '',
              trade: b.worker_trade || category,
              rating: Number(b.worker_rating) || 5.0,
              distanceLabel: '0.8 km away',
            });
            setStep('matched');
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            refreshBookings();
          }
        }
      } catch (err) {
        // Silent retry
      }
    };

    // Check immediately and then every 2 seconds
    checkAcceptance();
    pollIntervalRef.current = setInterval(checkAcceptance, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [step, activeBookingId]);

  const executeBroadcast = async () => {
    setIsSubmitting(true);
    const priceNum = Number(emergencyPrice) || 249;
    try {
      const res = await bookingsAPI.createBooking(
        {
          serviceTitle: `${category} · Jaldi Chahiye ⚡`,
          serviceType: 'jaldi',
          trade: category,
          workerId: null, // Broadcast to all nearby workers matching this trade
          totalAmount: priceNum,
          proposedPrice: priceNum,
          customerNotes: issueText.trim() || 'Urgent 10m Jaldi Chahiye Request',
          issueDetails: issueText.trim() || 'Immediate assistance needed',
          address: userLocation || 'Sector 14, Gurugram, Delhi NCR',
          etaMinutes: 10,
          isEmergency: true,
          voiceNoteUrl: voiceAttached ? `voice_jaldi_${Date.now()}.wav` : null,
          paymentMethod: 'cash',
          paymentMode: 'cash',
          paymentStatus: 'pending',
          transactionId: null,
        },
        authToken
      );

      if (res && res.success && res.booking) {
        setActiveBookingId(res.booking.id);
        setStep('radar');
        refreshBookings();
      } else {
        setAlertConfig({
          type: 'error',
          title: 'Notice',
          message: res?.message || 'Could not send emergency request. Please try again.',
        });
      }
    } catch (err) {
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: err.message || 'Network error while broadcasting request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start real broadcast with Cash on Delivery
  const handleStartBroadcast = async () => {
    if (!issueText.trim() && !voiceAttached) {
      setAlertConfig({
        type: 'warning',
        title: 'Emergency Description',
        message: 'Please enter a short description of what happened or record a voice note.',
      });
      return;
    }

    executeBroadcast();
  };

  // Cancel search if customer changes their mind
  const handleCancelSearch = () => {
    setAlertConfig({
      type: 'confirm',
      title: 'Cancel Search?',
      message: 'Are you sure you want to stop searching for nearby technicians?',
      primaryText: 'Yes, Cancel Search',
      onPrimary: async () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (activeBookingId) {
          try {
            await bookingsAPI.updateStatus(activeBookingId, 'cancelled', authToken);
            refreshBookings();
          } catch (e) {}
        }
        setStep('input');
        onClose();
      },
      secondaryText: 'Keep Searching',
    });
  };

  const handleDone = () => {
    onClose();
    if (onSuccess) onSuccess();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header with clean normal theme */}
        <View style={styles.header}>
          <Pressable
            onPress={step === 'radar' ? handleCancelSearch : onClose}
            style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
            <View>
              <Text style={styles.headerTitle}>Jaldi Chahiye • 10m Fixer ⚡</Text>
              <Text style={styles.headerSubtitle}>
                {step === 'input'
                  ? 'Instant Emergency Dispatch'
                  : step === 'radar'
                  ? 'Broadcasting to nearest online technicians...'
                  : 'Technician Assigned!'}
              </Text>
            </View>
          </Pressable>
        </View>

        {step === 'input' ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Express Emergency Notice */}
            <View style={styles.expressNotice}>
              <View style={styles.lightningIconBox}>
                <Text style={styles.lightningEmoji}>⚡</Text>
              </View>
              <View style={styles.noticeTextCol}>
                <Text style={styles.noticeTitle}>Priority Emergency Dispatch</Text>
                <Text style={styles.noticeSub}>
                  Sent live to verified nearby partners. First partner to accept gets dispatched immediately. No auto-accept; only real professionals.
                </Text>
              </View>
            </View>

            {/* Category Selector */}
            <Text style={styles.fieldLabel}>1. Select Emergency Service</Text>
            <View style={styles.categoriesRow}>
              {EMERGENCY_CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[styles.categoryChip, category === c && styles.categoryChipActive]}>
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === c && styles.categoryChipTextActive,
                    ]}>
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Issue Description */}
            <Text style={styles.fieldLabel}>2. What happened? (Issue Description)</Text>
            <TextInput
              style={styles.issueInput}
              placeholder="e.g. Main MCB burnt, no electricity in house / Pipe leaking heavily..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={issueText}
              onChangeText={setIssueText}
            />

            {/* Quick Voice Note */}
            <Text style={styles.fieldLabel}>3. Voice Note (Optional)</Text>
            <View style={styles.voiceNoteCard}>
              <Pressable
                onPress={() => {
                  if (!isRecording) {
                    setIsRecording(true);
                    setTimeout(() => {
                      setIsRecording(false);
                      setVoiceAttached(true);
                    }, 2500);
                  } else {
                    setIsRecording(false);
                    setVoiceAttached(true);
                  }
                }}
                style={[
                  styles.voiceBtn,
                  isRecording && styles.voiceBtnRecording,
                  voiceAttached && styles.voiceBtnAttached,
                ]}>
                <Text style={styles.voiceBtnEmoji}>
                  {isRecording ? '⏹' : voiceAttached ? '✓' : '🎙️'}
                </Text>
              </Pressable>
              <View style={styles.voiceMeta}>
                <Text style={styles.voiceTitle}>
                  {isRecording
                    ? 'Recording emergency note...'
                    : voiceAttached
                    ? 'Voice Note Attached (00:06)'
                    : 'Tap to record audio explanation'}
                </Text>
                <Text style={styles.voiceSub}>Technician will listen before arrival</Text>
              </View>
            </View>

            {/* Offered Price */}
            <Text style={styles.fieldLabel}>4. Emergency Offered Price</Text>
            <View style={styles.priceCard}>
              <View style={styles.priceRow}>
                <Text style={styles.priceCurrency}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  value={emergencyPrice}
                  onChangeText={setEmergencyPrice}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
              <Text style={styles.priceHint}>
                Includes 10-minute priority dispatch & initial inspection visit.
              </Text>
            </View>

            {/* 5. Payment Mode: Pay After Service */}
            <Text style={styles.fieldLabel}>5. Payment: Pay After Service 💵</Text>
            <View style={styles.paymentCardActiveSole}>
              <View style={styles.paymentCardHeader}>
                <View style={styles.paymentRowLeft}>
                  <Text style={styles.paymentIcon}>💵</Text>
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.paymentTitle}>Pay After Service</Text>
                    <Text style={styles.paymentBadgeActiveText}>✓ Cash on Delivery</Text>
                  </View>
                </View>
                <View style={styles.paymentSelectedCheck}>
                  <Text style={styles.paymentCheckMark}>✓</Text>
                </View>
              </View>
              <Text style={styles.paymentSub}>
                Pay ₹{emergencyPrice || '249'} directly to the technician in Cash or UPI once emergency work is completed.
              </Text>
            </View>

            {/* Broadcast Button */}
            <Pressable
              onPress={handleStartBroadcast}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.broadcastBtn,
                pressed && styles.btnPressed,
                isSubmitting && { opacity: 0.7 },
              ]}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.broadcastBtnText}>
                  Broadcast 10m Fixer (Pay ₹{emergencyPrice || '249'} on Delivery) →
                </Text>
              )}
            </Pressable>
          </ScrollView>
        ) : step === 'radar' ? (
          /* Step 2: Live Real-Time Sonar Radar (Waiting for real acceptance) */
          <View style={styles.radarContainer}>
            <View style={styles.radarCenter}>
              {/* Animated Ripple Rings */}
              <Animated.View
                style={[
                  styles.rippleRing,
                  {
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 3.0],
                        }),
                      },
                    ],
                    opacity: pulseAnim.interpolate({
                      inputRange: [0, 0.8, 1],
                      outputRange: [0.6, 0.2, 0],
                    }),
                  },
                ]}
              />

              {/* Core Radar Beacon */}
              <View style={styles.coreBulb}>
                <Text style={styles.coreBulbEmoji}>⚡</Text>
              </View>
            </View>

            <View style={styles.radarTextSection}>
              <Text style={styles.radarMainTitle}>Searching for Nearby {category}s...</Text>
              <Text style={styles.radarSubtitle}>
                Broadcasting your emergency request to online technicians within 1km – 5km.
              </Text>

              <View style={styles.pingPill}>
                <ActivityIndicator size="small" color={BrandColors.primaryBlue} />
                <Text style={styles.pingText}>Waiting for a technician to accept...</Text>
              </View>

              <Text style={styles.radarFootnote}>
                First verified technician to accept will be dispatched immediately. No auto-accept.
              </Text>

              {/* Cancel Button */}
              <Pressable onPress={handleCancelSearch} style={styles.cancelSearchBtn}>
                <Text style={styles.cancelSearchText}>✕ Cancel Search</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* Step 3: Partner Matched & Accepted */
          <View style={styles.matchedContainer}>
            <View style={styles.matchedCard}>
              <View style={styles.acceptedIconCircle}>
                <Text style={styles.acceptedEmoji}>✓</Text>
              </View>

              <Text style={styles.matchedTitle}>Partner Accepted! ⚡</Text>
              <Text style={styles.matchedSubtitle}>
                Your 10m Fixer emergency request has been locked.
              </Text>

              <View style={styles.partnerInfoBox}>
                <Text style={styles.partnerName}>{matchedPartner?.name || 'Verified Technician'}</Text>
                <Text style={styles.partnerDistance}>
                  📍 {matchedPartner?.distanceLabel || '0.8 km away'} • ETA ~10 Mins
                </Text>
                <Text style={styles.partnerPrice}>Agreed Price: ₹{emergencyPrice}</Text>
              </View>

              <Pressable onPress={handleDone} style={styles.trackButton}>
                <Text style={styles.trackButtonText}>View & Call in Bookings Tab →</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Global Custom Alert Dialog */}
        {alertConfig && (
          <CustomAlertModal
            visible={Boolean(alertConfig)}
            {...alertConfig}
            onClose={() => setAlertConfig(null)}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backArrow: {
    fontSize: 28,
    fontWeight: '700',
    color: BrandColors.primaryBlue,
    marginTop: -3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  expressNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginBottom: 20,
    gap: 12,
  },
  lightningIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightningEmoji: {
    fontSize: 22,
  },
  noticeTextCol: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: BrandColors.primaryBlue,
    marginBottom: 2,
  },
  noticeSub: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    marginTop: 4,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: BrandColors.primaryBlue,
    borderColor: BrandColors.primaryBlue,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  issueInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    padding: 14,
    fontSize: 14,
    color: '#0F172A',
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  voiceNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 16,
  },
  voiceBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: BrandColors.primaryBlue,
  },
  voiceBtnRecording: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  voiceBtnAttached: {
    borderColor: '#10B981',
    backgroundColor: '#D1FAE5',
  },
  voiceBtnEmoji: {
    fontSize: 20,
  },
  voiceMeta: {
    flex: 1,
  },
  voiceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  voiceSub: {
    fontSize: 11,
    color: '#64748B',
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceCurrency: {
    fontSize: 24,
    fontWeight: '900',
    color: BrandColors.primaryBlue,
    marginRight: 6,
  },
  priceInput: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    flex: 1,
  },
  priceHint: {
    fontSize: 11,
    color: '#64748B',
  },
  broadcastBtn: {
    backgroundColor: BrandColors.primaryBlue,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  broadcastBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  paymentCardActiveSole: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    marginBottom: 20,
  },
  paymentRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentSelectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentCheckMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  paymentBadgeActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    marginTop: 2,
  },
  radarContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
  },
  radarCenter: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  rippleRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderWidth: 2,
    borderColor: BrandColors.primaryBlue,
  },
  coreBulb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BrandColors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  coreBulbEmoji: {
    fontSize: 36,
    color: '#FFFFFF',
  },
  radarTextSection: {
    alignItems: 'center',
    width: '100%',
  },
  radarMainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  radarSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 18,
  },
  pingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  pingText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primaryBlue,
  },
  radarFootnote: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 280,
  },
  cancelSearchBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#FFFFFF',
  },
  cancelSearchText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
  matchedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
  },
  matchedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  acceptedIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  acceptedEmoji: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  matchedTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  matchedSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
    textAlign: 'center',
  },
  partnerInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  partnerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  partnerDistance: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primaryBlue,
    marginBottom: 4,
  },
  partnerPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  trackButton: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    height: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
