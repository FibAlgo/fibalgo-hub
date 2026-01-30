/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 FibAlgo Data API Reference Guide
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tüm veri kategorileri için API kaynakları ve entegrasyon durumu
 * 
 * ✅ = Entegre edildi
 * 🔧 = Kısmen entegre
 * ⏳ = Entegrasyon bekliyor
 * 💰 = Ücretli API (alternatif ücretsiz var)
 */

export const API_DATA_SOURCES = {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. MARKET PRICES
  // ═══════════════════════════════════════════════════════════════════════════
  market_prices: {
    equities: {
      description: "Last trade price, bid/ask, daily OHLC",
      status: "✅ Entegre",
      module: "market-data.ts",
      apis: {
        free: [
          {
            name: "Yahoo Finance",
            url: "https://query1.finance.yahoo.com/v8/finance/chart/",
            rateLimit: "No official limit, ~100/min safe",
            features: ["real-time quotes", "historical OHLC", "market cap"],
            integrated: true
          },
          {
            name: "Finnhub",
            url: "https://finnhub.io/api/v1/",
            apiKey: "FINNHUB_API_KEY",
            rateLimit: "60 calls/min (free tier)",
            features: ["real-time quotes", "company profile", "earnings"],
            integrated: true
          },
          {
            name: "Alpha Vantage",
            url: "https://www.alphavantage.co/query",
            apiKey: "ALPHA_VANTAGE_API_KEY",
            rateLimit: "5 calls/min, 500/day (free)",
            features: ["real-time quotes", "intraday", "technicals"],
            integrated: false
          }
        ],
        paid: [
          { name: "Polygon.io", cost: "$29/mo starter", features: ["real-time", "15y history"] },
          { name: "Bloomberg", cost: "$20k+/year", features: ["professional grade"] },
          { name: "Refinitiv", cost: "$10k+/year", features: ["institutional data"] }
        ]
      }
    },
    
    forex_pairs: {
      description: "Spot FX, bid/ask, spreads",
      status: "✅ Entegre",
      module: "market-data.ts",
      apis: {
        free: [
          {
            name: "Yahoo Finance",
            url: "https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X",
            rateLimit: "Unlimited",
            features: ["major pairs", "historical"],
            integrated: true
          },
          {
            name: "Exchange Rate API",
            url: "https://open.er-api.com/v6/latest/USD",
            rateLimit: "1500/month free",
            features: ["150+ currencies"],
            integrated: false
          },
          {
            name: "Forex Factory Calendar",
            url: "https://www.forexfactory.com/calendar",
            features: ["economic calendar", "news events"],
            integrated: false
          }
        ],
        paid: [
          { name: "OANDA", cost: "$50/mo", features: ["spreads", "order book"] },
          { name: "Alpha Vantage Premium", cost: "$50/mo", features: ["intraday FX"] }
        ]
      }
    },
    
    crypto: {
      description: "Spot price, exchange prices, spreads",
      status: "✅ Entegre",
      module: "market-data.ts + onchain.ts",
      apis: {
        free: [
          {
            name: "Binance API",
            url: "https://api.binance.com/api/v3/",
            rateLimit: "1200 requests/min",
            features: ["spot prices", "klines", "24h stats", "order book"],
            integrated: true
          },
          {
            name: "CoinGecko",
            url: "https://api.coingecko.com/api/v3/",
            rateLimit: "10-50 calls/min (free)",
            features: ["10k+ coins", "market cap", "exchanges"],
            integrated: false
          },
          {
            name: "CoinCap",
            url: "https://api.coincap.io/v2/",
            rateLimit: "200 requests/min",
            features: ["real-time via WebSocket", "markets"],
            integrated: false
          },
          {
            name: "Kraken",
            url: "https://api.kraken.com/0/public/",
            rateLimit: "1 req/sec public",
            features: ["spot", "OHLC"],
            integrated: false
          }
        ],
        paid: [
          { name: "CoinGecko Pro", cost: "$129/mo", features: ["higher limits"] },
          { name: "CryptoCompare", cost: "$79/mo", features: ["institutional data"] }
        ]
      }
    },
    
    commodities: {
      description: "Spot & futures prices, curves",
      status: "✅ Entegre",
      module: "market-data.ts",
      apis: {
        free: [
          {
            name: "Yahoo Finance",
            url: "Query with symbols like GC=F (Gold), CL=F (Oil)",
            features: ["Gold", "Silver", "Oil", "Natural Gas"],
            integrated: true
          },
          {
            name: "Metals API (Free Tier)",
            url: "https://metals-api.com/api/",
            rateLimit: "50/month free",
            features: ["precious metals"],
            integrated: false
          }
        ],
        paid: [
          { name: "Quandl (Nasdaq Data Link)", cost: "varies", features: ["futures curves"] },
          { name: "CME Data", cost: "$500+/mo", features: ["official exchange data"] }
        ]
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. INTRADAY & HISTORICAL
  // ═══════════════════════════════════════════════════════════════════════════
  intraday_historical: {
    intraday_OHLC: {
      description: "1m/5m/15m bars for short-term impact analysis",
      status: "✅ Entegre",
      module: "market-data.ts",
      apis: {
        free: [
          {
            name: "Yahoo Finance",
            url: "interval=1m&range=7d",
            rateLimit: "Unlimited",
            features: ["1m, 5m, 15m, 1h candles", "7 days history"],
            integrated: true,
            note: "1m data only available for last 7 days"
          },
          {
            name: "Binance Klines",
            url: "https://api.binance.com/api/v3/klines",
            features: ["1m to 1M intervals", "1000 candles per request"],
            integrated: true
          },
          {
            name: "Finnhub Candles",
            url: "https://finnhub.io/api/v1/stock/candle",
            features: ["1, 5, 15, 30, 60, D, W, M"],
            integrated: true
          },
          {
            name: "Alpha Vantage",
            url: "function=TIME_SERIES_INTRADAY",
            rateLimit: "5/min free",
            features: ["1, 5, 15, 30, 60min"],
            integrated: false
          }
        ],
        paid: [
          { name: "Polygon.io", cost: "$29/mo", features: ["unlimited intraday", "15y history"] }
        ]
      }
    },
    
    historical_OHLC: {
      description: "1y-10y history for trend / analog analysis",
      status: "✅ Entegre",
      module: "market-data.ts",
      apis: {
        free: [
          {
            name: "Yahoo Finance",
            url: "range=10y&interval=1d",
            features: ["Full history back to IPO", "daily/weekly/monthly"],
            integrated: true
          },
          {
            name: "Finnhub",
            features: ["Daily candles", "company history"],
            integrated: true
          }
        ]
      }
    },
    
    volatility_metrics: {
      description: "Realized / implied vol, VIX, crypto vol",
      status: "✅ Entegre",
      module: "volatility.ts",
      apis: {
        free: [
          {
            name: "Yahoo Finance (VIX)",
            url: "symbol=^VIX",
            features: ["VIX index", "VIX futures (VXX, UVXY)"],
            integrated: true
          },
          {
            name: "Calculated from OHLC",
            features: ["Realized volatility", "ATR", "Bollinger Bands"],
            integrated: true,
            note: "Hesaplanıyor - API gerekmiyor"
          },
          {
            name: "Deribit (Crypto IV)",
            url: "https://www.deribit.com/api/v2/public/",
            features: ["BTC/ETH implied volatility", "DVol index"],
            integrated: false
          }
        ],
        paid: [
          { name: "CBOE Options", cost: "varies", features: ["official IV data"] }
        ]
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. VOLATILITY & RISK
  // ═══════════════════════════════════════════════════════════════════════════
  volatility_risk: {
    implied_volatility: {
      description: "Options-based IV",
      status: "🔧 Kısmen",
      module: "volatility.ts",
      apis: {
        free: [
          {
            name: "VIX via Yahoo",
            integrated: true
          },
          {
            name: "Deribit DVol",
            url: "https://www.deribit.com/api/v2/public/get_volatility_index_data",
            features: ["BTC DVol", "ETH DVol"],
            integrated: false,
            note: "Crypto IV için ücretsiz"
          }
        ]
      }
    },
    
    short_interest_funding: {
      description: "Crypto & equities short interest / funding rates",
      status: "✅ Entegre",
      module: "sentiment.ts + onchain.ts",
      apis: {
        free: [
          {
            name: "Yahoo Finance",
            features: ["Short interest", "Days to cover"],
            integrated: true
          },
          {
            name: "Binance Funding",
            url: "https://fapi.binance.com/fapi/v1/fundingRate",
            features: ["Perpetual funding rates"],
            integrated: true
          },
          {
            name: "Coinglass",
            url: "https://open-api.coinglass.com/",
            features: ["Funding rates", "Open interest", "Liquidations"],
            apiKey: "COINGLASS_API_KEY",
            integrated: false,
            note: "Free tier: 1000 calls/month"
          }
        ]
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. MACRO & POLICY
  // ═══════════════════════════════════════════════════════════════════════════
  macro_policy: {
    central_bank_rates: {
      description: "Fed, ECB, BoJ policy statements",
      status: "⏳ Bekliyor",
      apis: {
        free: [
          {
            name: "FRED API",
            url: "https://api.stlouisfed.org/fred/",
            apiKey: "FRED_API_KEY",
            rateLimit: "120 requests/min",
            features: [
              "Fed Funds Rate (FEDFUNDS)",
              "10Y Treasury (DGS10)",
              "2Y Treasury (DGS2)",
              "Yield Curve",
              "M2 Money Supply"
            ],
            integrated: false,
            signupUrl: "https://fred.stlouisfed.org/docs/api/api_key.html",
            note: "TAMAMEN ÜCRETSİZ - En kapsamlı makro veri kaynağı"
          },
          {
            name: "Trading Economics (Scraped)",
            url: "https://tradingeconomics.com/calendar",
            features: ["Economic calendar"],
            integrated: false
          }
        ]
      },
      recommended: "FRED API - Ücretsiz, güvenilir, kapsamlı"
    },
    
    cpi_ppi: {
      description: "Inflation indicators",
      status: "⏳ Bekliyor",
      apis: {
        free: [
          {
            name: "FRED API",
            series: [
              "CPIAUCSL (CPI All Urban)",
              "CPILFESL (Core CPI)",
              "PPIACO (PPI All Commodities)",
              "PCE (Personal Consumption)"
            ],
            integrated: false
          },
          {
            name: "BLS API",
            url: "https://api.bls.gov/publicAPI/v2/",
            rateLimit: "50/day unregistered, 500/day registered",
            features: ["Official CPI/PPI data"],
            integrated: false
          }
        ]
      }
    },
    
    gdp_unemployment: {
      description: "Macro fundamentals",
      status: "⏳ Bekliyor",
      apis: {
        free: [
          {
            name: "FRED API",
            series: [
              "GDP (Real GDP)",
              "UNRATE (Unemployment Rate)",
              "PAYEMS (Nonfarm Payrolls)",
              "ICSA (Initial Jobless Claims)"
            ],
            integrated: false
          },
          {
            name: "World Bank API",
            url: "https://api.worldbank.org/v2/",
            features: ["Global GDP", "International data"],
            integrated: false
          }
        ]
      }
    },
    
    economic_calendar: {
      description: "Upcoming economic events",
      status: "⏳ Bekliyor",
      apis: {
        free: [
          {
            name: "Finnhub Economic Calendar",
            url: "https://finnhub.io/api/v1/calendar/economic",
            features: ["Fed meetings", "CPI releases", "GDP"],
            integrated: false,
            note: "Mevcut API key ile kullanılabilir"
          },
          {
            name: "Investing.com Calendar",
            features: ["Comprehensive calendar"],
            note: "Scraping gerekli"
          }
        ]
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. COMPANY FUNDAMENTALS
  // ═══════════════════════════════════════════════════════════════════════════
  company_fundamentals: {
    financial_statements: {
      description: "Income, balance sheet, cash flows",
      status: "🔧 Kısmen",
      module: "fundamentals.ts",
      apis: {
        free: [
          {
            name: "Finnhub Basic Financials",
            features: ["Key metrics", "Ratios"],
            integrated: true
          },
          {
            name: "Finnhub Financials",
            url: "https://finnhub.io/api/v1/stock/",
            apiKey: "FINNHUB_API_KEY",
            rateLimit: "60/min free",
            features: [
              "Company Profile (profile2)",
              "Basic Financials & Metrics (metric)",
              "SEC Filings (financials-reported)",
              "Recommendation Trends",
              "Earnings Calendar",
              "P/E, EPS, ROE, Revenue/Share"
            ],
            integrated: true,
            note: "✅ FMP yerine kullanılıyor - API key mevcut"
          },
          {
            name: "Financial Modeling Prep (FMP)",
            url: "https://financialmodelingprep.com/api/v3/",
            apiKey: "FMP_API_KEY",
            rateLimit: "250/day free",
            features: [
              "Income statements",
              "Balance sheets",
              "Cash flow",
              "10+ years history"
            ],
            integrated: false,
            signupUrl: "https://financialmodelingprep.com/developer/docs/",
            note: "❌ DEPRECATED - Legacy endpoints 31 Ağustos 2025'te kapandı"
          },
          {
            name: "SEC EDGAR",
            url: "https://data.sec.gov/",
            features: ["Official 10-K, 10-Q filings", "13F filings"],
            integrated: false,
            note: "Tamamen ücretsiz, official data"
          }
        ]
      },
      recommended: "Finnhub API - Mevcut API key ile çalışıyor, FMP deprecated"
    },
    
    earnings_announcements: {
      description: "EPS, revenue, guidance",
      status: "✅ Entegre",
      module: "fundamentals.ts",
      apis: {
        free: [
          {
            name: "Finnhub Earnings",
            features: ["Earnings calendar", "Surprise history"],
            integrated: true
          },
          {
            name: "FMP Earnings Calendar",
            url: "https://financialmodelingprep.com/api/v3/earning_calendar",
            integrated: false
          }
        ]
      }
    },
    
    insider_trades: {
      description: "SEC Form 4 / 13F",
      status: "⏳ Bekliyor",
      apis: {
        free: [
          {
            name: "Finnhub Insider Transactions",
            url: "https://finnhub.io/api/v1/stock/insider-transactions",
            integrated: true,
            note: "Mevcut API key ile kullanılabilir"
          },
          {
            name: "SEC EDGAR API",
            url: "https://data.sec.gov/submissions/",
            features: ["Form 4", "13F filings", "All SEC filings"],
            integrated: false,
            note: "Official, tamamen ücretsiz"
          },
          {
            name: "OpenInsider (Scraped)",
            url: "http://openinsider.com/",
            features: ["Aggregated insider trades"],
            integrated: false
          }
        ]
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. HISTORICAL ANALOGS
  // ═══════════════════════════════════════════════════════════════════════════
  historical_analogs: {
    past_events_database: {
      description: "Market + macro response to historical events",
      status: "✅ Entegre",
      module: "historical.ts",
      note: "Local database with 12+ major events, expandable"
    },
    
    historical_price_data: {
      description: "Long-term price history for analog analysis",
      status: "✅ Entegre",
      apis: {
        free: [
          {
            name: "Yahoo Finance",
            features: ["Full price history", "Adjusted close"],
            integrated: true
          }
        ]
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. CRYPTO ON-CHAIN
  // ═══════════════════════════════════════════════════════════════════════════
  crypto_onchain: {
    wallet_flows: {
      description: "Exchange inflow/outflow",
      status: "🔧 Kısmen",
      module: "onchain.ts",
      apis: {
        free: [
          {
            name: "Blockchain.com Explorer",
            url: "https://blockchain.info/rawaddr/",
            features: ["BTC wallet balances", "transactions"],
            integrated: false
          },
          {
            name: "Whale Alert (Free Tier)",
            url: "https://api.whale-alert.io/",
            apiKey: "WHALE_ALERT_API_KEY",
            rateLimit: "10 requests/min free",
            features: ["Large transactions", "$100k+ alerts"],
            integrated: false,
            note: "Free tier limited but useful"
          }
        ],
        paid: [
          { name: "Glassnode", cost: "$29/mo", features: ["comprehensive on-chain"] },
          { name: "CryptoQuant", cost: "$49/mo", features: ["exchange flows"] }
        ]
      }
    },
    
    funding_rates: {
      description: "Derivatives market health",
      status: "✅ Entegre",
      module: "onchain.ts",
      apis: {
        free: [
          {
            name: "Binance Funding Rates",
            integrated: true
          },
          {
            name: "Coinglass Open API",
            url: "https://open-api.coinglass.com/public/v2/funding",
            features: ["Funding rates", "Open interest", "Liquidations"],
            integrated: false
          }
        ]
      }
    },
    
    liquidations: {
      description: "Liquidation data",
      status: "🔧 Kısmen",
      module: "onchain.ts",
      apis: {
        free: [
          {
            name: "Coinglass",
            url: "https://open-api.coinglass.com/public/v2/liquidation_history",
            features: ["24h liquidations", "By exchange"],
            integrated: false
          }
        ]
      }
    },
    
    stablecoin_flows: {
      description: "USDT/USDC market cap changes",
      status: "🔧 Kısmen",
      module: "onchain.ts",
      apis: {
        free: [
          {
            name: "CoinGecko",
            url: "https://api.coingecko.com/api/v3/coins/tether",
            features: ["Market cap", "Supply"],
            integrated: false
          }
        ]
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. NEWS & SENTIMENT
  // ═══════════════════════════════════════════════════════════════════════════
  news_metadata_sentiment: {
    news_sources: {
      description: "News aggregation with metadata",
      status: "✅ Entegre",
      module: "news-metadata.ts",
      apis: {
        free: [
          {
            name: "Finnhub News",
            features: ["Company news", "General news", "Forex news"],
            integrated: true
          },
          {
            name: "NewsAPI.org",
            url: "https://newsapi.org/v2/",
            apiKey: "NEWSAPI_KEY",
            rateLimit: "100/day free (dev only)",
            features: ["80k+ sources", "Search", "Headlines"],
            integrated: false,
            note: "Free tier development only, $449/mo production"
          },
          {
            name: "GNews API",
            url: "https://gnews.io/api/v4/",
            apiKey: "GNEWS_API_KEY",
            rateLimit: "100/day free",
            features: ["Top headlines", "Search"],
            integrated: false,
            signupUrl: "https://gnews.io/"
          },
          {
            name: "Currents API",
            url: "https://api.currentsapi.services/v1/",
            rateLimit: "600/day free",
            features: ["Global news"],
            integrated: false
          }
        ],
        paid: [
          { name: "RavenPack", cost: "$1000+/mo", features: ["NLP sentiment"] },
          { name: "Accern", cost: "$500+/mo", features: ["AI sentiment"] }
        ]
      }
    },
    
    sentiment_analysis: {
      description: "Positive/negative/neutral scoring",
      status: "✅ Entegre",
      module: "news-metadata.ts",
      note: "Local NLP - keyword-based sentiment analysis implemented"
    },
    
    source_reliability: {
      description: "News source scoring",
      status: "✅ Entegre",
      module: "news-metadata.ts",
      note: "20+ sources with reliability scores"
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. POSITIONING & FLOW
  // ═══════════════════════════════════════════════════════════════════════════
  positioning_market_flow: {
    cftc_commitments: {
      description: "Futures positions (COT Report)",
      status: "⏳ Bekliyor",
      apis: {
        free: [
          {
            name: "CFTC Official",
            url: "https://www.cftc.gov/MarketReports/CommitmentsofTraders/",
            features: ["Weekly COT data", "Historical"],
            integrated: false,
            note: "CSV/Excel format, parsing gerekli"
          },
          {
            name: "Quandl CFTC",
            url: "https://data.nasdaq.com/data/CFTC",
            features: ["COT data API format"],
            apiKey: "QUANDL_API_KEY",
            integrated: false
          }
        ]
      }
    },
    
    put_call_ratio: {
      description: "Options sentiment",
      status: "✅ Entegre",
      module: "sentiment.ts",
      note: "VIX-based estimation implemented"
    },
    
    institutional_positioning: {
      description: "Hedge fund / institutional filings",
      status: "🔧 Kısmen",
      module: "sentiment.ts",
      apis: {
        free: [
          {
            name: "Yahoo Finance Holders",
            features: ["Top institutional holders"],
            integrated: true
          },
          {
            name: "SEC EDGAR 13F",
            url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=13F",
            features: ["Quarterly 13F filings"],
            integrated: false,
            note: "Quarterly data, parsing gerekli"
          }
        ]
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. SOCIAL SENTIMENT
  // ═══════════════════════════════════════════════════════════════════════════
  social_sentiment: {
    twitter_reddit: {
      description: "Social media sentiment",
      status: "🔧 Kısmen",
      module: "sentiment.ts",
      apis: {
        free: [
          {
            name: "Finnhub Social Sentiment",
            features: ["Reddit + Twitter mentions"],
            integrated: true
          },
          {
            name: "Reddit API",
            url: "https://www.reddit.com/dev/api/",
            features: ["Subreddit posts", "Comments"],
            note: "OAuth required, rate limited"
          }
        ],
        paid: [
          { name: "LunarCrush", cost: "$150/mo", features: ["Crypto social metrics"] },
          { name: "Santiment", cost: "$49/mo", features: ["Social volume"] }
        ]
      }
    },
    
    fear_greed_index: {
      description: "Market sentiment index",
      status: "✅ Entegre",
      module: "macro-data.ts",
      apis: {
        free: [
          {
            name: "Alternative.me Fear & Greed",
            url: "https://api.alternative.me/fng/",
            features: ["Crypto Fear & Greed", "Historical"],
            integrated: true
          }
        ]
      }
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// RECOMMENDED FREE API KEYS TO ADD
// ═══════════════════════════════════════════════════════════════════════════════

export const RECOMMENDED_API_KEYS = {
  priority_1: {
    name: "FRED API",
    purpose: "Macroeconomic data (CPI, GDP, Fed rates, unemployment)",
    cost: "FREE",
    signupUrl: "https://fred.stlouisfed.org/docs/api/api_key.html",
    envVar: "FRED_API_KEY",
    value: "CRITICAL for macro analysis"
  },
  
  priority_2: {
    name: "Financial Modeling Prep",
    purpose: "Full financial statements, DCF, fundamentals",
    cost: "FREE (250 calls/day)",
    signupUrl: "https://financialmodelingprep.com/developer/docs/",
    envVar: "FMP_API_KEY",
    value: "Better than Finnhub for financials"
  },
  
  priority_3: {
    name: "Alpha Vantage",
    purpose: "Backup for intraday data, technical indicators",
    cost: "FREE (5 calls/min)",
    signupUrl: "https://www.alphavantage.co/support/#api-key",
    envVar: "ALPHA_VANTAGE_API_KEY",
    value: "Good backup, pre-calculated technicals"
  },
  
  priority_4: {
    name: "CoinGecko",
    purpose: "Comprehensive crypto data",
    cost: "FREE (10-50 calls/min)",
    signupUrl: "https://www.coingecko.com/en/api",
    envVar: "COINGECKO_API_KEY",
    value: "10k+ coins, better than Binance for coverage"
  },
  
  priority_5: {
    name: "Polygon.io",
    purpose: "Real-time + extensive historical data",
    cost: "$29/mo (worth it for unlimited intraday)",
    signupUrl: "https://polygon.io/",
    envVar: "POLYGON_API_KEY",
    value: "Best value paid option"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CURRENT INTEGRATION STATUS SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

export const INTEGRATION_STATUS = {
  fully_integrated: [
    "Market Prices (Equities, Forex, Crypto, Commodities)",
    "Intraday & Historical OHLC",
    "Volatility Metrics (VIX, Realized Vol, ATR)",
    "Company Basic Metrics",
    "Earnings Calendar",
    "Short Interest",
    "Funding Rates (Crypto)",
    "News Metadata & Sentiment",
    "Historical Analogs Database",
    "Fear & Greed Index"
  ],
  
  partially_integrated: [
    "Financial Statements (basic only)",
    "Social Sentiment (Finnhub only)",
    "Crypto On-chain (funding rates only)",
    "Put/Call Ratio (VIX estimation)",
    "Institutional Holdings (basic)"
  ],
  
  not_yet_integrated: [
    "FRED Macro Data (CPI, GDP, Unemployment, Fed Rates) ← PRIORITY",
    "Full Financial Statements (FMP)",
    "CFTC COT Data",
    "SEC EDGAR Filings",
    "Economic Calendar Events",
    "Crypto Exchange Flows (Glassnode level)",
    "Options Chain Data"
  ]
};
