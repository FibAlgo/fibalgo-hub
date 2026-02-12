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
      'https://www.instagram.com/fibalgoai',
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
      ratingValue: 4.8,
      reviewCount: 150,
      bestRating: 5,
      worstRating: 1,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function FAQJsonLd({ questions }: { questions?: { question: string; answer: string }[] }) {
  // If localized questions are provided, use them; otherwise fall back to English defaults
  const faqItems = questions && questions.length > 0
    ? questions
    : [
      {
        question: 'What is FibAlgo and how does it work?',
        answer: 'FibAlgo is an AI-powered trading indicator suite for TradingView. Our algorithms analyze market data in real-time to provide accurate buy/sell signals, entry zones, and risk management suggestions. Simply add our indicators to your TradingView chart and follow the signals.',
      },
      {
        question: 'Which markets do your indicators support?',
        answer: 'Our indicators work on any market available on TradingView including Forex, Cryptocurrencies, Stocks, Commodities, and Indices. The AI adapts to different market conditions and volatility levels automatically.',
      },
      {
        question: 'How accurate are the trading signals?',
        answer: 'Our indicators have shown a historical accuracy rate of +55% depending on market conditions and timeframe. However, past performance does not guarantee future results. We recommend using proper risk management and never trading more than you can afford to lose.',
      },
      {
        question: 'Do I need TradingView to use FibAlgo?',
        answer: 'Yes, FibAlgo indicators are designed specifically for TradingView. You\\u0027ll need at least a free TradingView account. For the best experience, we recommend TradingView Pro or higher for multiple indicator access.',
      },
      {
        question: "What's the difference between Premium and Ultimate plans?",
        answer: 'The Premium plan (€24.99/month) gives you full access to FibAlgo Hub with AI-powered market analysis, real-time news, and signals. The Ultimate plan (€49.99/month) includes everything in Premium plus all TradingView indicators and exclusive trading strategies.',
      },
      {
        question: 'Can I cancel my subscription anytime?',
        answer: "Yes, you can cancel your subscription at any time. You'll retain access until the end of your billing period.",
      },
      {
        question: 'Is there a free trial?',
        answer: 'Yes! Our Free plan gives you access to basic signals through our Telegram channel. This lets you experience our signal quality before committing to a paid plan.',
      },
      {
        question: 'How do I get support?',
        answer: 'All paid members get access to our private Telegram community where you can ask questions and get support from our team and other traders. We also provide email support for technical issues.',
      },
    ];

  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
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
    itemListElement: items.map((item, index) => {
      const entry: Record<string, unknown> = {
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
      };
      // Google recommends NOT including 'item' for the last breadcrumb (current page)
      if (index < items.length - 1) {
        entry.item = item.url;
      }
      return entry;
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
