import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { audioService } from '@/services/audioService';
import { BrandColors, BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { API_BASE_URL } from '@/services/api';

export const WorkerBookingsView = ({
  workerBookings = [],
  onMarkJobComplete,
  onStartWork,
  onAcceptBooking,
  onCounterBooking,
  onNavigateMap,
  onCallCustomer,
}) => {
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'upcoming' | 'completed'
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [audioTimer, setAudioTimer] = useState(0);

  useEffect(() => {
    return () => {
      audioService.stopVoiceNote().catch(() => {});
    };
  }, []);

  const handleTogglePlayAudio = async (booking) => {
    if (playingAudioId === booking.id) {
      await audioService.stopVoiceNote();
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(booking.id);
      const res = await audioService.playVoiceNote(booking.voiceNoteUrl, {
        onProgress: (p, currentSec) => setAudioTimer(Math.round(currentSec || p * 30)),
        onFinish: () => {
          setPlayingAudioId(null);
          setAudioTimer(0);
        },
        onError: () => {
          setPlayingAudioId(null);
        },
      });
      if (!res.success) {
        setPlayingAudioId(null);
      }
    }
  };

  const filtered = workerBookings.filter((item) => {
    if (activeTab === 'today') {
      // Show all active ongoing/ready/pending jobs or any job scheduled for Today
      return (
        item.status === 'in_progress' ||
        item.status === 'accepted' ||
        item.status === 'pending' ||
        item.scheduledDate === 'Today'
      );
    }
    if (activeTab === 'upcoming') {
      return (
        item.scheduledDate !== 'Today' &&
        item.status !== 'completed' &&
        item.status !== 'cancelled'
      );
    }
    if (activeTab === 'completed') {
      return item.status === 'completed';
    }
    return true;
  });

  const todayCount = workerBookings.filter(
    (b) =>
      b.status === 'in_progress' ||
      b.status === 'accepted' ||
      b.status === 'pending' ||
      b.scheduledDate === 'Today'
  ).length;

  const upcomingCount = workerBookings.filter(
    (b) =>
      b.scheduledDate !== 'Today' &&
      b.status !== 'completed' &&
      b.status !== 'cancelled'
  ).length;

  const completedCount = workerBookings.filter((b) => b.status === 'completed').length;

  return (
    <View style={styles.container}>
      {/* Screen Title & Tabs */}
      <View style={styles.header}>
        <Text style={styles.title}>My bookings</Text>

        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setActiveTab('today')}
            style={[
              styles.filterPill,
              activeTab === 'today' && styles.filterPillActive,
            ]}>
            <Text
              style={[
                styles.filterText,
                activeTab === 'today' && styles.filterTextActive,
              ]}>
              Today {todayCount > 0 ? `(${todayCount})` : ''}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('upcoming')}
            style={[
              styles.filterPill,
              activeTab === 'upcoming' && styles.filterPillActive,
            ]}>
            <Text
              style={[
                styles.filterText,
                activeTab === 'upcoming' && styles.filterTextActive,
              ]}>
              Upcoming {upcomingCount > 0 ? `(${upcomingCount})` : ''}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('completed')}
            style={[
              styles.filterPill,
              activeTab === 'completed' && styles.filterPillActive,
            ]}>
            <Text
              style={[
                styles.filterText,
                activeTab === 'completed' && styles.filterTextActive,
              ]}>
              Completed {completedCount > 0 ? `(${completedCount})` : ''}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrap}>
          {filtered.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No {activeTab} bookings</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'today'
                  ? 'New customer bookings will appear here automatically.'
                  : activeTab === 'upcoming'
                  ? 'Future scheduled bookings will appear here.'
                  : 'Completed orders and payouts will appear here.'}
              </Text>
            </View>
          ) : (
            filtered.map((item) => (
              <View key={item.id} style={styles.card}>
                {/* Header row: title, price and status badge */}
                <View style={styles.cardHeader}>
                  <View style={styles.titleAndPriceWrap}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.priceTag}>₹{item.price}</Text>
                  </View>

                  {/* Dynamic Status Badges */}
                  {item.status === 'in_progress' ? (
                    <View style={styles.inProgressBadge}>
                      <Text style={styles.inProgressBadgeText}>⚡ IN PROGRESS</Text>
                    </View>
                  ) : item.status === 'accepted' ? (
                    <View style={styles.acceptedBadge}>
                      <Text style={styles.acceptedBadgeText}>✓ READY TO START</Text>
                    </View>
                  ) : item.status === 'pending' ? (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>⏳ PENDING</Text>
                    </View>
                  ) : item.status === 'completed' ? (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>✓ COMPLETED</Text>
                    </View>
                  ) : (
                    <View style={styles.blueBadge}>
                      <Text style={styles.blueBadgeText}>{item.badgeText || 'CONFIRMED'}</Text>
                    </View>
                  )}
                </View>

                {/* Subtitle / Customer Info */}
                <Text style={styles.cardSubtitle}>
                  👤 {item.customerName || 'Customer'} · 📍{' '}
                  {item.status === 'pending'
                    ? (item.area || 'Nearby Customer Area (Exact address unlocked on accept)')
                    : (item.address || item.subtitle || 'Service Location')}
                </Text>

                {/* Scheduled Slot */}
                <View style={styles.slotRow}>
                  <Text style={styles.slotText}>
                    📅 {item.scheduledDate || 'Today'} • {item.scheduledSlot || 'ASAP'}
                  </Text>
                </View>

                {/* Customer Problem Note Snippet */}
                {item.problemNote ? (
                  <View style={styles.noteSnippetBox}>
                    <Text style={styles.noteSnippetText} numberOfLines={2}>
                      📝 "{item.problemNote}"
                    </Text>
                  </View>
                ) : null}

                {/* Customer Voice Note Audio Player */}
                {item.voiceNoteUrl && (
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
                        onPress={() => handleTogglePlayAudio(item)}
                        style={[
                          styles.playAudioBtn,
                          playingAudioId === item.id && styles.playAudioBtnActive,
                        ]}>
                        <Text style={styles.playAudioIcon}>
                          {playingAudioId === item.id ? '⏸️' : '▶️'}
                        </Text>
                        <Text style={styles.playAudioText}>
                          {playingAudioId === item.id ? 'Pause' : 'Play'}
                        </Text>
                      </Pressable>
                    </View>

                    {/* Waveform Visualization */}
                    <View style={styles.waveformContainer}>
                      {[6, 14, 22, 16, 8, 20, 26, 12, 24, 10, 18, 28, 14, 20, 8].map((h, i) => (
                        <View
                          key={i}
                          style={[
                            styles.waveformBar,
                            {
                              height:
                                playingAudioId === item.id
                                  ? Math.min(26, h + ((i * 3) % 10))
                                  : h,
                              backgroundColor:
                                playingAudioId === item.id ? '#F59E0B' : '#CBD5E1',
                            },
                          ]}
                        />
                      ))}
                      <Text style={styles.audioDurationText}>
                        {playingAudioId === item.id
                          ? `00:${String(Math.min(30, audioTimer)).padStart(2, '0')} / 00:30`
                          : '00:30'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* ============================================================== */}
                {/* ACTIONS PER STATUS                                              */}
                {/* ============================================================== */}

                {/* 1. Status: IN PROGRESS -> Complete Work (Enter OTP), Call, Navigate */}
                {item.status === 'in_progress' && (
                  <View style={styles.actionsContainer}>
                    <Pressable
                      onPress={() => onMarkJobComplete && onMarkJobComplete(item)}
                      style={({ pressed }) => [
                        styles.solidYellowBtn,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={styles.solidYellowBtnText}>
                        🔑 Complete Work (Enter Customer OTP) →
                      </Text>
                    </Pressable>

                    <Text style={styles.otpHelperNotice}>
                      🔒 Ask {item.customerName || 'customer'} for the 4-digit OTP shown on their screen to verify & complete.
                    </Text>

                    <View style={styles.dualBtnRow}>
                      <Pressable
                        onPress={() => onCallCustomer && onCallCustomer(item)}
                        style={({ pressed }) => [
                          styles.outlineActionBtn,
                          pressed && styles.pressed,
                        ]}>
                        <Text style={styles.outlineActionText}>📞 Call</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onNavigateMap && onNavigateMap(item)}
                        style={({ pressed }) => [
                          styles.outlineActionBtn,
                          pressed && styles.pressed,
                        ]}>
                        <Text style={styles.outlineActionText}>🗺️ Navigate</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* 2. Status: ACCEPTED -> Start Work (Mark In-Progress), Call, Navigate */}
                {item.status === 'accepted' && (
                  <View style={styles.actionsContainer}>
                    <Pressable
                      onPress={() => onStartWork && onStartWork(item)}
                      style={({ pressed }) => [
                        styles.solidBlueBtn,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={styles.solidBlueBtnText}>
                        ⚡ Start Work (Mark In-Progress)
                      </Text>
                    </Pressable>

                    <View style={styles.dualBtnRow}>
                      <Pressable
                        onPress={() => onCallCustomer && onCallCustomer(item)}
                        style={({ pressed }) => [
                          styles.outlineActionBtn,
                          pressed && styles.pressed,
                        ]}>
                        <Text style={styles.outlineActionText}>📞 Call Customer</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onNavigateMap && onNavigateMap(item)}
                        style={({ pressed }) => [
                          styles.outlineActionBtn,
                          pressed && styles.pressed,
                        ]}>
                        <Text style={styles.outlineActionText}>🗺️ Navigate</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* 3. Status: PENDING -> Accept, Counter, Locked Phone/Address */}
                {item.status === 'pending' && (
                  <View style={styles.actionsContainer}>
                    <View style={styles.pendingPrivacyNotice}>
                      <Text style={styles.pendingPrivacyNoticeText}>
                        🔒 Customer address & direct calling unlock after you accept this order.
                      </Text>
                      <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '700', marginTop: 3 }}>
                        🪙 Token Fee: {Math.max(1, Math.round(Number(item.price || 200) * 0.20))} Coins (20%) • First 2 Bookings FREE • Overdraft limit: -50
                      </Text>
                    </View>


                    <View style={styles.dualBtnRow}>
                      <Pressable
                        onPress={() => onAcceptBooking && onAcceptBooking(item)}
                        style={({ pressed }) => [
                          styles.acceptPillBtn,
                          styles.fullFlexBtn,
                          pressed && styles.pressed,
                        ]}>
                        <Text style={styles.acceptPillBtnText}>✓ Accept ₹{item.price}</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => onCounterBooking && onCounterBooking(item)}
                        style={({ pressed }) => [
                          styles.counterPillBtn,
                          styles.fullFlexBtn,
                          pressed && styles.pressed,
                        ]}>
                        <Text style={styles.counterPillBtnText}>⚡ Counter</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* 4. Status: COMPLETED -> Receipt row */}
                {item.status === 'completed' && (
                  <View style={styles.completedReceiptRow}>
                    <Text style={styles.completedReceiptIcon}>✓</Text>
                    <View style={styles.completedReceiptCol}>
                      <Text style={styles.receiptLabel}>Job Completed & OTP Verified</Text>
                      <Text style={styles.receiptSub}>₹{item.price} credited to partner earnings</Text>
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: -0.4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  filterPillActive: {
    backgroundColor: BrandColors.primaryBlue,
    borderColor: BrandColors.primaryBlue,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: BottomTabInset + 70,
    alignItems: 'center',
  },
  contentWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleAndPriceWrap: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  priceTag: {
    fontSize: 16,
    fontWeight: '900',
    color: BrandColors.primaryBlue,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
    fontWeight: '500',
  },
  slotRow: {
    marginBottom: 10,
  },
  slotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  noteSnippetBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#CBD5E1',
  },
  noteSnippetText: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
  },

  /* Badges */
  inProgressBadge: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  inProgressBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#B45309',
  },
  acceptedBadge: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  acceptedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },
  pendingBadge: {
    backgroundColor: '#FFFBEB',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  completedBadge: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  blueBadge: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  blueBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },

  /* Voice Note Player */
  voiceNoteCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  voiceNoteTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voiceNoteIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micEmoji: {
    fontSize: 15,
  },
  voiceNoteMeta: {
    flex: 1,
  },
  voiceNoteTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  voiceNoteSub: {
    fontSize: 10,
    color: '#64748B',
  },
  playAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 4,
  },
  playAudioBtnActive: {
    backgroundColor: '#D97706',
  },
  playAudioIcon: {
    fontSize: 10,
  },
  playAudioText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  audioDurationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 'auto',
  },

  /* Actions Layouts */
  actionsContainer: {
    gap: 10,
    marginTop: 4,
  },
  dualBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  outlineActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BrandColors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  outlineActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },
  solidBlueBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: BrandColors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  solidBlueBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  solidYellowBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  solidYellowBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  otpHelperNotice: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },

  /* Triple Buttons for Pending */
  tripleBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptPillBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptPillBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  counterPillBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterPillBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  callPillBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BrandColors.primaryBlue,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callPillBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },

  /* Completed Box */
  completedReceiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginTop: 4,
  },
  completedReceiptIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: '#16A34A',
  },
  completedReceiptCol: {
    flex: 1,
  },
  receiptLabel: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '800',
  },
  receiptSub: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },

  /* Empty State */
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  pendingPrivacyNotice: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  pendingPrivacyNoticeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  fullFlexBtn: {
    flex: 1,
  },
});
