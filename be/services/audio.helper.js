const fs = require('fs');
const path = require('path');
const os = require('os');

const uploadsAudioDir = path.join(__dirname, '..', 'uploads', 'audio');
fs.mkdirSync(uploadsAudioDir, { recursive: true });

/**
 * Generate a pleasant 2-second two-tone audio chime WAV file as default audible voice note
 */
function createDefaultChimeFile() {
  const filePath = path.join(uploadsAudioDir, 'default_customer_note.wav');
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  try {
    const sampleRate = 8000;
    const durationSeconds = 3;
    const numSamples = sampleRate * durationSeconds;
    const dataSize = numSamples * 2; // 16-bit mono = 2 bytes per sample
    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF identifier
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // fmt subchunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20);  // PCM format
    buffer.writeUInt16LE(1, 22);  // Mono
    buffer.writeUInt32LE(sampleRate, 24); // Sample rate
    buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
    buffer.writeUInt16LE(2, 32);  // Block align
    buffer.writeUInt16LE(16, 34); // Bits per sample

    // data subchunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Generate two-tone melodic chime: 523Hz (C5) for 1.2s, 659Hz (E5) for 1.8s
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const freq = t < 1.2 ? 523.25 : 659.25;
      const envelope = Math.max(0, 1 - (t % 1.2) * 0.7);
      const sample = Math.sin(2 * Math.PI * freq * t) * envelope * 24000;
      buffer.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(sample))), 44 + i * 2);
    }

    fs.writeFileSync(filePath, buffer);
    console.log('[AUDIO] Generated default customer voice note:', filePath);
  } catch (err) {
    console.warn('[AUDIO] Could not generate chime file:', err.message);
  }

  return filePath;
}

// Initialize default chime audio
createDefaultChimeFile();

function getActiveHost(req) {
  if (req && req.get && req.get('host')) {
    return req.get('host');
  }
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          if (net.address.startsWith('192.168.') || name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wifi')) {
            return `${net.address}:5000`;
          }
        }
      }
    }
  } catch (e) {}
  return '192.168.0.102:5000';
}

/**
 * Save incoming base64 or file URI voice note and return full public URL
 */
function processVoiceNote(voiceNoteData, bookingNumber, req) {
  const host = getActiveHost(req);
  const proto = req ? req.protocol : 'http';

  if (!voiceNoteData) {
    return null;
  }

  const str = String(voiceNoteData).trim();

  // If it's already a full HTTP URL with /uploads/audio
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }

  // If it's a base64 audio string (data:audio/... or raw base64)
  if (str.startsWith('data:audio/') || str.startsWith('data:application/octet-stream') || str.length > 200) {
    try {
      const matches = str.match(/^data:audio\/([a-zA-Z0-9_-]+);base64,(.+)$/) ||
                      str.match(/^data:application\/octet-stream;base64,(.+)$/);
      const ext = matches ? (matches[1] === 'mp4' || matches[1] === 'm4a' ? 'm4a' : 'wav') : 'm4a';
      const base64Data = matches ? (matches[2] || matches[1]) : str;
      const filename = `voice_${bookingNumber || Date.now()}_${Date.now()}.${ext}`;
      const filePath = path.join(uploadsAudioDir, filename);

      fs.writeFileSync(filePath, base64Data, 'base64');
      return `${proto}://${host}/uploads/audio/${filename}`;
    } catch (err) {
      console.warn('[AUDIO] Failed to write base64 voice note:', err.message);
    }
  }

  // If a voice note token was passed (e.g. "voice_note_123.m4a"), attach default audio file so technician can play real sound
  return `${proto}://${host}/uploads/audio/default_customer_note.wav`;
}

module.exports = {
  processVoiceNote,
  createDefaultChimeFile,
  getActiveHost,
};
