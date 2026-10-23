import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SastayuLogo } from './SastayuLogo';
import { BrandColors } from '@/constants/theme';

export const SastayuHeader = ({
  onLocationPress,
  onNotificationPress,
  locationName = 'Sector 14, Gurugram',
}) => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        <SastayuLogo variant="horizontal-blue" width={135} height={38} />

        <Pressable
          onPress={onNotificationPress}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Text style={styles.bellIcon}>🔔</Text>
          <View style={styles.notificationDot} />
        </Pressable>
      </View>

      <Pressable
        onPress={onLocationPress}
        style={({ pressed }) => [styles.locationRow, pressed && styles.pressed]}>
        <Text style={styles.locationPin}>📍</Text>
        <Text style={styles.locationLabel}>Deliver service to:</Text>
        <Text style={styles.locationValue} numberOfLines={1}>
          {locationName}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: BrandColors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bellIcon: {
    fontSize: 16,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.accentYellow,
    borderWidth: 1.5,
    borderColor: BrandColors.white,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  locationPin: {
    fontSize: 14,
  },
  locationLabel: {
    fontSize: 12,
    color: BrandColors.mutedText,
    fontWeight: '500',
  },
  locationValue: {
    fontSize: 12,
    color: BrandColors.navyText,
    fontWeight: '700',
    maxWidth: 180,
  },
  chevron: {
    fontSize: 12,
    color: BrandColors.primaryBlue,
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.7,
  },
});
