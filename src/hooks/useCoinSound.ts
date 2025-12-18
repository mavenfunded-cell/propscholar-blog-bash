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

    // Soft main chime
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

    const notes = [392, 494, 587, 784]; // G4, B4, D5, G5
    
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

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.05, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659, now + 0.1);
    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.04, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.4);

    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(784, now + 0.2);
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

// Winner celebration sound - triumphant fanfare
const playWinnerSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Triumphant ascending fanfare C-E-G-C (octave)
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.08, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.6);
    });

    // Add a soft shimmer on the final note
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(2094, now + 0.48); // C7
    shimmerGain.gain.setValueAtTime(0, now + 0.48);
    shimmerGain.gain.linearRampToValueAtTime(0.03, now + 0.52);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(now + 0.48);
    shimmer.stop(now + 1.0);
  } catch (e) {
    console.warn('Audio not supported:', e);
  }
};

// Click/tap sound - soft pop
const playClickSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {
    console.warn('Audio not supported:', e);
  }
};

// Notification sound - gentle bell
const playNotificationSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Two-note notification chime
    const notes = [880, 1109]; // A5, C#6
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.05, now + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.4);
    });
  } catch (e) {
    console.warn('Audio not supported:', e);
  }
};

// Error sound - soft low tone
const playErrorSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {
    console.warn('Audio not supported:', e);
  }
};

// Reward claim sound - magical sparkle
const playRewardSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Sparkle effect with descending then ascending
    const sparkleNotes = [1047, 1319, 1568, 1319, 1568, 2093]; // C6, E6, G6, E6, G6, C7
    
    sparkleNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.035, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.35);
    });
  } catch (e) {
    console.warn('Audio not supported:', e);
  }
};

// Dialog open sound - soft whoosh
const playDialogOpenSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Soft ascending whoosh
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.15);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) {
    console.warn('Audio not supported:', e);
  }
};

export function useCoinSound() {
  const lastPlayTime = useRef<number>(0);
  const minInterval = 100;

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

  const playWinner = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayTime.current > minInterval) {
      lastPlayTime.current = now;
      playWinnerSound();
    }
  }, []);

  const playClick = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayTime.current > minInterval) {
      lastPlayTime.current = now;
      playClickSound();
    }
  }, []);

  const playNotification = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayTime.current > minInterval) {
      lastPlayTime.current = now;
      playNotificationSound();
    }
  }, []);

  const playError = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayTime.current > minInterval) {
      lastPlayTime.current = now;
      playErrorSound();
    }
  }, []);

  const playReward = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayTime.current > minInterval) {
      lastPlayTime.current = now;
      playRewardSound();
    }
  }, []);

  const playDialogOpen = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayTime.current > minInterval) {
      lastPlayTime.current = now;
      playDialogOpenSound();
    }
  }, []);

  return { 
    playCredit, 
    playDebit, 
    playSuccess, 
    playSubmission,
    playWinner,
    playClick,
    playNotification,
    playError,
    playReward,
    playDialogOpen
  };
}

// Export standalone functions for non-hook usage
export { 
  playCreditSound, 
  playDebitSound, 
  playSuccessSound, 
  playSubmissionSound,
  playWinnerSound,
  playClickSound,
  playNotificationSound,
  playErrorSound,
  playRewardSound,
  playDialogOpenSound
};
