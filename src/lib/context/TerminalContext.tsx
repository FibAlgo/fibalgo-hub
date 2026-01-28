'use client';

import { createContext, useContext, ReactNode } from 'react';
import { CachedUserData } from '@/lib/userCache';

interface TerminalContextType {
  user: { id: string; email: string } | null;
  userData: CachedUserData | null;
  isPremium: boolean;
  profileName: string;
  profileAvatarUrl: string | null;
  isLoading: boolean;
  isScrollingDown: boolean;
  setIsScrollingDown: (value: boolean) => void;
}

const TerminalContext = createContext<TerminalContextType | null>(null);

export function TerminalProvider({ 
  children,
  value
}: { 
  children: ReactNode;
  value: TerminalContextType;
}) {
  return (
    <TerminalContext.Provider value={value}>
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminal() {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminal must be used within a TerminalProvider');
  }
  return context;
}

// Hook for getting cached user data
export function useTerminalUser() {
  const { userData, isPremium, user } = useTerminal();
  return { userData, isPremium, user };
}
