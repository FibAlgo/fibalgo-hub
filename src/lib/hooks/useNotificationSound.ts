'use client';

import { useCallback, useRef } from 'react';

// Available notification sounds - using Web Audio API for generation
export const NOTIFICATION_SOUNDS = [
  { id: 'default', name: 'Default' },
  { id: 'chime', name: 'Chime' },
  { id: 'bell', name: 'Bell' },
  { id: 'pop', name: 'Pop' },
  { id: 'alert', name: 'Alert' },
] as const;

export type NotificationSoundId = typeof NOTIFICATION_SOUNDS[number]['id'];

// Sound generator using Web Audio API
function createSound(audioCtx: AudioContext, type: NotificationSoundId): void {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  const now = audioCtx.currentTime;
  
  switch (type) {
    case 'default':
      // Two-tone notification
      oscillator.frequency.setValueAtTime(800, now);
      oscillator.frequency.setValueAtTime(1000, now + 0.1);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      break;
      
    case 'chime':
      // Pleasant chime sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, now); // C5
      oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gainNode.gain.setValueAtTime(0.25, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      oscillator.start(now);
      oscillator.stop(now + 0.4);
      break;
      
    case 'bell':
      // Bell-like sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now); // A5
      gainNode.gain.setValueAtTime(0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      oscillator.start(now);
      oscillator.stop(now + 0.6);
      break;
      
    case 'pop':
      // Quick pop sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.1);
      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
      break;
      
    case 'alert':
      // Urgent alert sound
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(600, now);
      oscillator.frequency.setValueAtTime(800, now + 0.1);
      oscillator.frequency.setValueAtTime(600, now + 0.2);
      oscillator.frequency.setValueAtTime(800, now + 0.3);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      oscillator.start(now);
      oscillator.stop(now + 0.4);
      break;
  }
}

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback((soundId: NotificationSoundId = 'default', volume: number = 0.5) => {
    try {
      const audioCtx = getAudioContext();
      
      // Resume audio context if suspended (required for autoplay policies)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      
      createSound(audioCtx, soundId);
    } catch (error) {
      console.warn('Error playing notification sound:', error);
    }
  }, [getAudioContext]);

  const previewSound = useCallback((soundId: NotificationSoundId, volume: number = 0.5) => {
    playSound(soundId, volume);
  }, [playSound]);

  return { playSound, previewSound };
}
