'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { X, ShoppingBag, Check } from 'lucide-react';

interface SocialProofData {
  name: string;
  countryCode: string;
  flagEmoji: string;
  timeAgo: string;
  plan: string;
  queueSize: number;
}

export default function SocialProofNotification() {
  const [data, setData] = useState<SocialProofData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationIndex = useRef<number>(0);

  const fetchSocialProof = useCallback(async () => {
    try {
      // Use index to cycle through the 100 queue entries
      const index = notificationIndex.current;
      notificationIndex.current = (notificationIndex.current + 1) % 100;
      
      const response = await fetch(`/api/social-proof?index=${index}&t=${Date.now()}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setData(result.data);
        setIsLoading(false);
        
        // Show notification
        if (!isDismissed) {
          setIsVisible(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch social proof:', error);
      setIsLoading(false);
    }
  }, [isDismissed]);

  useEffect(() => {
    // Initial fetch after delay
    const initialDelay = setTimeout(() => {
      fetchSocialProof();
    }, 3000);
    
    // Fetch every 60 seconds to get new user
    intervalRef.current = setInterval(() => {
      fetchSocialProof();
    }, 60000);
    
    return () => {
      clearTimeout(initialDelay);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchSocialProof]);

  // Auto-hide after 8 seconds, show new notification immediately
  useEffect(() => {
    if (!isVisible || isDismissed) return;
    
    const hideTimeout = setTimeout(() => {
      setIsVisible(false);
      
      // Show new notification immediately (after brief animation delay)
      setTimeout(() => {
        if (!isDismissed) {
          fetchSocialProof();
        }
      }, 500); // 500ms delay for smooth transition
    }, 8000); // Hide after 8 seconds
    
    return () => clearTimeout(hideTimeout);
  }, [isVisible, isDismissed, fetchSocialProof]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  if (isLoading || !data || isDismissed) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 transition-all duration-500 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.05)',
          maxWidth: '300px',
          minWidth: '260px',
        }}
      >
        {/* Shopping Bag Icon with Check */}
        <div
          style={{
            position: 'relative',
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: '#EEF2FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ShoppingBag size={20} style={{ color: '#4F46E5' }} />
          <div
            style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #FFFFFF',
            }}
          >
            <Check size={10} style={{ color: '#FFFFFF' }} />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              color: '#1F2937',
              fontSize: '14px',
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {data.name} {data.countryCode && (
              <img 
                src={`https://flagcdn.com/w40/${data.countryCode}.png`}
                srcSet={`https://flagcdn.com/w80/${data.countryCode}.png 2x`}
                width="20"
                height="15"
                alt={data.countryCode.toUpperCase()}
                style={{ borderRadius: '2px', verticalAlign: 'middle' }}
              />
            )}
          </p>
          <p
            style={{
              color: '#6B7280',
              fontSize: '13px',
              margin: '2px 0 0 0',
              lineHeight: 1.4,
            }}
          >
            purchased <span style={{ fontWeight: 600, color: '#4F46E5' }}>{data.plan}</span> plan
          </p>
          <p
            style={{
              color: '#9CA3AF',
              fontSize: '12px',
              margin: '4px 0 0 0',
            }}
          >
            {data.timeAgo}
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
            flexShrink: 0,
            marginTop: '-2px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          aria-label="Dismiss notification"
        >
          <X size={16} style={{ color: '#9CA3AF' }} />
        </button>
      </div>
    </div>
  );
}