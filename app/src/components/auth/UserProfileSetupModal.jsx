import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export const UserProfileSetupModal = ({ visible }) => {
  const { phoneNumber, completeCustomerProfile, logout } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [age, setAge] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsDetected, setGpsDetected] = useState(false);

  // Request Location Permission and detect current GPS location
  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Needed',
          'Please grant location permission to automatically detect your address for technician dispatch.',
          [{ text: 'OK' }]
        );
        setIsDetectingLocation(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (loc && loc.coords) {
        setCoordinates({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        // Reverse geocode to get human readable address
        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (geocode && geocode.length > 0) {
          const g = geocode[0];
          const parts = [
            g.name,
            g.street,
            g.subregion || g.district,
            g.city,
            g.postalCode,
          ].filter(Boolean);
          const fullAddress = parts.join(', ');
          if (fullAddress) {
            setAddress(fullAddress);
          }
        }
        setGpsDetected(true);
      }
    } catch (err) {
      Alert.alert(
        'GPS Notice',
        'Could not fetch location automatically. Please type your address manually below.'
      );
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim()) {
      Alert.alert('Required Field', 'Please enter your First Name.');
      return;
    }

    if (!address.trim()) {
      Alert.alert(
        'Address Required',
        'Please enter your address or tap "Turn on GPS" to detect your location.'
      );
      return;
    }

    if (age && (isNaN(Number(age)) || Number(age) < 14 || Number(age) > 120)) {
      Alert.alert('Invalid Age', 'Please enter a valid age.');
      return;
    }

    if (alternatePhone) {
      const cleanAlt = alternatePhone.replace(/\D/g, '').slice(-10);
      if (cleanAlt.length !== 10) {
        Alert.alert('Invalid Alternate Number', 'Alternate phone number must be 10 digits.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await completeCustomerProfile({
        name: firstName.trim(),
        address: address.trim(),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        age: age ? Number(age) : null,
        alternatePhone: alternatePhone ? alternatePhone.trim() : null,
      });

      if (!res.success) {
        Alert.alert('Setup Failed', res.message || 'Could not save profile. Please try again.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={styles.container}>
        {/* Top Header Banner */}
        <View style={styles.headerBanner}>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>FIRST TIME LOGIN</Text>
          </View>
          <Text style={styles.headerTitle}>Setup Your Profile</Text>
          <Text style={styles.headerSubtitle}>
            Complete your details once so verified technicians can reach you quickly.
          </Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Phone Number (Locked/Readonly) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Phone Number <Text style={styles.lockedHint}>(Verified)</Text>
              </Text>
              <View style={[styles.inputBox, styles.inputBoxDisabled]}>
                <Text style={styles.lockIcon}>🔒 +91</Text>
                <TextInput
                  style={[styles.textInput, styles.textInputDisabled]}
                  value={phoneNumber || '8910710493'}
                  editable={false}
                />
              </View>
            </View>

            {/* First Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                First Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Rahul"
                  placeholderTextColor="#94A3B8"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
            </View>

            {/* Age & Alternate Number Row */}
            <View style={styles.rowInputs}>
              {/* Age */}
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.inputLabel}>Age</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 28"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={3}
                    value={age}
                    onChangeText={setAge}
                  />
                </View>
              </View>

              {/* Alternate Number */}
              <View style={[styles.inputGroup, { flex: 1.6 }]}>
                <Text style={styles.inputLabel}>Alternate Phone</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="98765 00000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={alternatePhone}
                    onChangeText={setAlternatePhone}
                  />
                </View>
              </View>
            </View>

            {/* Current Location Permission / GPS Button */}
            <View style={styles.inputGroup}>
              <View style={styles.locationLabelRow}>
                <Text style={styles.inputLabel}>
                  Current Location <Text style={styles.requiredStar}>*</Text>
                </Text>
                {gpsDetected && (
                  <View style={styles.gpsSuccessBadge}>
                    <Text style={styles.gpsSuccessText}>✓ GPS Location Active</Text>
                  </View>
                )}
              </View>

              <Pressable
                onPress={handleDetectLocation}
                disabled={isDetectingLocation}
                style={({ pressed }) => [
                  styles.detectLocationBtn,
                  pressed && styles.btnPressed,
                  gpsDetected && styles.detectLocationBtnSuccess,
                ]}>
                {isDetectingLocation ? (
                  <ActivityIndicator size="small" color="#1E3A8A" />
                ) : (
                  <>
                    <Text style={styles.locationBtnIcon}>📍</Text>
                    <Text style={styles.detectLocationBtnText}>
                      {gpsDetected ? 'Update Current GPS Location' : 'Detect Current Location (Turn on GPS)'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Complete Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Home / Service Address <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputBox, styles.addressBox]}>
                <TextInput
                  style={[styles.textInput, styles.addressTextInput]}
                  placeholder="Flat / House No., Building Name, Street, Landmark"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleSaveProfile}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.btnPressed,
                isSubmitting && { opacity: 0.7 },
              ]}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Profile & Go to Home →</Text>
              )}
            </Pressable>

            {/* Logout Option if user logged in by mistake */}
            <Pressable onPress={logout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Cancel & Logout</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBanner: {
    backgroundColor: BrandColors.primaryBlue,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  badgePill: {
    backgroundColor: BrandColors.accentYellow,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  badgePillText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#DBEAFE',
    marginTop: 4,
    lineHeight: 18,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  lockedHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  requiredStar: {
    color: '#EF4444',
    fontWeight: '800',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 52,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  inputBoxDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  lockIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    height: '100%',
  },
  textInputDisabled: {
    color: '#475569',
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gpsSuccessBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gpsSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  detectLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    height: 50,
    gap: 8,
  },
  detectLocationBtnSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  locationBtnIcon: {
    fontSize: 16,
  },
  detectLocationBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primaryBlue,
  },
  addressBox: {
    height: 84,
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  addressTextInput: {
    height: '100%',
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: BrandColors.primaryBlue,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  logoutBtn: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 6,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
