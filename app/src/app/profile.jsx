import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors, BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { SastayuLogo } from '@/components/brand/SastayuLogo';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';

const BRAND_PHONE = '8910710493';
const BRAND_WHATSAPP = '8910710493';
const BRAND_EMAIL = 'support@sastayu.com';
const BRAND_WEBSITE = 'https://sastayu.com';

export default function ProfileScreen() {
  const { userName, phoneNumber, userType, logout, userLocation } = useAuth();
  const [alertConfig, setAlertConfig] = useState(null);

  const initials = (userName || 'Customer')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleCallSupport = () => {
    setAlertConfig({
      type: 'info',
      title: '24x7 Customer Helpline',
      message: `Call Sastayu Support Team at +91 ${BRAND_PHONE} for immediate assistance.`,
      primaryText: '📞 Call Now',
      onPrimary: () => Linking.openURL(`tel:${BRAND_PHONE}`),
      secondaryText: 'Close',
    });
  };

  const handleWhatsAppSupport = () => {
    setAlertConfig({
      type: 'success',
      title: 'WhatsApp Live Chat',
      message: 'Chat directly with our customer support manager on WhatsApp for quick problem resolution.',
      primaryText: '💬 Open WhatsApp',
      onPrimary: () => Linking.openURL(`https://wa.me/91${BRAND_WHATSAPP}?text=Hi%20Sastayu%20Support,%20I%20need%20assistance`),
      secondaryText: 'Cancel',
    });
  };

  const handleEmailSupport = () => {
    setAlertConfig({
      type: 'info',
      title: 'Email Help Desk',
      message: `Write to us at ${BRAND_EMAIL}. Our team responds within 2 hours.`,
      primaryText: '✉️ Send Email',
      onPrimary: () => Linking.openURL(`mailto:${BRAND_EMAIL}?subject=Sastayu%20Service%20Query`),
      secondaryText: 'Cancel',
    });
  };

  const handleLogoutPress = () => {
    setAlertConfig({
      type: 'confirm',
      title: 'Confirm Logout',
      message: 'Are you sure you want to log out of your Sastayu account?',
      primaryText: 'Log Out',
      onPrimary: logout,
      secondaryText: 'Stay Logged In',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* User Account Card */}
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{userName || 'Sastayu Customer'}</Text>
                <Badge label={userType === 'admin' ? 'Admin' : 'Verified'} variant="green" />
              </View>
              <Text style={styles.userPhone}>+91 {phoneNumber || '9876543210'}</Text>
              <Text style={styles.userAddress} numberOfLines={1}>
                📍 {userLocation || 'Sector 14, Gurugram, Delhi NCR'}
              </Text>
            </View>

            <Pressable onPress={handleLogoutPress} style={styles.logoutBtn}>
              <Text style={styles.logoutBtnText}>Logout</Text>
            </Pressable>
          </View>

          {/* Sastayu Brand Header Card */}
          <View style={styles.brandHeroCard}>
            <View style={styles.brandHeroRow}>
              <SastayuLogo variant="horizontal-blue" width={130} height={38} />
              <View style={styles.guaranteeTag}>
                <Text style={styles.guaranteeTagText}>🛡️ 30-Day Guarantee</Text>
              </View>
            </View>
            <Text style={styles.brandHeroSub}>
              On-demand verified electricians, plumbers, carpenters & home technicians with transparent fair pricing.
            </Text>
          </View>

          {/* Support and Helpline Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Support & Helpline</Text>

            <Pressable onPress={handleCallSupport} style={styles.actionRow}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Text style={styles.actionIcon}>📞</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>24x7 Customer Care Helpline</Text>
                <Text style={styles.actionSub}>+91 {BRAND_PHONE} • Toll-Free Emergency</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </Pressable>

            <View style={styles.specDivider} />

            <Pressable onPress={handleWhatsAppSupport} style={styles.actionRow}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Text style={styles.actionIcon}>💬</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>WhatsApp Quick Support</Text>
                <Text style={styles.actionSub}>Live chat with support executive</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </Pressable>

            <View style={styles.specDivider} />

            <Pressable onPress={handleEmailSupport} style={styles.actionRow}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.actionIcon}>✉️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Email Help Desk</Text>
                <Text style={styles.actionSub}>{BRAND_EMAIL}</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </Pressable>

            <View style={styles.specDivider} />

            <Pressable
              onPress={() => Linking.openURL(BRAND_WEBSITE)}
              style={styles.actionRow}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#F1F5F9' }]}>
                <Text style={styles.actionIcon}>🌐</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Official Website & FAQs</Text>
                <Text style={styles.actionSub}>{BRAND_WEBSITE}</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </Pressable>
          </View>

          {/* Trust & Safety Features */}
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Trust & Safety Standards</Text>

            <View style={styles.trustItemRow}>
              <Text style={styles.trustEmoji}>🔒</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.trustTitle}>Aadhaar & Police Verified</Text>
                <Text style={styles.trustSub}>
                  100% of technicians have verified identity, government credentials, and live face matching.
                </Text>
              </View>
            </View>

            <View style={styles.specDivider} />

            <View style={styles.trustItemRow}>
              <Text style={styles.trustEmoji}>🔑</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.trustTitle}>Completion OTP Protection</Text>
                <Text style={styles.trustSub}>
                  Never pay before satisfaction. Partner only marks work done when you share your 4-digit code.
                </Text>
              </View>
            </View>

            <View style={styles.specDivider} />

            <View style={styles.trustItemRow}>
              <Text style={styles.trustEmoji}>🛡️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.trustTitle}>30-Day Work Warranty</Text>
                <Text style={styles.trustSub}>
                  Free re-visit or full dispute refund if any recurring problem occurs within 30 days.
                </Text>
              </View>
            </View>
          </View>

          {/* App Info Footer */}
          <View style={styles.appFooter}>
            <Text style={styles.appVersionText}>Sastayu Mobile App • Version 1.0.0 (Production)</Text>
            <Text style={styles.copyrightText}>© 2026 Sastayu Technologies Pvt. Ltd. All rights reserved.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Custom Alert Dialog */}
      {alertConfig && (
        <CustomAlertModal
          visible={Boolean(alertConfig)}
          {...alertConfig}
          onClose={() => setAlertConfig(null)}
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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: BrandColors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  userPhone: {
    fontSize: 13,
    color: BrandColors.mutedText,
    marginBottom: 2,
  },
  userAddress: {
    fontSize: 12,
    color: BrandColors.navyText,
    fontWeight: '500',
  },
  logoutBtn: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  logoutBtnText: {
    fontSize: 12,
    color: BrandColors.primaryBlue,
    fontWeight: '700',
  },
  brandHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  brandHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  guaranteeTag: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  guaranteeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  brandHeroSub: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.navyText,
    marginBottom: 12,
  },
  specDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
  },
  actionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.navyText,
  },
  actionSub: {
    fontSize: 12,
    color: BrandColors.mutedText,
    marginTop: 1,
  },
  actionArrow: {
    fontSize: 20,
    color: '#94A3B8',
  },
  trustItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 12,
  },
  trustEmoji: {
    fontSize: 22,
    marginTop: 1,
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.navyText,
    marginBottom: 2,
  },
  trustSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  appFooter: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  appVersionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  copyrightText: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
