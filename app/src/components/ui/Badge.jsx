import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

export const Badge = ({
  label,
  variant = 'yellow',
  style,
  textStyle,
}) => {
  const getContainerStyle = () => {
    switch (variant) {
      case 'green':
        return { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' };
      case 'red':
        return { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' };
      case 'yellow':
        return { backgroundColor: BrandColors.accentYellow };
      case 'blue':
        return { backgroundColor: BrandColors.primaryBlue };
      case 'light':
        return { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE' };
      case 'outline':
        return { backgroundColor: 'transparent', borderWidth: 1, borderColor: BrandColors.accentYellow };
      default:
        return { backgroundColor: BrandColors.accentYellow };
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'green':
        return { color: '#059669', fontWeight: '700' };
      case 'red':
        return { color: '#DC2626', fontWeight: '700' };
      case 'yellow':
        return { color: BrandColors.navyText, fontWeight: '700' };
      case 'blue':
        return { color: BrandColors.white, fontWeight: '700' };
      case 'light':
        return { color: BrandColors.primaryBlue, fontWeight: '600' };
      case 'outline':
        return { color: BrandColors.navyText, fontWeight: '600' };
      default:
        return { color: BrandColors.navyText, fontWeight: '700' };
    }
  };

  return (
    <View style={[styles.badgeContainer, getContainerStyle(), style]}>
      <Text style={[styles.badgeText, getTextStyle(), textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
