// Structured data (JSON-LD) components for SEO
// These render invisible <script type="application/ld+json"> tags in the page head

export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FibAlgo',
    url: 'https://fibalgo.com',
    logo: 'https://fibalgo.com/images/websitelogo.jpg',
    description:
      'AI-powered trading indicators and signals for TradingView. Trusted by 10,000+ traders worldwide.',
    sameAs: [
      'https://x.com/fibalgoai',
      'https://instagram.com/fibalgo',
      'https://www.youtube.com/@fibalgoai',
      'https://t.me/fibalgo',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@fibalgo.com',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function WebSiteJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FibAlgo',
    url: 'https://fibalgo.com',
    description:
      'AI-powered trading indicators and signals platform for TradingView.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://fibalgo.com/library?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'FibAlgo',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    url: 'https://fibalgo.com',
    description:
      'AI-powered trading indicator suite for TradingView. Get precise buy/sell signals, entry & exit zones for Forex, Crypto, and Stocks.',
    offers: [
      {
        '@type': 'Offer',
        name: 'Basic',
        price: '0',
        priceCurrency: 'EUR',
        description: 'Free access with basic signals and daily market analysis.',
      },
      {
        '@type': 'Offer',
        name: 'Premium (HUB)',
        price: '24.99',
        priceCurrency: 'EUR',
        description:
          'Full FibAlgo Hub access with AI-powered market analysis, real-time news & signals.',
      },
      {
        '@type': 'Offer',
        name: 'Ultimate (HUB & Indicator)',
        price: '49.99',
        priceCurrency: 'EUR',
        description:
          'Everything in Premium plus all TradingView indicators, exclusive strategies, and 1-on-1 support.',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '150',
      bestRating: '5',
      worstRating: '1',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function FAQJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is FibAlgo and how does it work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'FibAlgo is an AI-powered trading indicator suite for TradingView. Our algorithms analyze market data in real-time to provide accurate buy/sell signals, entry zones, and risk management suggestions. Simply add our indicators to your TradingView chart and follow the signals.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which markets do your indicators support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our indicators work on any market available on TradingView including Forex, Cryptocurrencies, Stocks, Commodities, and Indices. The AI adapts to different market conditions and volatility levels automatically.',
        },
      },
      {
        '@type': 'Question',
        name: 'How accurate are the trading signals?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our indicators have shown a historical accuracy rate of +55% depending on market conditions and timeframe. However, past performance does not guarantee future results. We recommend using proper risk management and never trading more than you can afford to lose.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need TradingView to use FibAlgo?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, FibAlgo indicators are designed specifically for TradingView. You\'ll need at least a free TradingView account. For the best experience, we recommend TradingView Pro or higher for multiple indicator access.',
        },
      },
      {
        '@type': 'Question',
        name: "What's the difference between Premium and Ultimate plans?",
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The Premium plan (€24.99/month) gives you full access to FibAlgo Hub with AI-powered market analysis, real-time news, and signals. The Ultimate plan (€49.99/month) includes everything in Premium plus all TradingView indicators and exclusive trading strategies.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I cancel my subscription anytime?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Yes, you can cancel your subscription at any time. You'll retain access until the end of your billing period.",
        },
      },
      {
        '@type': 'Question',
        name: 'Is there a free trial?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! Our Free plan gives you access to basic signals through our Telegram channel. This lets you experience our signal quality before committing to a paid plan.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I get support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'All paid members get access to our private Telegram community where you can ask questions and get support from our team and other traders. We also provide email support for technical issues.',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
