import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { SastayuLogo } from '@/components/brand/SastayuLogo';
import { APP_TAGLINE } from '@/constants/services';

export const PromoBanner = ({ onClaim }) => {
  return (
    <View style={styles.bannerContainer}>
      <View style={styles.contentColumn}>
        <View style={styles.tagWrapper}>
          <Text style={styles.tagText}>⚡ FESTIVE MEGA OFFER</Text>
        </View>

        <Text style={styles.title}>{APP_TAGLINE}</Text>
        <Text style={styles.subtitle}>
          Save up to 40% on AC service, plumbing & home repairs today.
        </Text>

        <Pressable
          onPress={onClaim}
          style={({ pressed }) => [styles.claimButton, pressed && styles.pressed]}>
          <Text style={styles.claimButtonText}>Book with ₹150 OFF</Text>
          <Text style={styles.arrowText}>→</Text>
        </Pressable>
      </View>

      <View style={styles.badgeColumn}>
        <SastayuLogo variant="mark-on-blue" width={64} height={64} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: BrandColors.primaryBlue,
    borderRadius: 20,
    padding: 18,
    marginVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  contentColumn: {
    flex: 1,
    paddingRight: 12,
  },
  badgeColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tagWrapper: {
    backgroundColor: BrandColors.accentYellow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  tagText: {
    color: BrandColors.navyText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 23,
    marginBottom: 4,
  },
  subtitle: {
    color: '#DBEAFE',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.accentYellow,
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  claimButtonText: {
    color: BrandColors.navyText,
    fontSize: 12,
    fontWeight: '700',
  },
  arrowText: {
    color: BrandColors.navyText,
    fontSize: 13,
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
