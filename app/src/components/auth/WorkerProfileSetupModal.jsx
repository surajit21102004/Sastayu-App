import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

const PREDEFINED_CATEGORIES = [
  'Electrician',
  'Plumber',
  'AC Repair',
  'Carpenter',
  'Painter',
  'Appliance Repair',
  'Cleaning',
  'Other',
];

export const WorkerProfileSetupModal = ({ visible }) => {
  const { phoneNumber, completeWorkerProfile, logout } = useAuth();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });
  const [gpsActive, setGpsActive] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarCardUri, setAadhaarCardUri] = useState(null);
  const [selfieUri, setSelfieUri] = useState(null);

  const [selectedTrade, setSelectedTrade] = useState('Electrician');
  const [customTrade, setCustomTrade] = useState('');
  const [hourlyRate, setHourlyRate] = useState('149');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detect GPS Location
  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Needed',
          'Please grant location access so customers nearby can find you.'
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
          const full = parts.join(', ');
          if (full) {
            setAddress(full);
          }
        }
        setGpsActive(true);
      }
    } catch (err) {
      Alert.alert('GPS Notice', 'Could not detect location automatically. Please enter your address below.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Upload Aadhaar Card (Camera or Gallery)
  const handleUploadAadhaar = async () => {
    Alert.alert('Upload Aadhaar Card', 'Choose source:', [
      {
        text: 'Take Photo with Camera',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission Denied', 'Camera permission is required.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.6,
            base64: true,
          });
          if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
            setAadhaarCardUri(uri);
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission Denied', 'Photo library permission is required.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.6,
            base64: true,
          });
          if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
            setAadhaarCardUri(uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Take Live Selfie Photo
  const handleTakeSelfie = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Camera Permission',
        'Camera access is required to take a live selfie for your verified profile picture.'
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setSelfieUri(uri);
      }
    } catch (err) {
      // Fallback to library if camera fails on emulator
      const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libPerm.granted) {
        const libResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.6,
          base64: true,
        });
        if (!libResult.canceled && libResult.assets && libResult.assets.length > 0) {
          const asset = libResult.assets[0];
          const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
          setSelfieUri(uri);
        }
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter your Full Name.');
      return;
    }

    const cleanAadhaar = aadhaarNumber.replace(/\D/g, '');
    if (cleanAadhaar.length !== 12) {
      Alert.alert(
        'Invalid Aadhaar Number',
        'Aadhaar number must be exactly 12 digits (e.g. 1234 5678 9012).'
      );
      return;
    }

    if (!aadhaarCardUri) {
      Alert.alert('Aadhaar Document Required', 'Please upload a photo of your Aadhaar Card.');
      return;
    }

    if (!selfieUri) {
      Alert.alert('Live Selfie Required', 'Please take a live selfie for your verified profile.');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Address Required', 'Please enter your work area or service base address.');
      return;
    }

    if (selectedTrade === 'Other' && !customTrade.trim()) {
      Alert.alert('Custom Category Required', 'Please write your service category (e.g. AC Repair).');
      return;
    }

    const rateNum = Number(hourlyRate);
    if (isNaN(rateNum) || rateNum < 50 || rateNum > 5000) {
      Alert.alert('Invalid Rate', 'Please enter a reasonable hourly rate (₹50 to ₹5000/hr).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await completeWorkerProfile({
        name: name.trim(),
        address: address.trim(),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        aadhaarNumber: cleanAadhaar,
        aadhaarCardUrl: aadhaarCardUri,
        selfieUrl: selfieUri,
        trade: selectedTrade,
        customTrade: selectedTrade === 'Other' ? customTrade.trim() : null,
        hourlyRate: rateNum,
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
        {/* Dark Partner Header Banner */}
        <View style={styles.headerBanner}>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>PARTNER ONBOARDING</Text>
          </View>
          <Text style={styles.headerTitle}>Setup Your Profile</Text>
          <Text style={styles.headerSubtitle}>
            Complete your verification once to start accepting bookings and earning.
          </Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Phone Number (Pre-filled & Locked) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Phone Number <Text style={styles.lockedHint}>(Verified)</Text>
              </Text>
              <View style={[styles.inputBox, styles.inputBoxDisabled]}>
                <Text style={styles.lockIcon}>🔒 +91</Text>
                <TextInput
                  style={[styles.textInput, styles.textInputDisabled]}
                  value={phoneNumber || '9433554008'}
                  editable={false}
                />
              </View>
            </View>

            {/* Worker Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Name of Worker <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Amit Sharma"
                  placeholderTextColor="#64748B"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Live Selfie Photo For Profile Picture */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Live Selfie Photo (Profile Picture) <Text style={styles.requiredStar}>*</Text>
              </Text>

              <View style={styles.photoUploadRow}>
                {selfieUri ? (
                  <View style={styles.selfiePreviewWrapper}>
                    <Image source={{ uri: selfieUri }} style={styles.selfieImage} />
                    <View style={styles.verifiedCheckBadge}>
                      <Text style={styles.checkIcon}>✓</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.selfiePlaceholderCircle}>
                    <Text style={styles.cameraIcon}>🤳</Text>
                  </View>
                )}

                <View style={styles.photoActionCol}>
                  <Pressable
                    onPress={handleTakeSelfie}
                    style={({ pressed }) => [styles.photoActionBtn, pressed && styles.btnPressed]}>
                    <Text style={styles.photoActionBtnText}>
                      {selfieUri ? 'Retake Selfie Photo' : '📸 Take Live Selfie Photo'}
                    </Text>
                  </Pressable>
                  <Text style={styles.photoHintText}>
                    Face must be clearly visible for customer safety verification
                  </Text>
                </View>
              </View>
            </View>

            {/* Aadhaar Card Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Aadhaar Card Number <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  placeholder="12-digit Aadhaar Number (XXXX XXXX XXXX)"
                  placeholderTextColor="#64748B"
                  keyboardType="number-pad"
                  maxLength={12}
                  value={aadhaarNumber}
                  onChangeText={setAadhaarNumber}
                />
              </View>
            </View>

            {/* Upload Aadhaar Card Document */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Upload Aadhaar Card Document <Text style={styles.requiredStar}>*</Text>
              </Text>

              {aadhaarCardUri ? (
                <View style={styles.docPreviewCard}>
                  <Image source={{ uri: aadhaarCardUri }} style={styles.aadhaarPreviewImage} />
                  <View style={styles.docInfoCol}>
                    <Text style={styles.docSuccessTitle}>✓ Aadhaar Attached</Text>
                    <Pressable onPress={handleUploadAadhaar}>
                      <Text style={styles.changeDocLink}>Change Document</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={handleUploadAadhaar}
                  style={({ pressed }) => [styles.uploadDocBtn, pressed && styles.btnPressed]}>
                  <Text style={styles.uploadDocIcon}>📄</Text>
                  <Text style={styles.uploadDocBtnText}>Upload Aadhaar Photo / Scan</Text>
                </Pressable>
              )}
            </View>

            {/* Service Expertise Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Service Expertise <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.categoriesWrap}>
                {PREDEFINED_CATEGORIES.map((cat) => {
                  const isSelected = selectedTrade === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setSelectedTrade(cat)}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected,
                      ]}>
                      <Text
                        style={[
                          styles.categoryChipText,
                          isSelected && styles.categoryChipTextSelected,
                        ]}>
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* If "Other" or custom trade, allow writing custom category */}
              {selectedTrade === 'Other' && (
                <View style={[styles.inputBox, { marginTop: 10 }]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Write Your Category (e.g. Electrician or AC Repair)"
                    placeholderTextColor="#64748B"
                    value={customTrade}
                    onChangeText={setCustomTrade}
                  />
                </View>
              )}
            </View>

            {/* Cost / Hour */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Cost / Hour (Rate) <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.inputBox}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="149"
                  placeholderTextColor="#64748B"
                  keyboardType="number-pad"
                  maxLength={5}
                  value={hourlyRate}
                  onChangeText={setHourlyRate}
                />
                <Text style={styles.rateUnit}>/ hour</Text>
              </View>
            </View>

            {/* Current Location Permission (Location on) */}
            <View style={styles.inputGroup}>
              <View style={styles.locationHeaderRow}>
                <Text style={styles.inputLabel}>
                  Service Base Location <Text style={styles.requiredStar}>*</Text>
                </Text>
                {gpsActive && (
                  <View style={styles.gpsActiveBadge}>
                    <Text style={styles.gpsActiveText}>✓ GPS Location Live</Text>
                  </View>
                )}
              </View>

              <Pressable
                onPress={handleDetectLocation}
                disabled={isDetectingLocation}
                style={({ pressed }) => [
                  styles.locationDetectBtn,
                  pressed && styles.btnPressed,
                  gpsActive && styles.locationDetectBtnActive,
                ]}>
                {isDetectingLocation ? (
                  <ActivityIndicator size="small" color="#FBBF24" />
                ) : (
                  <>
                    <Text style={styles.locationIcon}>📍</Text>
                    <Text style={styles.locationDetectText}>
                      {gpsActive ? 'Update Base GPS Location' : 'Detect Current Location (Turn on GPS)'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Address input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Work Area / Shop Address <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputBox, styles.addressBox]}>
                <TextInput
                  style={[styles.textInput, styles.addressInput]}
                  placeholder="Area, Street, City, Service Landmark"
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={3}
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
            </View>

            {/* Save & Complete Button */}
            <Pressable
              onPress={handleSaveProfile}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.btnPressed,
                isSubmitting && { opacity: 0.7 },
              ]}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <Text style={styles.saveButtonText}>Complete Setup & Enter Dashboard →</Text>
              )}
            </Pressable>

            {/* Cancel/Logout */}
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
    backgroundColor: '#0D1527',
  },
  headerBanner: {
    backgroundColor: '#1E293B',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  badgePill: {
    backgroundColor: '#FBBF24',
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
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 18,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 6,
  },
  lockedHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34D399',
  },
  requiredStar: {
    color: '#F87171',
    fontWeight: '800',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingHorizontal: 14,
    height: 54,
  },
  inputBoxDisabled: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  lockIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    height: '100%',
  },
  textInputDisabled: {
    color: '#94A3B8',
  },
  photoUploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  selfiePlaceholderCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0D1527',
    borderWidth: 2,
    borderColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    fontSize: 26,
  },
  selfiePreviewWrapper: {
    position: 'relative',
  },
  selfieImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#34D399',
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  photoActionCol: {
    flex: 1,
  },
  photoActionBtn: {
    backgroundColor: '#FBBF24',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 6,
  },
  photoActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  photoHintText: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 14,
  },
  uploadDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#FBBF24',
    borderRadius: 14,
    height: 56,
    gap: 10,
  },
  uploadDocIcon: {
    fontSize: 18,
  },
  uploadDocBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FBBF24',
  },
  docPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#10B981',
    gap: 14,
  },
  aadhaarPreviewImage: {
    width: 60,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  docInfoCol: {
    flex: 1,
  },
  docSuccessTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#34D399',
    marginBottom: 4,
  },
  changeDocLink: {
    fontSize: 12,
    color: '#93C5FD',
    fontWeight: '600',
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryChipSelected: {
    backgroundColor: '#FBBF24',
    borderColor: '#FBBF24',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  categoryChipTextSelected: {
    color: '#0F172A',
    fontWeight: '800',
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FBBF24',
    marginRight: 8,
  },
  rateUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gpsActiveBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gpsActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
  },
  locationDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 14,
    height: 50,
    gap: 8,
  },
  locationDetectBtnActive: {
    borderColor: '#10B981',
    backgroundColor: '#0F291E',
  },
  locationIcon: {
    fontSize: 16,
  },
  locationDetectText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FBBF24',
  },
  addressBox: {
    height: 84,
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  addressInput: {
    height: '100%',
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#FBBF24',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
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
