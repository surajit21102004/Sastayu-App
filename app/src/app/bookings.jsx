import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  StatusBar,
  Linking,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors, BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { LiveTrackingModal } from '@/components/booking/LiveTrackingModal';
import { JobCompletedModal } from '@/components/booking/JobCompletedModal';
import { ReportExtraChargeModal } from '@/components/booking/ReportExtraChargeModal';
import { InAppCallModal } from '@/components/booking/InAppCallModal';
import { UpiPaymentModal } from '@/components/booking/UpiPaymentModal';
import { TechnicianAvatar } from '@/components/common/TechnicianAvatar';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';

export default function BookingsScreen({ onNavigateTab }) {
  const {
    bookings,
    updateBookingStatus,
    respondToCounter,
    refreshBookings,
    activeInAppAlert,
    setActiveInAppAlert,
    userLocation,
  } = useAuth();
  const [activeFilter, setActiveFilter] = useState('upcoming'); // 'upcoming' | 'completed' | 'cancelled'

  // Modal states
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [jobCompletedModalVisible, setJobCompletedModalVisible] = useState(false);
  const [reportExtraModalVisible, setReportExtraModalVisible] = useState(false);
  const [inAppCallVisible, setInAppCallVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [localAlert, setLocalAlert] = useState(null);

  // Active bookings include pending, accepted, upcoming, and in_progress
  const filteredBookings = bookings.filter((b) => {
    if (activeFilter === 'upcoming') {
      return (
        b.status === 'upcoming' ||
        b.status === 'pending' ||
        b.status === 'accepted' ||
        b.status === 'in_progress'
      );
    }
    if (activeFilter === 'completed') return b.status === 'completed';
    if (activeFilter === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  const handleTrack = (booking) => {
    setSelectedBooking(booking);
    const targetAddress = booking?.address || booking?.userLocation || userLocation || 'Sector 14, Gurugram, Delhi NCR';
    const query = encodeURIComponent(targetAddress);
    const mapsUrl = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${query}`,
    });

    Linking.openURL(mapsUrl).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${query}`);
    });
  };

  // Direct Phone Dial & Sastayu In-App Call
  const handleCall = async (booking) => {
    setSelectedBooking(booking);
    const phone = booking?.technicianPhone || '9433554008';
    const clean = String(phone).replace(/\D/g, '');

    setLocalAlert({
      type: 'info',
      title: `Call ${booking.technicianName || 'Technician'}`,
      message: `Partner Phone: +91 ${clean}\nChoose call option:`,
      primaryText: '📞 Direct Phone Call',
      onPrimary: async () => {
        try {
          await Linking.openURL(`tel:${clean}`);
        } catch (err) {
          setInAppCallVisible(true);
        }
      },
      secondaryText: '🔒 Secure In-App Call',
      onSecondary: () => setInAppCallVisible(true),
    });
  };

  const handleOpenPayment = (booking) => {
    setSelectedBooking(booking);
    setPaymentModalVisible(true);
  };

  const handleAcceptCounter = async (bookingId) => {
    const res = await respondToCounter(bookingId, 'accept');
    if (res.success) {
      setLocalAlert({
        type: 'success',
        title: 'Price Agreed! 🎉',
        message: 'Counter offer accepted. Technician has been confirmed.',
      });
    } else {
      setLocalAlert({
        type: 'error',
        title: 'Error',
        message: res.message,
      });
    }
  };

  const handleDeclineCounter = async (bookingId) => {
    setLocalAlert({
      type: 'confirm',
      title: 'Decline Counter Offer',
      message: 'Are you sure you want to decline this quote? The booking will be cancelled.',
      primaryText: 'Yes, Decline',
      secondaryText: 'Keep Quote',
      onPrimary: async () => {
        const res = await respondToCounter(bookingId, 'decline');
        if (res.success) {
          setLocalAlert({
            type: 'info',
            title: 'Quote Declined',
            message: 'Booking has been cancelled.',
          });
        }
      },
    });
  };

  const handleRate = (booking) => {
    if (booking?.isRated) {
      setLocalAlert({
        type: 'success',
        title: 'Review Submitted ⭐',
        message: `You rated ${booking.technicianName || 'this technician'} ${booking.userRating || 5} stars.\n\nThank you for choosing Sastayu!`,
      });
      return;
    }
    setSelectedBooking(booking);
    setJobCompletedModalVisible(true);
  };

  const handleReportIssue = (booking) => {
    setSelectedBooking(booking);
    setReportExtraModalVisible(true);
  };

  const handleReschedule = (booking) => {
    setLocalAlert({
      type: 'info',
      title: 'Reschedule',
      message: `Choose new preferred slot for ${booking.serviceTitle}: Tomorrow 2:00 PM or 5:00 PM.`,
    });
  };

  const handleCancel = (booking) => {
    setLocalAlert({
      type: 'confirm',
      title: 'Cancel Booking',
      message: `Are you sure you want to cancel ${booking.serviceTitle}?`,
      primaryText: 'Yes, Cancel',
      secondaryText: 'Keep Booking',
      onPrimary: () => updateBookingStatus(booking.id, 'cancelled'),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Screen Title */}
      <View style={styles.header}>
        <Text style={styles.title}>My bookings</Text>

        {/* Filter Pills matching Image 4 */}
        <View style={styles.filtersRow}>
          <Pressable
            onPress={() => setActiveFilter('upcoming')}
            style={[
              styles.filterPill,
              activeFilter === 'upcoming' && styles.filterPillActive,
            ]}>
            <Text
              style={[
                styles.filterText,
                activeFilter === 'upcoming' && styles.filterTextActive,
              ]}>
              Upcoming
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveFilter('completed')}
            style={[
              styles.filterPill,
              activeFilter === 'completed' && styles.filterPillActive,
            ]}>
            <Text
              style={[
                styles.filterText,
                activeFilter === 'completed' && styles.filterTextActive,
              ]}>
              Completed
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveFilter('cancelled')}
            style={[
              styles.filterPill,
              activeFilter === 'cancelled' && styles.filterPillActive,
            ]}>
            <Text
              style={[
                styles.filterText,
                activeFilter === 'cancelled' && styles.filterTextActive,
              ]}>
              Cancelled
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {filteredBookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No {activeFilter} bookings</Text>
              <Text style={styles.emptySubtitle}>
                Book a verified professional with 30-min arrival guarantee.
              </Text>
            </View>
          ) : (
            filteredBookings.map((item) => (
              <View key={item.id} style={styles.card}>
                {/* Header Row: Title & Badge */}
                <View style={styles.cardHeader}>
                  <Text style={styles.serviceTitle}>{item.serviceTitle}</Text>

                  {/* Badge */}
                  {item.badgeType === 'yellow' && (
                    <View style={styles.yellowBadge}>
                      <Text style={styles.yellowBadgeText}>{item.statusBadge}</Text>
                    </View>
                  )}
                  {item.badgeType === 'blue' && (
                    <View style={styles.blueBadge}>
                      <Text style={styles.blueBadgeText}>{item.statusBadge}</Text>
                    </View>
                  )}
                  {item.badgeType === 'gray' && (
                    <View style={styles.grayBadge}>
                      <Text style={styles.grayBadgeText}>{item.statusBadge}</Text>
                    </View>
                  )}
                  {item.badgeType === 'red' && (
                    <View style={styles.redBadge}>
                      <Text style={styles.redBadgeText}>{item.statusBadge}</Text>
                    </View>
                  )}
                </View>

                {/* Subtext info */}
                <Text style={styles.subtext}>
                  📅 {item.scheduledDate || 'Today'} • {item.scheduledSlot || 'ASAP'}
                </Text>

                {/* Technician & Slot Info */}
                <View style={styles.partnerInfoRow}>
                  <View style={styles.partnerThumbCol}>
                    <TechnicianAvatar
                      uri={item.technicianSelfie}
                      name={item.technicianName}
                      trade={item.technicianTrade}
                      size={44}
                    />
                    <View style={styles.partnerTextGroup}>
                      <Text style={styles.technicianText}>
                        {item.technicianName}
                      </Text>
                      <Text style={styles.technicianTradeSub}>
                        {item.technicianTrade || 'Verified Partner'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.priceTagText}>₹{item.totalAmount}</Text>
                </View>

                {/* Problem Note / Voice Note Badge */}
                {item.problemNote ? (
                  <Text style={styles.problemSnippet} numberOfLines={2}>
                    Issue: {item.problemNote}
                  </Text>
                ) : null}

                {item.voiceNoteUrl && (
                  <View style={styles.voiceNoteBadge}>
                    <Text style={styles.voiceNoteBadgeText}>🎙️ Voice Note Attached</Text>
                  </View>
                )}

                {/* Counter-Offer Notification Card if worker countered the price */}
                {item.negotiationStatus === 'countered' && (
                  <View style={styles.counterOfferBox}>
                    <Text style={styles.counterOfferTitle}>⚡ Partner Proposed Price Counter-Offer</Text>
                    <Text style={styles.counterOfferText}>
                      Your Offer: ₹{item.proposedPrice}  ➔  <Text style={styles.counterHighlight}>New Price: ₹{item.counterPrice}</Text>
                    </Text>
                    {item.counterNote ? (
                      <Text style={styles.counterReason}>"{item.counterNote}"</Text>
                    ) : null}
                    <View style={styles.counterBtnRow}>
                      <Pressable onPress={() => handleAcceptCounter(item.id)} style={styles.acceptCounterBtn}>
                        <Text style={styles.acceptCounterText}>✓ Accept ₹{item.counterPrice}</Text>
                      </Pressable>
                      <Pressable onPress={() => handleDeclineCounter(item.id)} style={styles.declineCounterBtn}>
                        <Text style={styles.declineCounterText}>✕ Decline</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Completion OTP Card - Customer shares this with technician ONLY when work is done */}
                {(item.status === 'upcoming' || item.status === 'accepted' || item.status === 'in_progress') && item.otp ? (
                  <View style={styles.otpCard}>
                    <View style={styles.otpHeaderRow}>
                      <View style={styles.otpLabelGroup}>
                        <Text style={styles.otpIcon}>🔑</Text>
                        <Text style={styles.otpTitle}>Completion OTP</Text>
                      </View>
                      <View style={styles.otpBoxesRow}>
                        {String(item.otp).split('').map((digit, idx) => (
                          <View key={idx} style={styles.otpSingleBox}>
                            <Text style={styles.otpSingleDigit}>{digit}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <Text style={styles.otpDisclaimer}>
                      🔒 Give this 4-digit code to {item.technicianName} only after work is 100% completed to confirm payment.
                    </Text>
                  </View>
                ) : null}

                {/* Action Buttons */}
                <View style={styles.buttonsRow}>
                  {(item.status === 'upcoming' || item.status === 'accepted' || item.status === 'in_progress') && (
                    <View style={styles.professionalBtnRow}>
                      <Pressable
                        onPress={() => handleCall(item)}
                        style={({ pressed }) => [styles.professionalCallBtn, pressed && styles.btnPressed]}>
                        <Text style={styles.professionalCallBtnText}>📞 Call</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleTrack(item)}
                        style={({ pressed }) => [styles.professionalTrackBtn, pressed && styles.btnPressed]}>
                        <Text style={styles.professionalTrackBtnText}>📍 Track</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleOpenPayment(item)}
                        style={({ pressed }) => [styles.professionalPayBtn, pressed && styles.btnPressed]}>
                        <Text style={styles.professionalPayBtnText}>
                          {item.paymentStatus === 'paid' ? '✓ Paid' : `💳 Pay ₹${item.totalAmount}`}
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  {item.status === 'pending' && (
                    <View style={styles.pendingRowContainer}>
                      <View style={styles.pendingSearchingPill}>
                        <ActivityIndicator size="small" color={BrandColors.primaryBlue} />
                        <Text style={styles.pendingSearchingText}>
                          {item.isEmergency ? '⚡ Broadcasting to nearby partners...' : 'Waiting for technician to confirm...'}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleCancel(item)}
                        style={styles.cancelPendingBtn}>
                        <Text style={styles.cancelPendingBtnText}>Cancel</Text>
                      </Pressable>
                    </View>
                  )}

                  {item.status === 'completed' && (
                    <>
                      {item.paymentStatus === 'paid' ? (
                        <View style={styles.paidBadgeBox}>
                          <Text style={styles.paidBadgeText}>
                            ✓ Paid ₹{item.totalAmount} ({item.paymentMode === 'cash' ? 'Cash' : 'UPI'})
                          </Text>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => handleOpenPayment(item)}
                          style={[styles.payNowCompletedBtn, { width: '100%', marginBottom: 8 }]}>
                          <Text style={styles.payNowCompletedText}>
                            ⚡ Pay ₹{item.totalAmount} (UPI / Cash)
                          </Text>
                        </Pressable>
                      )}

                      <View style={{ flexDirection: 'row', width: '100%', gap: 8, marginTop: 4 }}>
                        {item.isRated ? (
                          <Pressable
                            onPress={() =>
                              setLocalAlert({
                                type: 'success',
                                title: 'Review Submitted ⭐',
                                message: `You rated ${item.technicianName || 'Technician'} ${item.userRating || 5} stars.\n\nThank you for choosing Sastayu!`,
                              })
                            }
                            style={styles.alreadyReviewedBtn}>
                            <Text style={styles.alreadyReviewedBtnText}>
                              ★ {item.userRating || 5}.0 • Reviewed
                            </Text>
                          </Pressable>
                        ) : (
                          <Pressable
                            onPress={() => handleRate(item)}
                            style={[styles.primaryBlueBtn, { flex: 1 }]}>
                            <Text style={styles.primaryBlueBtnText}>Rate</Text>
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() => handleReportIssue(item)}
                          style={[styles.outlineRedBtn, item.isRated ? { flex: 0.8 } : { flex: 1 }]}>
                          <Text style={styles.outlineRedBtnText}>Report issue</Text>
                        </Pressable>
                      </View>
                    </>
                  )}

                  {/* Cancelled by Technician or Customer Box (Issue 2) */}
                  {item.status === 'cancelled' && (
                    <View style={styles.cancelledActionBox}>
                      <View style={styles.cancelledAlertRow}>
                        <View style={styles.cancelledIconCircle}>
                          <Text style={styles.cancelledIcon}>⚠️</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cancelledTitle}>
                            {item.counterNote && item.counterNote.toLowerCase().includes('technician')
                              ? 'Declined by Technician'
                              : 'Booking Cancelled'}
                          </Text>
                          <Text style={styles.cancelledReason}>
                            {item.counterNote || 'The assigned technician was unavailable for this scheduled slot.'}
                          </Text>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => (onNavigateTab ? onNavigateTab('home') : null)}
                        style={({ pressed }) => [styles.rebookBtn, pressed && styles.btnPressed]}>
                        <Text style={styles.rebookBtnText}>🔄 Book Another Verified Partner</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Sastayu Secure In-App Call Modal */}
      {selectedBooking && (
        <InAppCallModal
          visible={inAppCallVisible}
          workerName={selectedBooking.technicianName}
          workerTrade={selectedBooking.technicianTrade}
          workerPhone={selectedBooking.technicianPhone}
          workerSelfie={selectedBooking.technicianSelfie}
          onClose={() => setInAppCallVisible(false)}
        />
      )}

      {/* Modal 1: Live Tracking Screen (Image 1) */}
      <LiveTrackingModal
        visible={trackingModalVisible}
        booking={selectedBooking}
        onClose={() => setTrackingModalVisible(false)}
        onJobComplete={() => {
          setTrackingModalVisible(false);
          setJobCompletedModalVisible(true);
        }}
      />

      {/* Modal 2: Job Completed Review Screen (Image 2) */}
      <JobCompletedModal
        visible={jobCompletedModalVisible}
        booking={selectedBooking}
        onClose={() => {
          setJobCompletedModalVisible(false);
          refreshBookings();
        }}
        onOpenReportExtra={(b) => {
          if (b) setSelectedBooking(b);
          setJobCompletedModalVisible(false);
          setReportExtraModalVisible(true);
        }}
        onOpenPayment={(b) => {
          if (b) setSelectedBooking(b);
          setJobCompletedModalVisible(false);
          setPaymentModalVisible(true);
        }}
      />

      {/* Modal 3: Report Extra Charge Screen (Image 3) */}
      <ReportExtraChargeModal
        visible={reportExtraModalVisible}
        booking={selectedBooking}
        onClose={() => {
          setReportExtraModalVisible(false);
          refreshBookings();
        }}
      />

      {/* Modal 4: Sastayu UPI & Cash Payment Modal (Prompt 4) */}
      <UpiPaymentModal
        visible={paymentModalVisible}
        booking={selectedBooking}
        onClose={() => setPaymentModalVisible(false)}
        onPaymentSuccess={() => {
          setPaymentModalVisible(false);
          refreshBookings();
        }}
      />

      {/* Local Action Alert Dialog */}
      {localAlert && (
        <CustomAlertModal
          visible={Boolean(localAlert)}
          {...localAlert}
          onClose={() => setLocalAlert(null)}
        />
      )}

      {/* Global Real-Time Event Alert Dialog (Confirmed / Cancelled) */}
      {activeInAppAlert && (
        <CustomAlertModal
          visible={Boolean(activeInAppAlert)}
          {...activeInAppAlert}
          onClose={() => setActiveInAppAlert(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: BrandColors.navyText,
    marginBottom: 16,
    letterSpacing: -0.4,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: BrandColors.primaryBlue,
    borderColor: BrandColors.primaryBlue,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.navyText,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: BottomTabInset + 60,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: BrandColors.navyText,
    flex: 1,
    paddingRight: 8,
  },
  yellowBadge: {
    backgroundColor: BrandColors.accentYellow,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  yellowBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  blueBadge: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  blueBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primaryBlue,
  },
  grayBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  grayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.mutedText,
  },
  redBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  redBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  subtext: {
    fontSize: 13,
    color: BrandColors.mutedText,
    marginBottom: 16,
    fontWeight: '500',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnHalf: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBlueBtn: {
    backgroundColor: BrandColors.primaryBlue,
  },
  primaryBlueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  outlineBlueBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BrandColors.primaryBlue,
  },
  outlineBlueBtnText: {
    color: BrandColors.primaryBlue,
    fontSize: 15,
    fontWeight: '700',
  },
  outlineRedBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F87171',
  },
  outlineRedBtnText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelledNotice: {
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  cancelledNoticeText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  emptySubtitle: {
    fontSize: 13,
    color: BrandColors.mutedText,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  partnerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  partnerThumbCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  partnerThumbCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  partnerThumbImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  partnerThumbInitials: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },
  partnerTextGroup: {
    flex: 1,
  },
  technicianText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  technicianTradeSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  priceTagText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
  },
  problemSnippet: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  voiceNoteBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  voiceNoteBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primaryBlue,
  },
  counterOfferBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  counterOfferTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#92400E',
    marginBottom: 4,
  },
  counterOfferText: {
    fontSize: 12,
    color: '#78350F',
    marginBottom: 4,
  },
  counterHighlight: {
    fontSize: 14,
    fontWeight: '900',
    color: '#B45309',
  },
  counterReason: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#78350F',
    marginBottom: 10,
  },
  counterBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptCounterBtn: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptCounterText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  declineCounterBtn: {
    flex: 0.8,
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  declineCounterText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  otpCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
  },
  otpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  otpLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  otpIcon: {
    fontSize: 16,
  },
  otpTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  otpSingleBox: {
    width: 28,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  otpSingleDigit: {
    fontSize: 16,
    fontWeight: '900',
    color: '#15803D',
  },
  otpDisclaimer: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
    lineHeight: 15,
  },
  outlineGreenBtn: {
    borderWidth: 1.5,
    borderColor: '#059669',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },
  outlineGreenBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  paidBadgeBox: {
    width: '100%',
    backgroundColor: '#DCFCE7',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  paidBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  payNowCompletedBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  payNowCompletedText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  pendingRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  pendingSearchingPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 8,
  },
  pendingSearchingText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primaryBlue,
    flex: 1,
  },
  cancelPendingBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#FFFFFF',
  },
  cancelPendingBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },
  alreadyReviewedBtn: {
    flex: 1.2,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alreadyReviewedBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16A34A',
  },
  /* Professional Call, Track & Pay Buttons */
  professionalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  professionalCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  professionalCallBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  professionalTrackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primaryBlue,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: BrandColors.primaryBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  professionalTrackBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  professionalPayBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  professionalPayBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  /* Cancelled Card Box */
  cancelledActionBox: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    gap: 12,
  },
  cancelledAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelledIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelledIcon: {
    fontSize: 18,
  },
  cancelledTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B91C1C',
  },
  cancelledReason: {
    fontSize: 12,
    color: '#7F1D1D',
    marginTop: 2,
    lineHeight: 16,
  },
  rebookBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  rebookBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
