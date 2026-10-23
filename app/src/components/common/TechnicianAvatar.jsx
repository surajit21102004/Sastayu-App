import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { API_BASE_URL } from '../../services/api';

/**
 * Universal, Fail-Safe Technician Avatar
 * Ensures technician profile picture or live initials are ALWAYS visible and NEVER blank.
 */
export const TechnicianAvatar = ({
  uri,
  name,
  trade,
  size = 48,
  style,
  textStyle,
  fallbackEmoji = '👨‍🔧',
  showOnlineBadge = false,
  isOnline = true,
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state if URI changes
  useEffect(() => {
    setHasError(false);
  }, [uri]);

  // Compute clean 2-letter initials (e.g. "Rohit Routh" -> "RR")
  const initials = (name || '')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Example/demo technician profile photo when worker has not uploaded their selfie
  const serverBase = API_BASE_URL ? API_BASE_URL.replace(/\/api\/?$/, '') : 'http://192.168.0.102:5000';
  const EXAMPLE_TECHNICIAN_PHOTO = `${serverBase}/uploads/selfies/selfie_4_rohit.jpg`;

  // Sanitize URI: file:/// paths from another phone's private sandbox cannot load across devices
  const isValidRemoteUri =
    uri &&
    typeof uri === 'string' &&
    !uri.startsWith('file:///') &&
    (uri.startsWith('http://') ||
      uri.startsWith('https://') ||
      uri.startsWith('data:image'));

  // Use real selfie if provided, otherwise use example technician pic
  const effectivePhotoUri = isValidRemoteUri ? uri : EXAMPLE_TECHNICIAN_PHOTO;

  const borderRadius = size / 2;

  // Curated premium background colors tailored by name
  const bgColors = ['#002B49', '#0284C7', '#0D9488', '#059669', '#4F46E5', '#2563EB'];
  const charCodeSum = (name || 'SP').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const bgColor = bgColors[charCodeSum % bgColors.length];

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: bgColor,
        },
        style,
      ]}>
      {effectivePhotoUri && !hasError ? (
        <Image
          source={{ uri: effectivePhotoUri }}
          style={{ width: size, height: size, borderRadius }}
          resizeMode="cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <View style={[styles.fallbackContainer, { width: size, height: size, borderRadius, backgroundColor: bgColor }]}>
          <Text
            style={[
              styles.initialsText,
              { fontSize: Math.max(12, Math.round(size * 0.38)) },
              textStyle,
            ]}>
            {initials.length > 0 ? initials : fallbackEmoji}
          </Text>
        </View>
      )}

      {showOnlineBadge && (
        <View
          style={[
            styles.onlineBadge,
            {
              width: Math.max(10, Math.round(size * 0.26)),
              height: Math.max(10, Math.round(size * 0.26)),
              borderRadius: Math.max(5, Math.round(size * 0.13)),
              backgroundColor: isOnline ? '#10B981' : '#94A3B8',
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  onlineBadge: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
