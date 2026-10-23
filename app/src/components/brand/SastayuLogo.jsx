import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

export const SastayuLogo = ({
  variant = 'horizontal-blue',
  width,
  height,
  style,
}) => {
  if (variant === 'hero-stacked') {
    return <SastayuHeroStacked />;
  }

  let source;
  let defaultWidth = 140;
  let defaultHeight = 40;

  switch (variant) {
    case 'horizontal-light':
      source = require('@/assets/images/logo-horizontal-light-bg.png');
      defaultWidth = 150;
      defaultHeight = 44;
      break;
    case 'horizontal-blue':
      source = require('@/assets/images/logo-horizontal-on-blue.png');
      defaultWidth = 150;
      defaultHeight = 44;
      break;
    case 'badge':
      source = require('@/assets/images/logo-mark-badge.png');
      defaultWidth = 44;
      defaultHeight = 44;
      break;
    case 'mark-on-blue':
      source = require('@/assets/images/logo-mark-on-blue.png');
      defaultWidth = 48;
      defaultHeight = 48;
      break;
    case 'stacked':
      source = require('@/assets/images/logo-primary-stacked.png');
      defaultWidth = 120;
      defaultHeight = 110;
      break;
    case 'stacked-white':
      source = require('@/assets/images/logo-primary-stacked-white-bg.png');
      defaultWidth = 120;
      defaultHeight = 110;
      break;
    default:
      source = require('@/assets/images/logo-horizontal-on-blue.png');
  }

  return (
    <Image
      source={source}
      style={[
        {
          width: width ?? defaultWidth,
          height: height ?? defaultHeight,
          resizeMode: 'contain',
        },
        style,
      ]}
    />
  );
};

// Exact hero mark from Screenshot 1:
// White Roof Chevron + Yellow S Pipe + Bold White Sastayu Wordmark + "One App with 100+ Solutions"
export const SastayuHeroStacked = ({
  subtitle = 'One App with 100+ Solutions',
}) => {
  return (
    <View style={styles.heroContainer}>
      {/* Icon Graphic */}
      <View style={styles.iconGraphicWrapper}>
        {/* White Chevron / Roof */}
        <View style={styles.roofContainer}>
          <View style={styles.roofLeftArm} />
          <View style={styles.roofRightArm} />
        </View>

        {/* Yellow S Pipe Body */}
        <View style={styles.pipeS}>
          <View style={styles.pipeTopFlange} />
          <View style={styles.pipeTopBar} />
          <View style={styles.pipeCenterBar} />
          <View style={styles.pipeBottomBar} />
          <View style={styles.pipeBottomFlange} />
        </View>
      </View>

      {/* Brand Name */}
      <Text style={styles.brandTitle}>Sastayu</Text>

      {/* Subtitle */}
      <Text style={styles.brandSubtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGraphicWrapper: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  roofContainer: {
    width: 80,
    height: 26,
    position: 'relative',
    alignItems: 'center',
  },
  roofLeftArm: {
    position: 'absolute',
    left: 7,
    top: 10,
    width: 36,
    height: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    transform: [{ rotate: '-34deg' }],
  },
  roofRightArm: {
    position: 'absolute',
    right: 7,
    top: 10,
    width: 36,
    height: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    transform: [{ rotate: '34deg' }],
  },
  pipeS: {
    width: 50,
    height: 48,
    marginTop: 4,
    position: 'relative',
  },
  pipeTopFlange: {
    position: 'absolute',
    right: -2,
    top: 0,
    width: 8,
    height: 14,
    backgroundColor: BrandColors.accentYellow,
    borderRadius: 2,
  },
  pipeTopBar: {
    position: 'absolute',
    right: 0,
    top: 2,
    width: 44,
    height: 9,
    backgroundColor: BrandColors.accentYellow,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  pipeCenterBar: {
    position: 'absolute',
    left: 0,
    top: 18,
    width: 44,
    height: 9,
    backgroundColor: BrandColors.accentYellow,
    borderRadius: 4,
  },
  pipeBottomBar: {
    position: 'absolute',
    left: 0,
    bottom: 2,
    width: 44,
    height: 9,
    backgroundColor: BrandColors.accentYellow,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  pipeBottomFlange: {
    position: 'absolute',
    left: -2,
    bottom: 0,
    width: 8,
    height: 14,
    backgroundColor: BrandColors.accentYellow,
    borderRadius: 2,
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
