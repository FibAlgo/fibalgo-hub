// Supabase Configuration
// TODO: Replace with your actual Supabase credentials

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
};

// Polar Configuration
export const polarConfig = {
  organizationId: 'fibalgo',
  productId: process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID || '',
  mode: process.env.POLAR_MODE || 'sandbox',
  products: {
    premium: process.env.NEXT_PUBLIC_POLAR_PREMIUM_PRODUCT_ID || '',
    ultimate: process.env.NEXT_PUBLIC_POLAR_ULTIMATE_PRODUCT_ID || '',
  },
};

// App Configuration
export const appConfig = {
  name: 'FibAlgo Hub',
  description: 'AI-Powered Trading Intelligence Platform',
  url: 'https://fibalgo.com',
  
  // Subscription Plans
  plans: {
    basic: {
      id: 'basic',
      name: 'Basic',
      price: 0,
      period: 'forever',
      polarProductId: null,
      features: [
        'Basic Access via FibAlgo HUB',
        'Access via FibAlgo HUB Telegram',
        'Daily Market Analysis',
        'Community Access',
        'Educational Content',
      ],
    },
    premium: {
      id: 'premium',
      name: 'Premium',
      price: 49.99,
      period: 'month',
      polarProductId: (process.env.NEXT_PUBLIC_POLAR_PREMIUM_PRODUCT_ID || '45b483d8-3b24-44cc-967d-bf3b053942d9').trim(),
      features: [
        'All Basic Features',
        'FibAlgo Hub Full Access',
        'AI-Powered Market Analysis',
        'Real-Time News & Signals',
        'Economic Calendar',
        'Priority Support',
      ],
    },
    ultimate: {
      id: 'ultimate',
      name: 'Ultimate',
      price: 99.99,
      period: 'month',
      polarProductId: (process.env.NEXT_PUBLIC_POLAR_ULTIMATE_PRODUCT_ID || '0ab5351b-4c45-44ee-8ae7-dc9721d595dd').trim(),
      features: [
        'Everything in Premium',
        'All TradingView Indicators',
        'Exclusive Trading Strategies',
        'Weekly Live Sessions',
        'VIP Community Access',
        '1-on-1 Support',
      ],
    },
  },
  
  // Social Links
  social: {
    telegram: 'https://t.me/fibalgo',
    twitter: 'https://x.com/fibalgoai',
    instagram: 'https://instagram.com/fibalgo',
    youtube: 'https://www.youtube.com/@fibalgoai',
  },
};

// Subscription plan type
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  polarProductId: string | null;
  features: string[];
}

// Export subscription plans as array for easier mapping
export const subscriptionPlans: SubscriptionPlan[] = Object.values(appConfig.plans);
