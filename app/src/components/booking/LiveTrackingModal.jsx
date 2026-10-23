import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { TechnicianAvatar } from '@/components/common/TechnicianAvatar';

export const LiveTrackingModal = ({
  visible,
  booking,
  onClose,
  onJobComplete,
}) => {
  const [chatOpened, setChatOpened] = useState(false);
  const [imgError, setImgError] = useState(false);

  const technicianName = booking?.technicianName || 'Verified Technician';
  const technicianInitials = technicianName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'VT';
  const otpDigits = (booking?.otp || '4729').split('');

  const handleCall = async () => {
    const rawPhone = booking?.technicianPhone || '8910710493';
    const cleanPhone = String(rawPhone).replace(/\D/g, '');
    try {
      await Linking.openURL(`tel:${cleanPhone}`);
    } catch (err) {
      Alert.alert('Phone Call', `Dialing ${technicianName}: +91 ${cleanPhone}`);
    }
  };

  const handleChat = () => {
    Alert.alert('Live Chat', `Chat window opened with ${technicianName}. Technician: "I am near Sector 14 market, arriving in 15 minutes."`);
  };

  const handleOpenGoogleMaps = () => {
    const destination = booking?.address || booking?.userLocation || 'Sector 14, Gurugram, Delhi NCR';
    const query = encodeURIComponent(destination);
    const mapsUrl = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${query}`,
    });

    Linking.openURL(mapsUrl).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${query}`);
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Simulated Map Area */}
        <View style={styles.mapContainer}>
          {/* Back Button */}
          <SafeAreaView edges={['top']} style={styles.backButtonSafeArea}>
            <Pressable onPress={onClose} style={styles.backButtonCircle}>
              <Text style={styles.backArrow}>‹</Text>
            </Pressable>
          </SafeAreaView>

          {/* Map Grid and Route Graphics */}
          <View style={styles.mapGrid}>
            <View style={styles.gridLineH1} />
            <View style={styles.gridLineH2} />
            <View style={styles.gridLineV1} />
            <View style={styles.gridLineV2} />

            {/* Dotted Route Line */}
            <View style={styles.routeVertical} />
            <View style={styles.routeHorizontal} />

            {/* User Destination Marker (Blue Target Circle) */}
            <View style={styles.destinationMarker}>
              <View style={styles.destinationDot} />
            </View>

            {/* Technician Moving Marker (Yellow Circle) */}
            <View style={styles.technicianMarker}>
              <Text style={styles.technicianEmoji}>⚡</Text>
            </View>
          </View>
        </View>

        {/* White Bottom Sheet matching Image 1 */}
        <View style={styles.sheetContainer}>
          {/* Pill Badge */}
          <View style={styles.acceptedPill}>
            <Text style={styles.checkMark}>✓</Text>
            <Text style={styles.acceptedText}>Request accepted</Text>
          </View>

          {/* Technician Profile Row */}
          <View style={styles.workerRow}>
            <TechnicianAvatar
              uri={booking?.technicianSelfie}
              name={technicianName}
              trade={booking?.technicianTrade}
              size={56}
              style={{ marginRight: 12 }}
            />
            <View style={styles.workerDetails}>
              <Text style={styles.workerName}>{technicianName}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.star}>★</Text>
                <Text style={styles.rating}>{Number(booking?.rating) || 4.9}</Text>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.jobs}>{Number(booking?.totalJobs) || 28} jobs</Text>
              </View>
            </View>

            <View style={styles.etaContainer}>
              <Text style={styles.etaMinutes}>{booking?.etaMinutes ? `${booking.etaMinutes} min` : '10 min'}</Text>
              <Text style={styles.etaLabel}>arriving</Text>
            </View>
          </View>

          {/* Two Action Buttons (Call / Chat) */}
          <View style={styles.actionButtonsRow}>
            <Pressable
              onPress={handleCall}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}>
              <Text style={styles.actionBtnText}>📞 Call Partner</Text>
            </Pressable>
            <Pressable
              onPress={handleChat}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}>
              <Text style={styles.actionBtnText}>💬 Chat</Text>
            </Pressable>
          </View>

          {/* Professional Turn-by-Turn Google Maps Navigation Action */}
          <Pressable
            onPress={handleOpenGoogleMaps}
            style={({ pressed }) => [styles.googleMapsNavBtn, pressed && styles.pressed]}>
            <View style={styles.googleMapsIconCircle}>
              <Text style={styles.googleMapsIconText}>🗺️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.googleMapsNavTitle}>Open Live Route in Google Maps</Text>
              <Text style={styles.googleMapsNavSub} numberOfLines={1}>
                GPS directions from your location to {booking?.address || 'Service Area'}
              </Text>
            </View>
            <Text style={styles.googleMapsNavArrow}>➔</Text>
          </Pressable>

          {/* Security OTP Card */}
          <View style={styles.otpCard}>
            <Text style={styles.otpLabel}>
              Share this OTP when the electrician arrives
            </Text>
            <View style={styles.otpDigitsRow}>
              {otpDigits.map((digit, idx) => (
                <View key={idx} style={styles.otpBox}>
                  <Text style={styles.otpDigitText}>{digit}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Service & Price Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.serviceNameText}>{booking?.serviceTitle || 'Home Service'}</Text>
            <Text style={styles.priceSubtext}>Total ₹{booking?.totalAmount || 200} • Pay after completion</Text>
          </View>

          {/* Demo Action to Trigger Job Completion (Image 2) */}
          <Pressable
            onPress={() => {
              onClose();
              if (onJobComplete) onJobComplete();
            }}
            style={styles.demoCompleteBtn}>
            <Text style={styles.demoCompleteText}>
              Simulate: Job Completed by Electrician →
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF2F6',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
  },
  backButtonSafeArea: {
    position: 'absolute',
    top: 10,
    left: 16,
    zIndex: 10,
  },
  backButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  backArrow: {
    fontSize: 28,
    color: BrandColors.navyText,
    fontWeight: '300',
    marginTop: -2,
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EFF6FF',
  },
  gridLineH1: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#FFFFFF',
  },
  gridLineH2: {
    position: 'absolute',
    top: '60%',
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#FFFFFF',
  },
  gridLineV1: {
    position: 'absolute',
    left: '35%',
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: '#FFFFFF',
  },
  gridLineV2: {
    position: 'absolute',
    left: '68%',
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: '#FFFFFF',
  },
  routeVertical: {
    position: 'absolute',
    top: '25%',
    left: '68%',
    width: 6,
    height: '35%',
    borderStyle: 'dotted',
    borderWidth: 3,
    borderColor: BrandColors.primaryBlue,
  },
  routeHorizontal: {
    position: 'absolute',
    top: '60%',
    left: '28%',
    width: '40%',
    height: 6,
    borderStyle: 'dotted',
    borderWidth: 3,
    borderColor: BrandColors.primaryBlue,
  },
  destinationMarker: {
    position: 'absolute',
    top: '22%',
    left: '65%',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BrandColors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  destinationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  technicianMarker: {
    position: 'absolute',
    top: '57%',
    left: '25%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BrandColors.accentYellow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  technicianEmoji: {
    fontSize: 14,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  acceptedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 16,
  },
  checkMark: {
    color: BrandColors.primaryBlue,
    fontSize: 13,
    fontWeight: '800',
  },
  acceptedText: {
    color: BrandColors.primaryBlue,
    fontSize: 13,
    fontWeight: '700',
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },
  workerDetails: {
    flex: 1,
  },
  workerName: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.navyText,
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  star: {
    color: '#F59E0B',
    fontSize: 14,
  },
  rating: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.navyText,
  },
  dot: {
    color: '#94A3B8',
    fontSize: 12,
  },
  jobs: {
    fontSize: 12,
    color: BrandColors.mutedText,
  },
  etaContainer: {
    alignItems: 'flex-end',
  },
  etaMinutes: {
    fontSize: 22,
    fontWeight: '900',
    color: BrandColors.primaryBlue,
  },
  etaLabel: {
    fontSize: 12,
    color: BrandColors.mutedText,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BrandColors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.primaryBlue,
  },
  googleMapsNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    marginBottom: 16,
    gap: 12,
  },
  googleMapsIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  googleMapsIconText: {
    fontSize: 20,
  },
  googleMapsNavTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },
  googleMapsNavSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  googleMapsNavArrow: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },
  otpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  otpLabel: {
    flex: 1,
    fontSize: 12,
    color: BrandColors.navyText,
    lineHeight: 17,
    fontWeight: '500',
    paddingRight: 10,
  },
  otpDigitsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  otpBox: {
    width: 38,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  otpDigitText: {
    fontSize: 18,
    fontWeight: '900',
    color: BrandColors.primaryBlue,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  serviceNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.navyText,
  },
  priceSubtext: {
    fontSize: 12,
    color: BrandColors.mutedText,
  },
  demoCompleteBtn: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  demoCompleteText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primaryBlue,
  },
  pressed: {
    opacity: 0.8,
  },
});
