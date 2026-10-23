import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { BrandColors } from '@/constants/theme';

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
  disabled = false,
  loading = false,
  icon,
}) => {
  const getContainerStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? '#94A3B8' : BrandColors.primaryBlue,
          borderWidth: 0,
        };
      case 'accent':
        return {
          backgroundColor: disabled ? '#E2E8F0' : BrandColors.accentYellow,
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: BrandColors.primaryBlue,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: BrandColors.primaryBlue,
          borderWidth: 0,
        };
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return { color: BrandColors.white };
      case 'accent':
        return { color: BrandColors.navyText };
      case 'outline':
        return { color: BrandColors.primaryBlue };
      case 'ghost':
        return { color: BrandColors.primaryBlue };
      default:
        return { color: BrandColors.white };
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return {
          container: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
          text: { fontSize: 13, fontWeight: '600' },
        };
      case 'lg':
        return {
          container: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14 },
          text: { fontSize: 16, fontWeight: '700' },
        };
      case 'md':
      default:
        return {
          container: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
          text: { fontSize: 14, fontWeight: '600' },
        };
    }
  };

  const sizeStyle = getSizeStyle();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.baseButton,
        getContainerStyle(),
        sizeStyle.container,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'accent' ? BrandColors.navyText : BrandColors.white}
        />
      ) : (
        <>
          {icon}
          <Text style={[styles.baseText, getTextStyle(), sizeStyle.text, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  baseText: {
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
