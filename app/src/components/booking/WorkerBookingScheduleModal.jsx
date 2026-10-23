import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Linking,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { audioService } from '@/services/audioService';
import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { bookingsAPI } from '@/services/api';
import { TechnicianAvatar } from '@/components/common/TechnicianAvatar';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';

const COMMON_ISSUES_MAP = {
  Electrician: [
    { label: 'Ceiling Fan Not Working / Noise', suggestedPrice: 200, icon: '🌀' },
    { label: 'Switchboard / Socket Loose or Burnt', suggestedPrice: 150, icon: '🔌' },
    { label: 'MCB Tripping / Short Circuit Trip', suggestedPrice: 250, icon: '⚡' },
    { label: 'Light / Chandelier / Holder Fitting', suggestedPrice: 180, icon: '💡' },
    { label: 'Inverter Wiring & Battery Check', suggestedPrice: 300, icon: '🔋' },
  ],
  Plumber: [
    { label: 'Tap / Washbasin Water Leakage', suggestedPrice: 199, icon: '🚰' },
    { label: 'Flush Tank / Jet Spray Not Working', suggestedPrice: 220, icon: '🚽' },
    { label: 'Drain / Sink Blockage Removal', suggestedPrice: 249, icon: '🧽' },
    { label: 'Geyser Valve & Pipe Connection', suggestedPrice: 299, icon: '🚿' },
  ],
  'AC Repair': [
    { label: 'AC Deep Foam Jet Cleaning', suggestedPrice: 399, icon: '🧼' },
    { label: 'AC Water Dripping Inside Room', suggestedPrice: 350, icon: '💧' },
    { label: 'Low Cooling / Gas Leakage Check', suggestedPrice: 499, icon: '❄️' },
    { label: 'Compressor / Capacitor Tripping', suggestedPrice: 450, icon: '📟' },
  ],
  default: [
    { label: 'General Inspection & Fix', suggestedPrice: 199, icon: '🛠️' },
    { label: 'Minor Repair & Part Fitting', suggestedPrice: 249, icon: '🔧' },
    { label: 'Emergency Complete Service Check', suggestedPrice: 349, icon: '⚡' },
  ],
};

const TIME_SLOTS = [
  '09:00 AM - 12:00 PM (Morning)',
  '12:00 PM - 03:00 PM (Afternoon)',
  '03:00 PM - 06:00 PM (Evening)',
  '06:00 PM - 09:00 PM (Night)',
];

export const WorkerBookingScheduleModal = ({
  visible,
  worker,
  serviceName,
  onClose,
  onBookingSuccess,
}) => {
  const { authToken, userLocation } = useAuth();

  // Date Selection: default is 'Today'
  const [selectedDate, setSelectedDate] = useState('Today');
  const [showCalendarGrid, setShowCalendarGrid] = useState(false);

  // Time Slot Selection (Dropdown)
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0]);
  const [slotDropdownOpen, setSlotDropdownOpen] = useState(false);

  // Issue Selection (Dropdown to save vertical screen space)
  const [selectedIssue, setSelectedIssue] = useState('');
  const [issueDropdownOpen, setIssueDropdownOpen] = useState(false);
  const [customNotes, setCustomNotes] = useState('');
  const [offeredPrice, setOfferedPrice] = useState('200');

  // Payment Method: Default to 'cash' (Pay After Service / Cash on Delivery)
  const paymentMethod = 'cash';

  // Real Voice Note Recording State (Max 30s limit)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceNoteRecorded, setVoiceNoteRecorded] = useState(false);
  const [audioBase64, setAudioBase64] = useState(null);
  const recordingRef = useRef(null);

  // Custom Alert Modal State
  const [alertConfig, setAlertConfig] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tradeKey = worker?.trade || serviceName || 'Electrician';
  const issueSuggestions = COMMON_ISSUES_MAP[tradeKey] || COMMON_ISSUES_MAP.default;

  // Cleanup audio recording on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => { });
      }
    };
  }, []);

  // Recording timer with strict 30-Second Hard Limit
  useEffect(() => {
    let interval = null;
    if (isRecordingVoice) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 29) {
            handleToggleVoiceRecord();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  // Generate upcoming 10 days for calendar picker
  const generateUpcomingDays = () => {
    const days = [];
    const now = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateNum = d.getDate();
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const fullLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${dayName}, ${dateNum} ${monthName}`;
      days.push({ dayName, dateNum, monthName, fullLabel });
    }
    return days;
  };

  const upcomingDays = generateUpcomingDays();

  // Voice Note Record / Stop Toggle
  const handleToggleVoiceRecord = async () => {
    if (!isRecordingVoice) {
      const res = await audioService.startRecording();
      if (res.permissionDenied) {
        setAlertConfig({
          type: 'warning',
          title: 'Microphone Permission Required',
          message: 'Please enable microphone access in your settings to record a voice note for the technician.',
        });
        return;
      }
      recordingRef.current = res.recording;
      setRecordingSeconds(0);
      setIsRecordingVoice(true);
      setVoiceNoteRecorded(false);
    } else {
      // Stop recording
      setIsRecordingVoice(false);
      const res = await audioService.stopRecording(recordingRef.current);
      recordingRef.current = null;
      setVoiceNoteRecorded(true);
      setAudioBase64(res.base64 || `voice_note_${Date.now()}.m4a`);
    }
  };

  const handleSelectIssue = (issue) => {
    setSelectedIssue(issue.label);
    setOfferedPrice(String(issue.suggestedPrice));
    setIssueDropdownOpen(false); // Close dropdown to keep screen concise
  };

  const executeCreateBooking = async () => {
    setIsSubmitting(true);
    const priceNum = Number(offeredPrice) || 200;
    try {
      const payload = {
        serviceTitle: selectedIssue || `${tradeKey} Service`,
        serviceType: 'scheduled',
        workerId: worker?.id || 1,
        totalAmount: priceNum,
        proposedPrice: priceNum,
        customerNotes: customNotes.trim(),
        issueDetails: selectedIssue || customNotes.trim(),
        scheduledDate: selectedDate,
        scheduledSlot: selectedSlot,
        voiceNoteUrl: voiceNoteRecorded ? (audioBase64 || `voice_note_${Date.now()}.wav`) : null,
        voiceNoteData: audioBase64 || null,
        address: userLocation || 'Sector 14, Gurugram, Delhi NCR',
        isEmergency: false,
        paymentMethod: 'cash',
        paymentMode: 'cash',
        paymentStatus: 'pending',
        transactionId: null,
      };

      const res = await bookingsAPI.createBooking(payload, authToken);
      if (res && res.success) {
        setAlertConfig({
          type: 'success',
          title: 'Booking Request Sent! 🎉',
          message: `Your booking request has been sent to ${worker?.name || 'Technician'}.\nPay ₹${priceNum} in Cash or UPI directly to technician after service completion.`,
          primaryText: 'View Bookings',
          onPrimary: () => {
            onClose();
            if (onBookingSuccess) onBookingSuccess(res.booking);
          },
        });
      } else {
        setAlertConfig({
          type: 'error',
          title: 'Booking Could Not Be Placed',
          message: res?.message || 'Please check your connection and try again.',
        });
      }
    } catch (err) {
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedIssue && !customNotes.trim() && !voiceNoteRecorded) {
      setAlertConfig({
        type: 'warning',
        title: 'Describe the Problem',
        message: 'Please select an issue from the dropdown, type what needs repair, or record a voice note.',
      });
      return;
    }

    const priceNum = Number(offeredPrice);
    if (isNaN(priceNum) || priceNum < 50) {
      setAlertConfig({
        type: 'warning',
        title: 'Invalid Offer Price',
        message: 'Please enter a valid offered price (minimum ₹50).',
      });
      return;
    }

    executeCreateBooking();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.headerTitle}>Schedule Booking</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Selected Worker Info Card */}
          <View style={styles.workerCard}>
            <TechnicianAvatar
              uri={worker?.selfieUrl}
              name={worker?.name}
              trade={worker?.trade || serviceName}
              size={54}
              style={{ marginRight: 12 }}
            />
            <View style={styles.workerMeta}>
              <View style={styles.workerTitleRow}>
                <Text style={styles.workerName}>{worker?.name || 'Verified Technician'}</Text>
                <Text style={styles.verifiedBadge}>✓ Verified</Text>
              </View>
              <Text style={styles.workerTrade}>{worker?.trade || serviceName}</Text>
              <View style={styles.workerChipsRow}>
                <Text style={styles.workerDistanceChip}>
                  📍 {worker?.distanceLabel || '1.2 km away'}
                </Text>
                <Text style={styles.workerRatingChip}>★ {worker?.rating || '4.9'}</Text>
                <Text style={styles.workerRateChip}>₹{worker?.hourlyRate || '149'}/hr</Text>
              </View>
            </View>
          </View>

          {/* 1. Choose Service Date (Calendar Support & Today by Default) */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>1. Choose Service Date</Text>
              <Pressable
                onPress={() => setShowCalendarGrid(!showCalendarGrid)}
                style={styles.calendarToggleBtn}>
                <Text style={styles.calendarToggleText}>
                  {showCalendarGrid ? 'Hide Calendar ▲' : '📅 Calendar View'}
                </Text>
              </Pressable>
            </View>

            {/* Quick Pills: Today (Default), Tomorrow */}
            <View style={styles.chipsRow}>
              {['Today', 'Tomorrow'].map((d) => (
                <Pressable
                  key={d}
                  onPress={() => {
                    setSelectedDate(d);
                    setShowCalendarGrid(false);
                  }}
                  style={[styles.dateChip, selectedDate === d && styles.chipActive]}>
                  <Text style={[styles.chipText, selectedDate === d && styles.chipTextActive]}>
                    {d === 'Today' ? '⚡ Today (Default)' : d}
                  </Text>
                </Pressable>
              ))}

              <Pressable
                onPress={() => setShowCalendarGrid(!showCalendarGrid)}
                style={[
                  styles.dateChip,
                  selectedDate !== 'Today' && selectedDate !== 'Tomorrow' && styles.chipActive,
                ]}>
                <Text
                  style={[
                    styles.chipText,
                    selectedDate !== 'Today' && selectedDate !== 'Tomorrow' && styles.chipTextActive,
                  ]}>
                  {selectedDate !== 'Today' && selectedDate !== 'Tomorrow'
                    ? `📅 ${selectedDate}`
                    : '📅 More Dates'}
                </Text>
              </Pressable>
            </View>

            {/* Interactive Calendar Strip Grid */}
            {showCalendarGrid && (
              <View style={styles.calendarStripContainer}>
                <Text style={styles.calendarStripHint}>Select service date:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.calendarStripScroll}>
                  {upcomingDays.map((item, idx) => {
                    const isSelected = selectedDate === item.fullLabel;
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => {
                          setSelectedDate(item.fullLabel);
                          setShowCalendarGrid(false);
                        }}
                        style={[
                          styles.calendarDateCard,
                          isSelected && styles.calendarDateCardActive,
                        ]}>
                        <Text style={[styles.calDayName, isSelected && styles.calTextActive]}>
                          {item.dayName}
                        </Text>
                        <Text style={[styles.calDayNum, isSelected && styles.calTextActive]}>
                          {item.dateNum}
                        </Text>
                        <Text style={[styles.calMonth, isSelected && styles.calTextActive]}>
                          {item.monthName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* 2. Choose Time Slot (Concise Dropdown) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Choose Time Slot</Text>

            {/* Dropdown Trigger */}
            <Pressable
              onPress={() => setSlotDropdownOpen(!slotDropdownOpen)}
              style={styles.dropdownTrigger}>
              <View style={styles.dropdownTriggerLeft}>
                <Text style={styles.dropdownTriggerIcon}>⏰</Text>
                <Text style={styles.dropdownTriggerTitle}>{selectedSlot}</Text>
              </View>
              <Text style={styles.dropdownChevron}>{slotDropdownOpen ? '▲' : '▼'}</Text>
            </Pressable>

            {/* Dropdown Options List */}
            {slotDropdownOpen && (
              <View style={styles.dropdownMenu}>
                {TIME_SLOTS.map((slot) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <Pressable
                      key={slot}
                      onPress={() => {
                        setSelectedSlot(slot);
                        setSlotDropdownOpen(false);
                      }}
                      style={[styles.dropdownMenuItem, isSelected && styles.dropdownMenuItemActive]}>
                      <Text style={[styles.dropdownMenuText, isSelected && styles.dropdownMenuTextActive]}>
                        {isSelected ? '✓ ' : '  '}{slot}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* 3. What is the issue? (Concise Space-Saving Dropdown) */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>3. What's the Issue? (Suggested Price)</Text>
              {selectedIssue ? (
                <Pressable onPress={() => setSelectedIssue('')}>
                  <Text style={styles.clearSelectionText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Issue Dropdown Trigger */}
            <Pressable
              onPress={() => setIssueDropdownOpen(!issueDropdownOpen)}
              style={[
                styles.dropdownTrigger,
                selectedIssue ? styles.dropdownTriggerFilled : null,
              ]}>
              <View style={styles.dropdownTriggerLeft}>
                <Text style={styles.dropdownTriggerIcon}>
                  {selectedIssue ? '🔧' : '📋'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.dropdownTriggerTitle,
                      selectedIssue && { color: BrandColors.navyText, fontWeight: '700' },
                    ]}
                    numberOfLines={1}>
                    {selectedIssue || 'Select Issue from Dropdown'}
                  </Text>
                  {selectedIssue ? (
                    <Text style={styles.dropdownSuggestedPrice}>
                      Fair Price: ₹{offeredPrice}
                    </Text>
                  ) : (
                    <Text style={styles.dropdownPlaceholderSub}>
                      Tap to view common repairs & prices
                    </Text>
                  )}
                </View>
              </View>
              <Text style={styles.dropdownChevron}>{issueDropdownOpen ? '▲' : '▼'}</Text>
            </Pressable>

            {/* Expandable Issue Dropdown List */}
            {issueDropdownOpen && (
              <View style={styles.dropdownMenu}>
                {issueSuggestions.map((issue) => {
                  const isSelected = selectedIssue === issue.label;
                  return (
                    <Pressable
                      key={issue.label}
                      onPress={() => handleSelectIssue(issue)}
                      style={[
                        styles.issueDropdownItem,
                        isSelected && styles.issueDropdownItemActive,
                      ]}>
                      <Text style={styles.issueDropdownIcon}>{issue.icon}</Text>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text
                          style={[
                            styles.issueDropdownLabel,
                            isSelected && styles.issueDropdownLabelActive,
                          ]}>
                          {issue.label}
                        </Text>
                        <Text style={styles.issueDropdownPrice}>
                          Suggested: ₹{issue.suggestedPrice}
                        </Text>
                      </View>
                      <Text style={[styles.issueCheckmark, isSelected && styles.issueCheckmarkActive]}>
                        {isSelected ? '✓' : '+'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Custom Notes input box */}
            <TextInput
              style={styles.notesInput}
              placeholder="Or describe what happened (e.g. humming sound, loose wiring)..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={2}
              value={customNotes}
              onChangeText={setCustomNotes}
            />
          </View>

          {/* 4. Send a Voice Note (Max 30s Limit) */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>4. Send a Voice Note 🎙️</Text>
              <View style={styles.thirtySecBadge}>
                <Text style={styles.thirtySecBadgeText}>⏱ Max 30s</Text>
              </View>
            </View>
            <Text style={styles.sectionSub}>
              Explain the issue directly to the technician by speaking:
            </Text>

            <View style={styles.voiceNoteCard}>
              <Pressable
                onPress={handleToggleVoiceRecord}
                style={[
                  styles.micButton,
                  isRecordingVoice && styles.micButtonRecording,
                  voiceNoteRecorded && styles.micButtonRecorded,
                ]}>
                <Text style={styles.micEmoji}>
                  {isRecordingVoice ? '⏹' : voiceNoteRecorded ? '✓' : '🎙️'}
                </Text>
              </Pressable>

              <View style={styles.voiceStatusCol}>
                {isRecordingVoice ? (
                  <>
                    <Text style={styles.recordingAlert}>● Recording Voice Note (In-App)...</Text>
                    <Text style={styles.recordingTimer}>
                      00:{String(recordingSeconds).padStart(2, '0')} / 00:30
                    </Text>
                  </>
                ) : voiceNoteRecorded ? (
                  <>
                    <Text style={styles.recordedTitle}>✓ Voice Note Attached ({recordingSeconds || 5}s)</Text>
                    <Pressable
                      onPress={() => {
                        setVoiceNoteRecorded(false);
                        setAudioBase64(null);
                        setRecordingSeconds(0);
                      }}>
                      <Text style={styles.deleteVoiceLink}>Remove / Re-record</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.voicePromptTitle}>Tap mic to speak your problem</Text>
                    <Text style={styles.voicePromptSub}>Technician listens directly in the app (Max 30s)</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* 5. Your Offered Price */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Your Offered Price</Text>
            <View style={styles.priceOfferCard}>
              <View style={styles.priceRow}>
                <Text style={styles.pricePrefix}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  value={offeredPrice}
                  onChangeText={setOfferedPrice}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
              <Text style={styles.priceHelperText}>
                Fair transparent pricing. Partner can accept or propose a counter-offer with clear reason before work begins.
              </Text>
            </View>
          </View>

          {/* 6. Payment Policy: No Payment in App */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Payment: No In-App Payment 🛡️</Text>
            <View style={styles.paymentCardActiveSole}>
              <View style={styles.paymentCardHeader}>
                <View style={styles.paymentRowLeft}>
                  <Text style={styles.paymentIcon}>🛡️</Text>
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.paymentTitle}>100% Free Booking in App</Text>
                    <Text style={styles.paymentBadgeActiveText}>✓ Direct to Technician / 7-Day Guarantee</Text>
                  </View>
                </View>
                <View style={styles.paymentSelectedCheck}>
                  <Text style={styles.paymentCheckMark}>✓</Text>
                </View>
              </View>
              <Text style={styles.paymentSub}>
                Zero online payment needed in the app! Hand over direct payment of ₹{offeredPrice || '200'} to {worker?.name || 'the technician'} only after your work is completed and verified.
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleConfirmBooking}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.confirmButton,
              pressed && styles.btnPressed,
              isSubmitting && { opacity: 0.7 },
            ]}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmButtonText}>
                Confirm Booking (No In-App Payment) →
              </Text>
            )}
          </Pressable>

        </ScrollView>

        {/* Global Custom Alert Dialog */}
        {alertConfig && (
          <CustomAlertModal
            visible={Boolean(alertConfig)}
            {...alertConfig}
            onClose={() => setAlertConfig(null)}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: BrandColors.navyText,
    marginRight: 8,
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  workerMeta: {
    flex: 1,
  },
  workerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  verifiedBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  workerTrade: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
  },
  workerChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workerDistanceChip: {
    fontSize: 11,
    color: '#0369A1',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  workerRatingChip: {
    fontSize: 11,
    color: '#B45309',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '700',
  },
  workerRateChip: {
    fontSize: 11,
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '700',
  },
  section: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.navyText,
    marginBottom: 6,
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  calendarToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  calendarToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primaryBlue,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: BrandColors.primaryBlue,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  chipTextActive: {
    color: BrandColors.primaryBlue,
  },
  calendarStripContainer: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calendarStripHint: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '600',
  },
  calendarStripScroll: {
    flexDirection: 'row',
  },
  calendarDateCard: {
    width: 60,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    paddingVertical: 4,
  },
  calendarDateCardActive: {
    backgroundColor: BrandColors.primaryBlue,
    borderColor: BrandColors.primaryBlue,
  },
  calDayName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  calDayNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 1,
  },
  calMonth: {
    fontSize: 10,
    color: '#94A3B8',
  },
  calTextActive: {
    color: '#FFFFFF',
  },
  /* Dropdown Styles */
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  dropdownTriggerFilled: {
    borderColor: BrandColors.primaryBlue,
    backgroundColor: '#F8FAFC',
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownTriggerIcon: {
    fontSize: 20,
  },
  dropdownTriggerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  dropdownSuggestedPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginTop: 1,
  },
  dropdownPlaceholderSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  dropdownChevron: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 8,
  },
  dropdownMenu: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  dropdownMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownMenuItemActive: {
    backgroundColor: '#EFF6FF',
  },
  dropdownMenuText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  dropdownMenuTextActive: {
    color: BrandColors.primaryBlue,
    fontWeight: '700',
  },
  clearSelectionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  issueDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  issueDropdownItemActive: {
    backgroundColor: '#EFF6FF',
  },
  issueDropdownIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  issueDropdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  issueDropdownLabelActive: {
    color: BrandColors.primaryBlue,
    fontWeight: '700',
  },
  issueDropdownPrice: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2,
  },
  issueCheckmark: {
    fontSize: 16,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  issueCheckmarkActive: {
    color: BrandColors.primaryBlue,
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    fontSize: 13,
    color: BrandColors.navyText,
    marginTop: 10,
    textAlignVertical: 'top',
  },
  /* Voice Note Styles */
  voiceNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  micButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BrandColors.primaryBlue,
  },
  micButtonRecording: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  micButtonRecorded: {
    backgroundColor: '#DCFCE7',
    borderColor: '#10B981',
  },
  micEmoji: {
    fontSize: 22,
  },
  voiceStatusCol: {
    flex: 1,
  },
  recordingAlert: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },
  recordingTimer: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  recordedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  deleteVoiceLink: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
    marginTop: 2,
  },
  voicePromptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  voicePromptSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  /* Price Negotiation */
  priceOfferCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  pricePrefix: {
    fontSize: 24,
    fontWeight: '900',
    color: '#059669',
    marginRight: 6,
  },
  priceInput: {
    fontSize: 24,
    fontWeight: '900',
    color: BrandColors.navyText,
    flex: 1,
  },
  priceHelperText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  confirmButton: {
    backgroundColor: BrandColors.primaryBlue,
    borderRadius: 16,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: BrandColors.primaryBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  confirmButtonUPI: {
    backgroundColor: '#059669', // Emerald green for instant UPI
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  /* Payment Mode Styles */
  paymentCardActiveSole: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    marginTop: 6,
  },
  paymentRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentSelectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentCheckMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  paymentBadgeActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    marginTop: 2,
  },
  thirtySecBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  thirtySecBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
});
