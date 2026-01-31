'use client';

import { useState, useEffect, useCallback } from 'react';

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  permission: NotificationPermission | null;
}

// Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray.buffer as ArrayBuffer;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    subscription: null,
    permission: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if push notifications are supported
  const checkSupport = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }, []);

  // Initialize and check current subscription status
  useEffect(() => {
    const init = async () => {
      const isSupported = checkSupport();
      
      if (!isSupported) {
        setState(prev => ({ ...prev, isSupported: false }));
        return;
      }

      setState(prev => ({ 
        ...prev, 
        isSupported: true,
        permission: Notification.permission
      }));

      try {
        // Register service worker if not already registered
        const registration = await navigator.serviceWorker.register('/sw-notifications.js');
        
        // Check if already subscribed
        const subscription = await registration.pushManager.getSubscription();
        
        setState(prev => ({
          ...prev,
          isSubscribed: !!subscription,
          subscription
        }));
      } catch (err) {
        console.error('Error initializing push notifications:', err);
      }
    };

    init();
  }, [checkSupport]);

  // Request permission and subscribe
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      setError('Push notifications are not supported');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        setError('Notification permission denied');
        setLoading(false);
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from server
      const vapidResponse = await fetch('/api/user/notifications/push/vapid-key');
      if (!vapidResponse.ok) {
        throw new Error('Failed to get VAPID key');
      }
      const { publicKey } = await vapidResponse.json();

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to server
      const saveResponse = await fetch('/api/user/notifications/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save subscription');
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        subscription
      }));

      setLoading(false);
      return true;

    } catch (err) {
      console.error('Error subscribing to push notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
      setLoading(false);
      return false;
    }
  }, [state.isSupported]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.subscription) return true;

    setLoading(true);
    setError(null);

    try {
      // Remove subscription from server first – only then unsubscribe from browser
      const res = await fetch('/api/user/notifications/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: state.subscription.endpoint
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to remove subscription');
      }

      // Then unsubscribe from push manager so browser and server stay in sync
      await state.subscription.unsubscribe();

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        subscription: null
      }));

      setLoading(false);
      return true;

    } catch (err) {
      console.error('Error unsubscribing from push notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
      setLoading(false);
      return false;
    }
  }, [state.subscription]);

  // Send a test notification
  const sendTest = useCallback(async (): Promise<boolean> => {
    if (!state.isSubscribed) {
      setError('Not subscribed to notifications');
      return false;
    }

    try {
      const response = await fetch('/api/user/notifications/push/test', {
        method: 'POST'
      });

      return response.ok;
    } catch (err) {
      console.error('Error sending test notification:', err);
      return false;
    }
  }, [state.isSubscribed]);

  return {
    ...state,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTest
  };
}
