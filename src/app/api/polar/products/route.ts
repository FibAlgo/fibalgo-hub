/**
 * Polar Products API
 * 
 * Fetches available products from Polar for display on pricing page.
 * Automatically uses sandbox or production based on POLAR_MODE.
 */

import { NextRequest, NextResponse } from 'next/server';
import { POLAR_CONFIG, getApiUrl, isSandbox } from '@/lib/polar';

export async function GET(request: NextRequest) {
  try {
    // Fetch products from Polar via REST API
    const response = await fetch(
      `${getApiUrl()}/products/?organization_id=${POLAR_CONFIG.organizationId}&is_archived=false`,
      {
        headers: {
          'Authorization': `Bearer ${POLAR_CONFIG.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Polar products error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch products',
        environment: POLAR_CONFIG.mode,
      }, { status: 500 });
    }

    const data = await response.json();
    const products = data.items || [];
    
    // Format products for frontend
    interface PolarPrice {
      id: string;
      amount_type: string;
      price_amount?: number;
      price_currency?: string;
      type: string;
      recurring_interval?: string;
    }

    interface PolarBenefit {
      id: string;
      type: string;
      description?: string;
    }

    interface PolarProduct {
      id: string;
      name: string;
      description?: string;
      is_recurring?: boolean;
      prices?: PolarPrice[];
      benefits?: PolarBenefit[];
      metadata?: Record<string, unknown>;
    }

    const formattedProducts = products.map((product: PolarProduct) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      isRecurring: product.is_recurring,
      prices: product.prices?.map((price: PolarPrice) => ({
        id: price.id,
        amount: price.amount_type === 'fixed' ? price.price_amount : null,
        currency: price.price_currency,
        interval: price.type === 'recurring' ? price.recurring_interval : 'one_time',
      })),
      benefits: product.benefits?.map((benefit: PolarBenefit) => ({
        id: benefit.id,
        type: benefit.type,
        description: benefit.description,
      })),
      metadata: product.metadata,
    }));
    
    return NextResponse.json({
      success: true,
      environment: POLAR_CONFIG.mode,
      isSandbox: isSandbox(),
      products: formattedProducts,
    });
    
  } catch (error) {
    console.error('Error fetching Polar products:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch products',
      environment: POLAR_CONFIG.mode,
    }, { status: 500 });
  }
}
