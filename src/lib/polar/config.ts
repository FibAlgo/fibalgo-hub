/**
 * Polar Payment Configuration
 * 
 * This module provides centralized configuration for Polar payments.
 * Switch between sandbox and production by changing POLAR_MODE in .env
 * 
 * Sandbox: https://sandbox.polar.sh
 * Production: https://polar.sh
 */

export type PolarEnvironment = 'sandbox' | 'production';

// Determine mode - default to sandbox if not set
const polarMode = (process.env.POLAR_MODE || 'sandbox').trim().toLowerCase() as PolarEnvironment;

// Environment configuration
export const POLAR_CONFIG = {
  // Current mode - controlled by environment variable
  mode: polarMode,
  
  // Access token for API calls
  accessToken: process.env.POLAR_ACCESS_TOKEN || '',
  
  // Webhook secret for verifying incoming webhooks
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET || '',
  
  // Organization ID
  organizationId: process.env.POLAR_ORGANIZATION_ID || '',
  
  // API Base URLs
  apiUrl: {
    sandbox: 'https://sandbox-api.polar.sh/v1',
    production: 'https://api.polar.sh/v1',
  },
  
  // Dashboard URLs
  dashboardUrl: {
    sandbox: 'https://sandbox.polar.sh',
    production: 'https://polar.sh',
  },
  
  // Checkout URLs
  checkoutUrl: {
    sandbox: 'https://sandbox.polar.sh',
    production: 'https://polar.sh',
  },
} as const;

// Get current API URL based on mode
export function getApiUrl(): string {
  const mode = POLAR_CONFIG.mode;
  const url = POLAR_CONFIG.apiUrl[mode];
  // Fallback to sandbox if somehow still undefined
  return url || 'https://sandbox-api.polar.sh/v1';
}

// Get current dashboard URL based on mode
export function getDashboardUrl(): string {
  return POLAR_CONFIG.dashboardUrl[POLAR_CONFIG.mode];
}

// Check if we're in sandbox mode
export function isSandbox(): boolean {
  return POLAR_CONFIG.mode === 'sandbox';
}

// Validate configuration
export function validatePolarConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!POLAR_CONFIG.accessToken) {
    errors.push('POLAR_ACCESS_TOKEN is not set');
  }
  
  if (!POLAR_CONFIG.webhookSecret) {
    errors.push('POLAR_WEBHOOK_SECRET is not set');
  }
  
  if (!POLAR_CONFIG.organizationId) {
    errors.push('POLAR_ORGANIZATION_ID is not set');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Product IDs - Map your plan names to Polar product IDs
// These will be different in sandbox vs production
export const POLAR_PRODUCTS = {
  // Sandbox Product IDs (replace with your actual sandbox product IDs)
  sandbox: {
    basic: process.env.POLAR_PRODUCT_BASIC_SANDBOX || '',
    premium: process.env.POLAR_PRODUCT_PREMIUM_SANDBOX || '',
    ultimate: process.env.POLAR_PRODUCT_ULTIMATE_SANDBOX || '',
    lifetime: process.env.POLAR_PRODUCT_LIFETIME_SANDBOX || '',
  },
  // Production Product IDs (replace with your actual production product IDs)
  production: {
    basic: process.env.POLAR_PRODUCT_BASIC || '',
    premium: process.env.POLAR_PRODUCT_PREMIUM || '',
    ultimate: process.env.POLAR_PRODUCT_ULTIMATE || '',
    lifetime: process.env.POLAR_PRODUCT_LIFETIME || '',
  },
} as const;

// Get product ID for a plan based on current environment
export function getProductId(plan: 'basic' | 'premium' | 'ultimate' | 'lifetime'): string {
  const products = POLAR_PRODUCTS[POLAR_CONFIG.mode];
  return products[plan];
}

// Plan configuration with pricing (for display purposes)
export const PLAN_CONFIG = {
  basic: {
    name: 'Basic',
    description: 'Perfect for beginners',
    features: [
      'Access to basic indicators',
      'Email support',
      'Community access',
    ],
  },
  premium: {
    name: 'Premium',
    description: 'For serious traders',
    features: [
      'All Basic features',
      'Advanced indicators',
      'Priority email support',
      'Trading signals',
    ],
  },
  ultimate: {
    name: 'Ultimate',
    description: 'Maximum trading power',
    features: [
      'All Premium features',
      'All indicators unlocked',
      'VIP support',
      'Private community',
      '1-on-1 sessions',
    ],
  },
  lifetime: {
    name: 'Lifetime',
    description: 'One-time payment, forever access',
    features: [
      'All Ultimate features',
      'Lifetime updates',
      'No recurring payments',
    ],
  },
} as const;

export type PlanType = keyof typeof PLAN_CONFIG;
