import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { audioService } from '@/services/audioService';
import { BrandColors } from '@/constants/theme';
import { API_BASE_URL } from '@/services/api';

export const RequestDetailsModal = ({
  visible,
  request,
  onClose,
  onAccept,
  onDecline,
  onCounter,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  useEffect(() => {
    return () => {
      audioService.stopVoiceNote().catch(() => {});
    };
  }, []);

  // Reset audio when modal closes
  useEffect(() => {
    if (!visible) {
      audioService.stopVoiceNote().catch(() => {});
      setIsPlayingAudio(false);
      setAudioProgress(0);
    }
  }, [visible, request]);

  const reqData = request || {
    id: 'req-jaldi-1',
    trade: 'Electrician',
    problem: 'Fan not working',
    customerName: 'Customer',
    customerRating: '5.0',
    distance: '1.2 km away',
    area: 'Nearby Customer Area',
    note: 'Customer problem description.',
    price: 149,
    expiresIn: '5:00',
    isEmergency: false,
    voiceNoteUrl: null,
  };

  const handleToggleAudio = async () => {
    if (isPlayingAudio) {
      await audioService.stopVoiceNote();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      const res = await audioService.playVoiceNote(reqData.voiceNoteUrl, {
        onProgress: (p) => setAudioProgress(p),
        onFinish: () => {
          setIsPlayingAudio(false);
          setAudioProgress(0);
        },
        onError: () => {
          setIsPlayingAudio(false);
        },
      });
      if (!res.success) {
        setIsPlayingAudio(false);
      }
    }
  };

  const handleCounterPress = () => {
    Alert.prompt
      ? Alert.prompt(
          'Propose Counter Quote',
          `Customer offered ₹${reqData.price}. Enter your counter price:`,
          (newPrice) => {
            if (!newPrice || isNaN(Number(newPrice))) return;
            Alert.prompt(
              'Reason for Counter Price',
              'Why is the extra charge needed? (e.g. Ladder or replacement capacitor needed):',
              (reason) => {
                if (onCounter) onCounter(reqData, Number(newPrice), reason || 'Additional work/parts required');
                onClose();
              }
            );
          },
          'plain-text',
          String(Number(reqData.price) + 50)
        )
      : Alert.alert(
          'Send Counter Offer (+₹50)',
          `Customer offered ₹${reqData.price}. Propose counter-offer of ₹${Number(reqData.price) + 50}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: `Send ₹${Number(reqData.price) + 50}`,
              onPress: () => {
                if (onCounter) onCounter(reqData, Number(reqData.price) + 50, 'Additional work/parts required');
                onClose();
              },
            },
          ]
        );
  };

  const handleAcceptPress = () => {
    if (onAccept) onAccept(reqData);
  };

  const handleDeclinePress = () => {
    Alert.alert('Decline Request', 'Are you sure? This request will be offered to another partner.', [
      { text: 'Keep' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => {
          if (onDecline) onDecline(reqData);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Top Header Bar matching Screenshot 3 */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.headerTitle}>Request details</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Top Pill Badges matching Screenshot 3 */}
          <View style={styles.badgesRow}>
            <View style={reqData.isEmergency ? styles.jaldiPill : styles.normalBookingPill}>
              <Text style={styles.jaldiLightning}>{reqData.isEmergency ? '⚡' : '📅'}</Text>
              <Text style={reqData.isEmergency ? styles.jaldiText : styles.normalBookingText}>
                {reqData.isEmergency ? 'JALDI CHAHIYE' : 'NORMAL BOOKING'}
              </Text>
            </View>

            <View style={styles.timerRow}>
              <Text style={styles.clockIcon}>⏱</Text>
              <Text style={styles.timerText}>Expires in {reqData.expiresIn}</Text>
            </View>
          </View>

          {/* Service Title */}
          <Text style={styles.serviceTitle}>
            {reqData.trade} · {reqData.problem}
          </Text>

          {/* Customer Card matching Screenshot 3 */}
          <View style={styles.customerCard}>
            <View style={styles.customerHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{reqData.customerName ? reqData.customerName.charAt(0).toUpperCase() : 'C'}</Text>
              </View>
              <View style={styles.customerMeta}>
                <Text style={styles.customerName}>{reqData.customerName || 'Customer'}</Text>
                <Text style={styles.customerRating}>
                  Customer · Rating {reqData.customerRating || '5.0'}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <View style={styles.infoTextCol}>
                <Text style={styles.locationTitle}>
                  {reqData.distance} · {reqData.area || 'Nearby Customer Area'}
                </Text>
                <Text style={styles.locationSub}>
                  Full address & direct calling unlock after you accept
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>💳</Text>
              <View style={styles.infoTextCol}>
                <Text style={styles.locationTitle}>
                  {reqData.paymentMode === 'upi'
                    ? (reqData.paymentStatus === 'paid' ? '✓ Paid via UPI (₹' + reqData.price + ')' : '⏳ UPI Payment Incomplete')
                    : '💵 Pay on Delivery (₹' + reqData.price + ')'}
                </Text>
                <Text style={styles.locationSub}>
                  {reqData.paymentMode === 'upi' && reqData.paymentStatus !== 'paid'
                    ? 'Customer has not completed UPI payment yet'
                    : 'Collect payment directly from customer after work is done'}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>⏱</Text>
              <Text style={styles.neededText}>
                Needed: {reqData.isEmergency ? 'Now (Jaldi Chahiye)' : (reqData.scheduledDate ? `${reqData.scheduledDate} • ${reqData.scheduledSlot || 'ASAP'}` : 'Scheduled Service')}
              </Text>
            </View>
          </View>

          {/* Customer Voice Note Audio Player (In-App Only - Max 30s) */}
          {reqData.voiceNoteUrl ? (
            <View style={styles.voiceNoteCard}>
              <View style={styles.voiceNoteTopRow}>
                <View style={styles.voiceNoteIconCircle}>
                  <Text style={styles.micEmoji}>🎙️</Text>
                </View>
                <View style={styles.voiceNoteMeta}>
                  <Text style={styles.voiceNoteTitle}>Customer Voice Note</Text>
                  <Text style={styles.voiceNoteSub}>In-app player (Max 30s limit)</Text>
                </View>
                <Pressable
                  onPress={handleToggleAudio}
                  style={[styles.playAudioBtn, isPlayingAudio && styles.playAudioBtnActive]}>
                  <Text style={styles.playAudioIcon}>{isPlayingAudio ? '⏸️' : '▶️'}</Text>
                  <Text style={styles.playAudioText}>{isPlayingAudio ? 'Pause' : 'Play'}</Text>
                </Pressable>
              </View>

              <View style={styles.waveformContainer}>
                {[6, 14, 22, 16, 8, 20, 26, 12, 24, 10, 18, 28, 14, 20, 8].map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveformBar,
                      {
                        height: isPlayingAudio ? Math.min(28, h + ((i * audioProgress * 3) % 12)) : h,
                        backgroundColor: isPlayingAudio ? '#F59E0B' : '#CBD5E1',
                      },
                    ]}
                  />
                ))}
                <Text style={styles.audioDurationText}>
                  {isPlayingAudio
                    ? `00:${String(Math.min(30, Math.floor(audioProgress * 30))).padStart(2, '0')} / 00:30`
                    : '00:30'}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Customer Note Card matching Screenshot 3 */}
          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>Customer note</Text>
            <Text style={styles.noteBody}>{reqData.note || 'No specific notes added.'}</Text>
          </View>

          {/* Visit Charge Bar matching Screenshot 3 */}
          <View style={styles.priceBar}>
            <Text style={styles.priceKey}>Visit charge</Text>
            <Text style={styles.priceVal}>₹{reqData.price}</Text>
          </View>

          {/* Yellow Warning Banner matching Screenshot 3 */}
          <View style={styles.warningBanner}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              Do not ask the customer for extra money. Customers can report extra charges.
            </Text>
          </View>
        </ScrollView>

        {/* Token Coin Fee Notice */}
        <View style={styles.tokenPillRow}>
          <Text style={styles.tokenPillText}>
            🪙 Token Fee: {Math.max(1, Math.round(Number(reqData.price || 200) * 0.20))} Coins (20%) • First 2 bookings FREE • Limit -50
          </Text>
        </View>

        {/* Fixed Bottom Action Buttons */}
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>

          <Pressable
            onPress={handleDeclinePress}
            style={({ pressed }) => [
              styles.declineBtn,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.declineBtnText}>Decline</Text>
          </Pressable>

          <Pressable
            onPress={handleCounterPress}
            style={({ pressed }) => [
              styles.counterBtn,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.counterBtnText}>Counter (+₹50)</Text>
          </Pressable>

          <Pressable
            onPress={handleAcceptPress}
            style={({ pressed }) => [
              styles.acceptBtn,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.acceptBtnText}>Accept ₹{reqData.price}</Text>
          </Pressable>
        </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backChevron: {
    fontSize: 28,
    color: '#0F172A',
    fontWeight: '300',
    lineHeight: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  jaldiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBBF24',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  jaldiLightning: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: 'bold',
  },
  jaldiText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clockIcon: {
    fontSize: 13,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  serviceTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },
  customerMeta: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  customerRating: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  infoTextCol: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  locationSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  neededText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  noteLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 6,
  },
  noteBody: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
    fontWeight: '500',
  },
  priceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  priceKey: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  priceVal: {
    fontSize: 20,
    fontWeight: '900',
    color: BrandColors.primaryBlue,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  declineBtn: {
    flex: 0.9,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },
  counterBtn: {
    flex: 1.2,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  acceptBtn: {
    flex: 1.4,
    height: 52,
    borderRadius: 12,
    backgroundColor: BrandColors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  normalBookingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  normalBookingText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  voiceNoteCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    marginBottom: 14,
  },
  voiceNoteTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voiceNoteIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micEmoji: {
    fontSize: 20,
  },
  voiceNoteMeta: {
    flex: 1,
  },
  voiceNoteTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  voiceNoteSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  playAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  playAudioBtnActive: {
    backgroundColor: '#DC2626',
  },
  playAudioIcon: {
    fontSize: 12,
  },
  playAudioText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    gap: 4,
  },
  waveformBar: {
    width: 4,
    borderRadius: 2,
  },
  audioDurationText: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  tokenPillRow: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    textAlign: 'center',
  },
});

