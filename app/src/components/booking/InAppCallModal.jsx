import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Animated,
  Easing,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { TechnicianAvatar } from '@/components/common/TechnicianAvatar';

export const InAppCallModal = ({
  visible,
  workerName,
  workerTrade,
  workerPhone,
  workerSelfie,
  onClose,
}) => {
  const [callStatus, setCallStatus] = useState('Ringing...');
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (!visible) {
      setCallSeconds(0);
      setCallStatus('Ringing...');
      setIsMuted(false);
      setIsSpeaker(false);
      return;
    }

    // Ripple animation during call
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();

    // Simulate connection after 3 seconds
    const connectTimer = setTimeout(() => {
      setCallStatus('Connected (Secure In-App)');
    }, 2800);

    return () => {
      anim.stop();
      clearTimeout(connectTimer);
    };
  }, [visible]);

  // Call timer when connected
  useEffect(() => {
    let interval = null;
    if (callStatus.includes('Connected')) {
      interval = setInterval(() => {
        setCallSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleOpenCarrierDialer = async () => {
    const raw = workerPhone || '8910710493';
    const clean = String(raw).replace(/\D/g, '');
    try {
      await Linking.openURL(`tel:${clean}`);
    } catch (e) {}
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Top Security & Privacy Banner */}
        <View style={styles.privacyBanner}>
          <Text style={styles.lockIcon}>🔒</Text>
          <View style={styles.privacyTextCol}>
            <Text style={styles.privacyTitle}>Sastayu Secure In-App Call</Text>
            <Text style={styles.privacySub}>
              Number Masked • Your personal phone number is 100% private
            </Text>
          </View>
        </View>

        {/* Center Calling Card */}
        <View style={styles.centerSection}>
          <Animated.View
            style={[
              styles.avatarRipple,
              { transform: [{ scale: pulseAnim }] },
            ]}>
            <TechnicianAvatar
              uri={workerSelfie}
              name={workerName}
              trade={workerTrade}
              size={130}
            />
          </Animated.View>

          <Text style={styles.workerName}>{workerName || 'Assigned Partner'}</Text>
          <Text style={styles.workerTrade}>{workerTrade || 'Verified Service Professional'}</Text>

          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                callStatus.includes('Connected') && styles.statusDotActive,
              ]}
            />
            <Text style={styles.statusText}>
              {callStatus.includes('Connected') ? formatTimer(callSeconds) : callStatus}
            </Text>
          </View>
        </View>

        {/* Call Controls */}
        <View style={styles.controlsSection}>
          <View style={styles.controlsRow}>
            {/* Mute Button */}
            <Pressable
              onPress={() => setIsMuted(!isMuted)}
              style={[styles.controlBtn, isMuted && styles.controlBtnActive]}>
              <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
              <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </Pressable>

            {/* Speaker Button */}
            <Pressable
              onPress={() => setIsSpeaker(!isSpeaker)}
              style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}>
              <Text style={styles.controlIcon}>🔊</Text>
              <Text style={styles.controlLabel}>{isSpeaker ? 'Earpiece' : 'Speaker'}</Text>
            </Pressable>
          </View>

          {/* Direct Carrier Dialer Button */}
          <Pressable onPress={handleOpenCarrierDialer} style={styles.carrierCallBtn}>
            <Text style={styles.carrierCallIcon}>📞</Text>
            <Text style={styles.carrierCallText}>
              Direct Phone Call (+91 {String(workerPhone || '8910710493').replace(/\D/g, '')})
            </Text>
          </Pressable>

          {/* End Call Button */}
          <Pressable onPress={onClose} style={styles.endCallButton}>
            <Text style={styles.endCallIcon}>✕</Text>
            <Text style={styles.endCallText}>End Call</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1527',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 12,
  },
  lockIcon: {
    fontSize: 20,
  },
  privacyTextCol: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FBBF24',
    marginBottom: 2,
  },
  privacySub: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRipple: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FBBF24',
    marginBottom: 24,
  },
  avatarImage: {
    width: 126,
    height: 126,
    borderRadius: 63,
  },
  avatarPlaceholder: {
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 54,
  },
  workerName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  workerTrade: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 20,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  statusDotActive: {
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  controlsSection: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 32,
  },
  controlBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  controlIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  carrierCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 16,
    width: '100%',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  carrierCallIcon: {
    fontSize: 18,
  },
  carrierCallText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  endCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    height: 60,
    borderRadius: 30,
    paddingHorizontal: 40,
    gap: 12,
    width: '100%',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  endCallIcon: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  endCallText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
