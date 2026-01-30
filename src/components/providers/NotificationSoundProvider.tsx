'use client';

import { createContext, useContext, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useNotificationSound, NotificationSoundId } from '@/lib/hooks/useNotificationSound';

interface NotificationSoundContextType {
  playNotificationSound: (soundId?: NotificationSoundId) => void;
  checkAndPlayForNewNotification: (notificationId: string, soundEnabled: boolean, soundType: string) => void;
}

const NotificationSoundContext = createContext<NotificationSoundContextType | null>(null);

export function useNotificationSoundContext() {
  const context = useContext(NotificationSoundContext);
  if (!context) {
    throw new Error('useNotificationSoundContext must be used within NotificationSoundProvider');
  }
  return context;
}

interface NotificationSoundProviderProps {
  children: ReactNode;
}

export function NotificationSoundProvider({ children }: NotificationSoundProviderProps) {
  const { playSound } = useNotificationSound();
  const lastPlayedNotificationRef = useRef<string | null>(null);

  const playNotificationSound = useCallback((soundId: NotificationSoundId = 'default') => {
    playSound(soundId);
  }, [playSound]);

  const checkAndPlayForNewNotification = useCallback((
    notificationId: string, 
    soundEnabled: boolean, 
    soundType: string
  ) => {
    // Only play if this is a new notification we haven't played for
    if (notificationId !== lastPlayedNotificationRef.current && soundEnabled) {
      lastPlayedNotificationRef.current = notificationId;
      playSound((soundType || 'default') as NotificationSoundId);
    }
  }, [playSound]);

  // Listen for push notifications via service worker messages
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_RECEIVED') {
        // This could be used to trigger sound on push notification
        // For now, we rely on polling in NotificationCenter
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
    
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  return (
    <NotificationSoundContext.Provider value={{ playNotificationSound, checkAndPlayForNewNotification }}>
      {children}
    </NotificationSoundContext.Provider>
  );
}
