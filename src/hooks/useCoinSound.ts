import { useCallback, useRef } from 'react';

// Audio context for generating sounds
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Generate coin credit sound (ascending chime)
const playCreditSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Main chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(800, now);
    osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Harmonic
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1600, now + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(2400, now + 0.15);
    gain2.gain.setValueAtTime(0.08, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.35);

    // Sparkle
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(3200, now + 0.1);
    gain3.gain.setValueAtTime(0.04, now + 0.1);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.1);
    osc3.stop(now + 0.25);
  } catch (e) {
    console.warn('Audio not supported:', e);
  }
};

// Generate coin debit sound (descending tone)
const playDebitSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Main tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(600, now);
    osc1.frequency.exponentialRampToValueAtTime(300, now + 0.2);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Low undertone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(200, now);
    osc2.frequency.exponentialRampToValueAtTime(100, now + 0.25);
    gain2.gain.setValueAtTime(0.06, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.25);
  } catch (e) {
    console.warn('Audio not supported:', e);
  }
};

// Generate success sound (triumphant)
const playSuccessSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.1, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.4);
    });
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

  return { playCredit, playDebit, playSuccess };
}

// Export standalone functions for non-hook usage
export { playCreditSound, playDebitSound, playSuccessSound };
