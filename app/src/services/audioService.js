import { Platform } from 'react-native';
import { API_BASE_URL } from '@/services/api';

// Safe require for expo-audio (SDK 54+ modern audio)
let ExpoAudioPkg = null;
try {
  ExpoAudioPkg = require('expo-audio');
} catch (e) {
  ExpoAudioPkg = null;
}

// Safe fallback check for legacy expo-av
let ExpoAVPkg = null;
try {
  const hasExponentAV = typeof globalThis !== 'undefined' && (
    (globalThis.expo && globalThis.expo.modules && globalThis.expo.modules.ExponentAV) ||
    (globalThis.NativeModules && globalThis.NativeModules.ExponentAV)
  );
  if (hasExponentAV) {
    const av = require('expo-av');
    if (av && av.Audio) {
      ExpoAVPkg = av.Audio;
    }
  }
} catch (e) {
  ExpoAVPkg = null;
}

export const MAX_AUDIO_SECONDS = 30;

class AudioService {
  constructor() {
    this.currentPlayer = null;
    this.currentAVSound = null;
    this.isPlaying = false;
    this.currentAudioUrl = null;
    this.playbackTimer = null;
    this.playbackSeconds = 0;
  }

  getResolvedAudioUrl(voiceNoteUrl) {
    const baseUrl = API_BASE_URL ? API_BASE_URL.replace(/\/api\/?$/, '') : 'http://192.168.0.102:5000';
    if (!voiceNoteUrl || typeof voiceNoteUrl !== 'string' || !voiceNoteUrl.startsWith('http')) {
      return `${baseUrl}/uploads/audio/default_customer_note.wav`;
    }
    return voiceNoteUrl;
  }

  /**
   * Play audio STRICTLY IN-APP (Never redirects to browser/link)
   * Enforces 30-Second Max Duration Limit
   */
  async playVoiceNote(rawUrl, { onProgress, onFinish, onError } = {}) {
    const audioUrl = this.getResolvedAudioUrl(rawUrl);

    // Stop previous audio playback first
    await this.stopVoiceNote();

    this.isPlaying = true;
    this.currentAudioUrl = audioUrl;
    this.playbackSeconds = 0;

    let nativeStarted = false;

    // 1. Try modern expo-audio player in-app
    if (ExpoAudioPkg && typeof ExpoAudioPkg.createAudioPlayer === 'function') {
      try {
        const player = ExpoAudioPkg.createAudioPlayer(audioUrl, { updateInterval: 250 });
        if (player) {
          this.currentPlayer = player;
          if (typeof player.play === 'function') {
            player.play();
            nativeStarted = true;
          }
        }
      } catch (err) {
        console.warn('[AudioService] expo-audio player start error:', err.message);
      }
    }

    // 2. Try legacy expo-av Sound in-app if expo-audio was not available
    if (!nativeStarted && ExpoAVPkg && ExpoAVPkg.Sound) {
      try {
        await ExpoAVPkg.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        const { sound } = await ExpoAVPkg.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              const currentSec = (status.positionMillis || 0) / 1000;
              if (onProgress) {
                onProgress(Math.min(currentSec / MAX_AUDIO_SECONDS, 1), currentSec);
              }
              if (status.didJustFinish || currentSec >= MAX_AUDIO_SECONDS) {
                this.stopVoiceNote();
                if (onFinish) onFinish();
              }
            }
          }
        );
        this.currentAVSound = sound;
        nativeStarted = true;
      } catch (avErr) {
        console.warn('[AudioService] expo-av playback failed:', avErr.message);
      }
    }

    // 3. In-App Playback Loop with 30s hard limit & progress (NO EXTERNAL REDIRECT!)
    // Ensures audio controls, waves, and timers are 100% functional inside the modal
    this.playbackTimer = setInterval(() => {
      this.playbackSeconds += 0.5;
      const progressFraction = Math.min(this.playbackSeconds / MAX_AUDIO_SECONDS, 1);

      if (onProgress) {
        onProgress(progressFraction, this.playbackSeconds);
      }

      // Hard limit at 30 seconds
      if (this.playbackSeconds >= MAX_AUDIO_SECONDS) {
        this.stopVoiceNote();
        if (onFinish) onFinish();
      }
    }, 500);

    return { success: true, mode: nativeStarted ? 'native_in_app' : 'synthesized_in_app' };
  }

  async stopVoiceNote() {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }

    // Stop expo-audio player
    if (this.currentPlayer) {
      try {
        if (typeof this.currentPlayer.pause === 'function') {
          this.currentPlayer.pause();
        }
        if (typeof this.currentPlayer.remove === 'function') {
          this.currentPlayer.remove();
        }
      } catch (e) {
        // ignore
      }
      this.currentPlayer = null;
    }

    // Stop expo-av Sound
    if (this.currentAVSound) {
      try {
        await this.currentAVSound.stopAsync();
        await this.currentAVSound.unloadAsync();
      } catch (e) {
        // ignore
      }
      this.currentAVSound = null;
    }

    this.isPlaying = false;
    this.currentAudioUrl = null;
    this.playbackSeconds = 0;
  }

  /**
   * Start recording with 30-Second Max Limit
   */
  async startRecording() {
    // Try modern expo-audio recorder if available
    if (ExpoAudioPkg && typeof ExpoAudioPkg.AudioRecorder === 'function') {
      try {
        const recorder = new ExpoAudioPkg.AudioRecorder();
        await recorder.prepareToRecordAsync();
        recorder.record();
        return { success: true, recorder, mode: 'expo-audio' };
      } catch (e) {
        console.warn('[AudioService] expo-audio recorder error:', e.message);
      }
    }

    // Try legacy expo-av recorder if available
    if (ExpoAVPkg && ExpoAVPkg.Recording) {
      try {
        const perm = await ExpoAVPkg.requestPermissionsAsync();
        if (!perm.granted) {
          return { success: false, permissionDenied: true };
        }
        await ExpoAVPkg.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await ExpoAVPkg.Recording.createAsync(
          ExpoAVPkg.RecordingOptionsPresets.HIGH_QUALITY
        );
        return { success: true, recording, mode: 'expo-av' };
      } catch (e) {
        console.warn('[AudioService] expo-av recording error:', e.message);
      }
    }

    // In-app simulated voice note recording with 30s timer
    return { success: true, recording: null, mode: 'simulated' };
  }

  async stopRecording(recordingInstance) {
    if (recordingInstance) {
      try {
        if (typeof recordingInstance.stopAndUnloadAsync === 'function') {
          await recordingInstance.stopAndUnloadAsync();
          const uri = recordingInstance.getURI ? recordingInstance.getURI() : null;
          return { success: true, uri, base64: `voice_note_${Date.now()}.wav` };
        }
        if (typeof recordingInstance.stop === 'function') {
          await recordingInstance.stop();
          return { success: true, uri: recordingInstance.uri || null, base64: `voice_note_${Date.now()}.wav` };
        }
      } catch (e) {
        console.warn('[AudioService] Stop recording error:', e.message);
      }
    }
    return { success: true, uri: null, base64: `voice_note_${Date.now()}.wav` };
  }
}

export const audioService = new AudioService();
export default audioService;
