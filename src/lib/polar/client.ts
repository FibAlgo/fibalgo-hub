/**
 * Polar SDK Client
 * 
 * Centralized Polar client that automatically uses the correct environment
 * based on POLAR_MODE setting.
 */

import { Polar } from '@polar-sh/sdk';
import { POLAR_CONFIG } from './config';

// Singleton Polar client
let polarClient: Polar | null = null;

/**
 * Get the Polar client instance
 * Uses singleton pattern to avoid creating multiple clients
 */
export function getPolarClient(): Polar {
  if (!polarClient) {
    if (!POLAR_CONFIG.accessToken) {
      throw new Error('POLAR_ACCESS_TOKEN is not configured');
    }
    
    polarClient = new Polar({
      accessToken: POLAR_CONFIG.accessToken,
      server: POLAR_CONFIG.mode, // 'sandbox' or 'production'
    });
  }
  
  return polarClient;
}

/**
 * Create a new Polar client (useful for testing or specific cases)
 */
export function createPolarClient(accessToken?: string, mode?: 'sandbox' | 'production'): Polar {
  return new Polar({
    accessToken: accessToken || POLAR_CONFIG.accessToken,
    server: mode || POLAR_CONFIG.mode,
  });
}

// Re-export useful types from Polar SDK
export type { Polar } from '@polar-sh/sdk';
