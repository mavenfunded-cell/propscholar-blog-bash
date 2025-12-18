import { useCallback, useRef } from 'react';

// Audio context for generating sounds
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Subtle ASMR coin credit sound (soft ascending chime)
const playCreditSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Soft main chime - lower volume, gentler frequencies
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, now);
    osc1.frequency.exponentialRampToValueAtTime(660, now + 0.15);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.06, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Soft harmonic overtone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(1100, now + 0.2);
    gain2.gain.setValueAtTime(0, now + 0.05);
    gain2.gain.linearRampToValueAtTime(0.03, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn('Audio not supported:', e);
  }
};

// Subtle ASMR coin debit sound (soft descending tone)
const playDebitSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Soft main tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, now);
    osc1.frequency.exponentialRampToValueAtTime(330, now + 0.25);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.05, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Soft low undertone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(220, now);
    osc2.frequency.exponentialRampToValueAtTime(165, now + 0.3);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.025, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.3);
  } catch (e) {
    console.warn('Audio not supported:', e);
  }
};

// Subtle ASMR success sound (gentle ascending arpeggio)
const playSuccessSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [392, 494, 587, 784]; // G4, B4, D5, G5 - gentle major chord
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.045, now + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.5);
    });
  } catch (e) {
    console.warn('Audio not supported:', e);
  }
};

// Subtle ASMR submission sound (soft confirmation tone)
const playSubmissionSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Soft confirmation tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523, now); // C5
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.05, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Higher gentle tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659, now + 0.1); // E5
    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.04, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.4);

    // Final soft chime
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(784, now + 0.2); // G5
    gain3.gain.setValueAtTime(0, now + 0.2);
    gain3.gain.linearRampToValueAtTime(0.035, now + 0.22);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.2);
    osc3.stop(now + 0.55);
  } catch (e) {
    console.warn('Audio not supported:', e);
  }
};

export function useCoinSound() {
  const lastPlayTime = useRef<number>(0);
  const minInterval = 100; // Prevent sound spam

  const playCredit = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayTime.current > minInterval) {
      lastPlayTime.current = now;
      playCreditSound();
    }
  }, []);

  const playDebit = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayTime.current > minInterval) {
      lastPlayTime.current = now;
      playDebitSound();
    }
  }, []);

  const playSuccess = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayTime.current > minInterval) {
      lastPlayTime.current = now;
      playSuccessSound();
    }
  }, []);

  const playSubmission = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayTime.current > minInterval) {
      lastPlayTime.current = now;
      playSubmissionSound();
    }
  }, []);

  return { playCredit, playDebit, playSuccess, playSubmission };
}

// Export standalone functions for non-hook usage
export { playCreditSound, playDebitSound, playSuccessSound, playSubmissionSound };
