import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { BrandColors } from '@/constants/theme';

const { width } = Dimensions.get('window');

/**
 * Premium, Sleek, Professional Alert & Popup Dialog
 * Replaces basic OS alert dialogs with high-conversion, brand-themed UI
 */
export const CustomAlertModal = ({
  visible = false,
  type = 'info', // 'success' | 'warning' | 'error' | 'info' | 'confirm'
  title = '',
  message = '',
  primaryText = 'OK',
  onPrimary,
  secondaryText = null,
  onSecondary,
  onClose,
  extraContent = null,
}) => {
  if (!visible) return null;

  const getTheme = () => {
    switch (type) {
      case 'success':
        return {
          icon: '✓',
          iconBg: '#ECFDF5',
          iconColor: '#059669',
          borderColor: '#A7F3D0',
          btnBg: BrandColors.primaryBlue,
          btnTextColor: '#FFFFFF',
        };
      case 'warning':
        return {
          icon: '⚠️',
          iconBg: '#FFFBEB',
          iconColor: '#D97706',
          borderColor: '#FDE68A',
          btnBg: '#D97706',
          btnTextColor: '#FFFFFF',
        };
      case 'error':
        return {
          icon: '✕',
          iconBg: '#FEF2F2',
          iconColor: '#DC2626',
          borderColor: '#FECACA',
          btnBg: '#DC2626',
          btnTextColor: '#FFFFFF',
        };
      case 'confirm':
        return {
          icon: '⚡',
          iconBg: '#EFF6FF',
          iconColor: BrandColors.primaryBlue,
          borderColor: '#BFDBFE',
          btnBg: BrandColors.primaryBlue,
          btnTextColor: '#FFFFFF',
        };
      case 'info':
      default:
        return {
          icon: 'ℹ️',
          iconBg: '#EFF6FF',
          iconColor: BrandColors.primaryBlue,
          borderColor: '#DBEAFE',
          btnBg: BrandColors.primaryBlue,
          btnTextColor: '#FFFFFF',
        };
    }
  };

  const currentTheme = getTheme();

  const handlePrimary = () => {
    if (onPrimary) onPrimary();
    if (onClose) onClose();
  };

  const handleSecondary = () => {
    if (onSecondary) onSecondary();
    if (onClose) onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose || handleSecondary}>
      <View style={styles.backdrop}>
        <View style={[styles.dialogCard, { borderColor: currentTheme.borderColor }]}>
          {/* Header Icon Badge */}
          <View style={[styles.iconContainer, { backgroundColor: currentTheme.iconBg }]}>
            <Text style={[styles.iconText, { color: currentTheme.iconColor }]}>
              {currentTheme.icon}
            </Text>
          </View>

          {/* Title */}
          {title ? <Text style={styles.title}>{title}</Text> : null}

          {/* Body Message */}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* Optional Extra Elements (e.g. OTP box, map hint) */}
          {extraContent ? <View style={styles.extraContainer}>{extraContent}</View> : null}

          {/* Buttons Row */}
          <View style={styles.buttonRow}>
            {secondaryText ? (
              <Pressable
                onPress={handleSecondary}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.secondaryButtonText}>{secondaryText}</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={handlePrimary}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: currentTheme.btnBg },
                secondaryText ? { flex: 1.2 } : { width: '100%' },
                pressed && styles.buttonPressed,
              ]}>
              <Text style={[styles.primaryButtonText, { color: currentTheme.btnTextColor }]}>
                {primaryText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: Math.min(width - 48, 380),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  extraContainer: {
    width: '100%',
    marginBottom: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: BrandColors.primaryBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
