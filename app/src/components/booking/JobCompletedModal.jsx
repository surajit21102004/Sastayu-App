import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { bookingsAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { TechnicianAvatar } from '@/components/common/TechnicianAvatar';

export const JobCompletedModal = ({
  visible,
  booking,
  onClose,
  onOpenReportExtra,
  onOpenPayment,
}) => {
  const { authToken, markBookingRated } = useAuth();
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState(['On time', 'Clean work']);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tags = ['On time', 'Polite', 'Clean work', 'Fair price', 'Expert'];

  const technicianName = booking?.technicianName || 'Verified Technician';
  const technicianInitials = technicianName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'VT';

  const visitAmount = Number(booking?.visitCharge) || Number(booking?.proposedPrice) || Number(booking?.totalAmount) || 149;
  const partsAmount = Number(booking?.repairPartsCharge) || 0;
  const totalAmount = Number(booking?.totalAmount) || (visitAmount + partsAmount);

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (booking?.id) {
        await bookingsAPI.rateBooking(booking.id, rating, selectedTags, feedbackText, authToken);
        if (markBookingRated) {
          markBookingRated(booking.id, rating, feedbackText);
        }
      }
      Alert.alert(
        'Thank you! ⭐',
        `Your ${rating}-star rating and review for ${technicianName} has been recorded. Thank you for using Sastayu!`,
        [{ text: 'Done', onPress: onClose }]
      );
    } catch (err) {
      if (booking?.id && markBookingRated) {
        markBookingRated(booking.id, rating, feedbackText);
      }
      Alert.alert('Notice', `Your feedback has been saved. Thank you!`, [
        { text: 'Done', onPress: onClose },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.headerTitle}>Job completed</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Top Rating Card */}
          <View style={styles.ratingCard}>
            <TechnicianAvatar
              uri={booking?.technicianSelfie}
              name={technicianName}
              trade={booking?.technicianTrade}
              size={64}
              style={{ marginBottom: 12 }}
            />

            <Text style={styles.questionText}>
              How was your service with {technicianName}?
            </Text>

            {/* 5 Stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((starVal) => (
                <Pressable
                  key={starVal}
                  onPress={() => setRating(starVal)}
                  style={styles.starPressable}>
                  <Text
                    style={[
                      styles.starIcon,
                      starVal <= rating ? styles.starFilled : styles.starEmpty,
                    ]}>
                    ★
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.tapSubtext}>Tap a star to rate</Text>
          </View>

          {/* Quick Review Tag Chips */}
          <View style={styles.tagsContainer}>
            {tags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={[
                    styles.tagChip,
                    isSelected && styles.tagChipSelected,
                  ]}>
                  <Text
                    style={[
                      styles.tagText,
                      isSelected && styles.tagTextSelected,
                    ]}>
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Feedback Text Input Box */}
          <TextInput
            style={styles.feedbackInput}
            multiline
            numberOfLines={3}
            value={feedbackText}
            onChangeText={setFeedbackText}
            placeholder={`Share your experience with ${technicianName}...`}
            placeholderTextColor="#94A3B8"
          />

          {/* Bill Breakdown Card */}
          <View style={styles.billCard}>
            <View style={styles.billRow}>
              <Text style={styles.billKey}>Visit charge</Text>
              <Text style={styles.billVal}>₹{visitAmount}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billKey}>Repair + parts</Text>
              <Text style={styles.billVal}>₹{partsAmount}</Text>
            </View>
            <View style={styles.billDivider} />
            <View style={styles.billTotalRow}>
              <Text style={styles.billTotalKey}>Total amount</Text>
              <Text style={styles.billTotalVal}>₹{totalAmount}</Text>
            </View>

            {/* Direct Payment Notice (No Payment In App) */}
            <View style={styles.directPaymentNoteBox}>
              <Text style={styles.directPaymentNoteText}>
                💵 <Text style={{ fontWeight: '800' }}>Direct Settlement:</Text> No online payment needed in the app. Hand over direct payment of ₹{totalAmount} to {technicianName} upon completion.
              </Text>
            </View>
          </View>


          {/* Red Banner: Asked for extra money? Report extra charge */}
          <Pressable
            onPress={() => onOpenReportExtra && onOpenReportExtra(booking)}
            style={({ pressed }) => [
              styles.reportExtraBar,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.flagIcon}>⚑</Text>
            <Text style={styles.reportExtraText}>
              Asked for extra money? Report extra charge
            </Text>
            <Text style={styles.reportArrow}>›</Text>
          </Pressable>

          {/* Submit Review Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.submitButton,
              (pressed || isSubmitting) && styles.pressed,
            ]}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Review ⭐</Text>
            )}
          </Pressable>
        </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  ratingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },
  questionText: {
    fontSize: 17,
    fontWeight: '800',
    color: BrandColors.navyText,
    textAlign: 'center',
    marginBottom: 14,
    maxWidth: 240,
    lineHeight: 23,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  starPressable: {
    padding: 4,
  },
  starIcon: {
    fontSize: 34,
  },
  starFilled: {
    color: '#F59E0B',
  },
  starEmpty: {
    color: '#CBD5E1',
  },
  tapSubtext: {
    fontSize: 12,
    color: BrandColors.mutedText,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tagChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  tagChipSelected: {
    backgroundColor: BrandColors.primaryBlue,
    borderColor: BrandColors.primaryBlue,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.navyText,
  },
  tagTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  feedbackInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 14,
    fontSize: 14,
    color: BrandColors.navyText,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  billKey: {
    fontSize: 14,
    color: BrandColors.mutedText,
    fontWeight: '500',
  },
  billVal: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.navyText,
  },
  billDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  billTotalKey: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  billTotalVal: {
    fontSize: 20,
    fontWeight: '900',
    color: BrandColors.navyText,
  },
  directPaymentNoteBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  directPaymentNoteText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
    textAlign: 'center',
  },

  reportExtraBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    marginBottom: 20,
    gap: 8,
  },
  flagIcon: {
    fontSize: 16,
    color: '#E11D48',
  },
  reportExtraText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#BE123C',
  },
  reportArrow: {
    fontSize: 18,
    color: '#BE123C',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: BrandColors.primaryBlue,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
