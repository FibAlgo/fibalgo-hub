/**
 * Polar Module Index
 * 
 * Central export point for all Polar-related functionality.
 */

// Configuration
export { 
  POLAR_CONFIG, 
  POLAR_PRODUCTS,
  PLAN_CONFIG,
  getProductId,
  getApiUrl,
  getDashboardUrl,
  isSandbox,
  validatePolarConfig,
  type PolarEnvironment,
  type PlanType,
} from './config';

// Client
export { 
  getPolarClient, 
  createPolarClient,
} from './client';

// Service
export {
  createCheckoutSession,
  getCustomerByEmail,
  getCustomerSubscriptions,
  getCustomerOrders,
  cancelSubscription,
  processSuccessfulPayment,
  processSubscriptionCancellation,
  processRefund,
  getProducts,
} from './service';
