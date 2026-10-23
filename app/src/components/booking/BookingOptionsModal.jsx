import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { Badge } from '@/components/ui/Badge';

export const BookingOptionsModal = ({
  visible,
  serviceName,
  onClose,
  onRequestJaldi,
  onViewList,
}) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header with Back Arrow */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backTitle}>{serviceName}</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.mainHeading}>How do you want to book?</Text>

          {/* Option 1: Jaldi Chahiye Card (Solid Blue) */}
          <View style={styles.jaldiCard}>
            <View style={styles.cardTopRow}>
              <View style={styles.lightningBox}>
                <Text style={styles.lightningIcon}>⚡</Text>
              </View>
              <Badge label="FASTEST" variant="yellow" />
            </View>

            <Text style={styles.jaldiTitle}>Jaldi Chahiye</Text>
            <Text style={styles.jaldiDesc}>
              Need it now. Your request goes to nearby {serviceName?.toLowerCase()}s, and the first
              one to accept comes to you.
            </Text>

            <View style={styles.arrivalTimeRow}>
              <Text style={styles.clockIcon}>🕒</Text>
              <Text style={styles.arrivalText}>Usually arrives in 30 to 45 min</Text>
            </View>

            <Pressable
              onPress={onRequestJaldi}
              style={({ pressed }) => [
                styles.requestNowButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.requestNowText}>Request now</Text>
            </Pressable>
          </View>

          {/* Option 2: Choose from List Card (Bordered White) */}
          <View style={styles.listCard}>
            <View style={styles.listIconBox}>
              <Text style={styles.listIcon}>📑</Text>
            </View>

            <Text style={styles.listTitle}>Choose from List</Text>
            <Text style={styles.listDesc}>
              Compare ratings, reviews and prices, then pick the {serviceName?.toLowerCase()} you
              like.
            </Text>

            <Pressable
              onPress={onViewList}
              style={({ pressed }) => [
                styles.viewListButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.viewListText}>View {serviceName?.toLowerCase()}s</Text>
            </Pressable>
          </View>

          {/* Footer */}
          <Text style={styles.footerNote}>
            Visit charge from ₹149 • Pay after the job is done
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backArrow: {
    fontSize: 28,
    color: BrandColors.navyText,
    fontWeight: '300',
    marginTop: -2,
  },
  backTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  mainHeading: {
    fontSize: 24,
    fontWeight: '800',
    color: BrandColors.navyText,
    marginBottom: 20,
  },
  jaldiCard: {
    backgroundColor: BrandColors.primaryBlue,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  lightningBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: BrandColors.accentYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightningIcon: {
    fontSize: 22,
    color: BrandColors.navyText,
  },
  jaldiTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  jaldiDesc: {
    fontSize: 14,
    color: '#DBEAFE',
    lineHeight: 20,
    marginBottom: 16,
  },
  arrivalTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
  },
  clockIcon: {
    fontSize: 14,
  },
  arrivalText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  requestNowButton: {
    backgroundColor: BrandColors.accentYellow,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestNowText: {
    color: BrandColors.navyText,
    fontSize: 16,
    fontWeight: '800',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  listIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  listIcon: {
    fontSize: 22,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: BrandColors.navyText,
    marginBottom: 8,
  },
  listDesc: {
    fontSize: 14,
    color: BrandColors.mutedText,
    lineHeight: 20,
    marginBottom: 18,
  },
  viewListButton: {
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BrandColors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewListText: {
    color: BrandColors.primaryBlue,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  footerNote: {
    fontSize: 12,
    color: BrandColors.mutedText,
    textAlign: 'center',
    marginTop: 8,
  },
});
