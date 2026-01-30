/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📚 MASTER API REFERENCE - TÜM VERİ KAYNAKLARI
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bu dosya tüm veri kategorileri için kullanılabilecek API'leri listeler.
 * ✅ = Aktif ve çalışıyor
 * 🔧 = Modül var ama test gerekli
 * ⏳ = Eklenecek
 * ❌ = Ücretli / Erişilemez
 * 
 * TOPLAM: 9 Kategori, 35+ Veri Tipi
 */

export const API_MASTER_REFERENCE = {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. MARKET PRICES - Fiyat Verileri
  // ═══════════════════════════════════════════════════════════════════════════
  market_prices: {
    equities: {
      description: "Last trade price, bid/ask, daily OHLC",
      frequency: "real-time",
      apis: {
        primary: {
          name: "Yahoo Finance",
          status: "✅ ACTIVE",
          module: "market-data.ts",
          function: "fetchYahooQuote(symbol)",
          rateLimit: "2000/hour",
          apiKey: false,
          coverage: "US, EU, Asia stocks"
        },
        secondary: {
          name: "Finnhub",
          status: "✅ ACTIVE",
          module: "market-data.ts",
          function: "fetchFinnhubQuote(symbol)",
          rateLimit: "60/min free",
          apiKey: "FINNHUB_API_KEY",
          coverage: "US stocks, limited EU"
        },
        alternatives: [
          { name: "Polygon.io", cost: "$29/mo", note: "Better for options" },
          { name: "Alpha Vantage", cost: "Free 25/day", note: "Slow but reliable" },
          { name: "IEX Cloud", cost: "$9/mo", note: "Good for US only" }
        ]
      }
    },
    
    forex_pairs: {
      description: "Spot FX, bid/ask, spreads",
      frequency: "real-time",
      apis: {
        primary: {
          name: "Yahoo Finance",
          status: "✅ ACTIVE",
          module: "market-data.ts",
          function: "fetchYahooQuote('EURUSD=X')",
          rateLimit: "2000/hour",
          apiKey: false,
          symbols: "EURUSD=X, GBPUSD=X, USDJPY=X, etc."
        },
        secondary: {
          name: "Finnhub",
          status: "✅ ACTIVE",
          module: "market-data.ts",
          function: "fetchFinnhubQuote('OANDA:EUR_USD')",
          apiKey: "FINNHUB_API_KEY"
        },
        alternatives: [
          { name: "OANDA", cost: "Free API", note: "Need OANDA account" },
          { name: "Alpha Vantage", cost: "Free 25/day", note: "FX pairs included" },
          { name: "Forex.com", cost: "Account required", note: "Real spreads" }
        ]
      }
    },
    
    crypto: {
      description: "Spot price, exchange prices, spreads",
      frequency: "real-time",
      apis: {
        primary: {
          name: "Binance",
          status: "✅ ACTIVE",
          module: "market-data.ts",
          function: "fetchBinanceQuote('BTCUSDT')",
          rateLimit: "1200/min",
          apiKey: false,
          coverage: "500+ pairs"
        },
        secondary: {
          name: "CoinGecko",
          status: "✅ ACTIVE",
          module: "onchain.ts",
          function: "fetchCoinGeckoPrice(coinId)",
          rateLimit: "50/min free",
          apiKey: false
        },
        alternatives: [
          { name: "Coinbase", cost: "Free", note: "US-focused" },
          { name: "Kraken", cost: "Free", note: "Good for EUR pairs" },
          { name: "CryptoCompare", cost: "Free tier", note: "Good historical" }
        ]
      }
    },
    
    commodities: {
      description: "Spot & futures prices, curves",
      frequency: "real-time",
      apis: {
        primary: {
          name: "Yahoo Finance",
          status: "✅ ACTIVE",
          module: "market-data.ts",
          function: "fetchYahooQuote('GC=F')",
          apiKey: false,
          symbols: {
            gold: "GC=F",
            silver: "SI=F", 
            oil_wti: "CL=F",
            oil_brent: "BZ=F",
            natural_gas: "NG=F",
            copper: "HG=F",
            platinum: "PL=F",
            corn: "ZC=F",
            wheat: "ZW=F",
            soybeans: "ZS=F"
          }
        },
        alternatives: [
          { name: "Quandl", cost: "Free tier", note: "Historical focus" },
          { name: "CME Group", cost: "Paid", note: "Official but expensive" }
        ]
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. INTRADAY & HISTORICAL DATA
  // ═══════════════════════════════════════════════════════════════════════════
  intraday_historical: {
    intraday_OHLC: {
      description: "1m/5m/15m bars for short-term impact analysis",
      frequency: "intraday",
      apis: {
        primary: {
          name: "Yahoo Finance",
          status: "✅ ACTIVE",
          module: "market-data.ts",
          function: "fetchYahooIntraday(symbol, interval)",
          intervals: ["1m", "5m", "15m", "30m", "1h"],
          range: "Last 7 days for 1m, 60 days for 1h",
          apiKey: false
        },
        secondary: {
          name: "Finnhub",
          status: "✅ ACTIVE",
          module: "market-data.ts",
          function: "fetchFinnhubCandles(symbol, resolution, from, to)",
          intervals: ["1", "5", "15", "30", "60", "D", "W", "M"],
          apiKey: "FINNHUB_API_KEY"
        },
        crypto: {
          name: "Binance",
          status: "✅ ACTIVE",
          module: "market-data.ts",
          function: "fetchBinanceKlines(symbol, interval)",
          intervals: ["1m", "5m", "15m", "1h", "4h", "1d"],
          apiKey: false
        }
      }
    },
    
    historical_OHLC: {
      description: "1y-10y history for trend / analog analysis",
      frequency: "daily/weekly",
      apis: {
        primary: {
          name: "Yahoo Finance",
          status: "✅ ACTIVE",
          module: "market-data.ts",
          function: "fetchYahooIntraday(symbol, '1d', range='10y')",
          range: "Up to 20+ years",
          apiKey: false
        },
        alternatives: [
          { name: "Quandl/Nasdaq", cost: "Free tier", note: "Good for indices" },
          { name: "Alpha Vantage", cost: "Free 25/day", note: "Full history" }
        ]
      }
    },
    
    volatility_metrics: {
      description: "Realized / implied vol, VIX, crypto vol",
      frequency: "daily/hourly",
      apis: {
        vix: {
          name: "Yahoo Finance (^VIX)",
          status: "✅ ACTIVE",
          module: "volatility.ts",
          function: "fetchVIX()",
          apiKey: false
        },
        realized_vol: {
          name: "Calculated from OHLC",
          status: "✅ ACTIVE",
          module: "volatility.ts",
          function: "calculateRealizedVolatility(symbol, period)",
          apiKey: false
        },
        atr: {
          name: "Calculated from OHLC",
          status: "✅ ACTIVE",
          module: "volatility.ts",
          function: "calculateATR(symbol, period)",
          apiKey: false
        },
        crypto_vol: {
          name: "Deribit DVOL",
          status: "⏳ TODO",
          note: "Deribit API for BTC/ETH implied vol",
          apiKey: false
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. VOLATILITY & RISK METRICS
  // ═══════════════════════════════════════════════════════════════════════════
  volatility_risk: {
    implied_volatility: {
      description: "Options-based IV",
      apis: {
        equities: {
          name: "Yahoo Finance Options",
          status: "🔧 PARTIAL",
          note: "Can scrape options chains",
          apiKey: false
        },
        crypto: {
          name: "Deribit API",
          status: "⏳ TODO",
          endpoint: "https://www.deribit.com/api/v2/public/get_index_price",
          apiKey: false,
          note: "BTC/ETH options IV"
        }
      }
    },
    
    bid_ask_spreads: {
      description: "Liquidity measure",
      apis: {
        crypto: {
          name: "Binance Orderbook",
          status: "✅ ACTIVE",
          endpoint: "https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=5",
          apiKey: false
        },
        equities: {
          name: "Polygon.io",
          status: "❌ PAID",
          cost: "$29/mo"
        }
      }
    },
    
    short_interest_funding: {
      description: "Crypto & equities short interest / funding rates",
      apis: {
        crypto_funding: {
          name: "Binance Funding Rate",
          status: "✅ ACTIVE",
          module: "onchain.ts",
          function: "fetchFundingRates(symbol)",
          apiKey: false
        },
        crypto_oi: {
          name: "Binance Open Interest",
          status: "✅ ACTIVE",
          module: "onchain.ts",
          function: "fetchOpenInterest(symbol)",
          apiKey: false
        },
        equities_short: {
          name: "Finnhub Short Interest",
          status: "🔧 PARTIAL",
          module: "sentiment.ts",
          function: "fetchShortInterest(symbol)",
          note: "Limited to US stocks",
          apiKey: "FINNHUB_API_KEY"
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. MACRO & POLICY DATA
  // ═══════════════════════════════════════════════════════════════════════════
  macro_policy: {
    central_bank_rates: {
      description: "Fed, ECB, BoJ policy statements",
      frequency: "daily/event",
      apis: {
        treasury_yields: {
          name: "Yahoo Finance",
          status: "✅ ACTIVE",
          module: "macro-free.ts",
          function: "getTreasuryYields()",
          symbols: "^IRX, ^FVX, ^TNX, ^TYX",
          apiKey: false
        },
        fed_calendar: {
          name: "Finnhub Economic Calendar",
          status: "✅ ACTIVE",
          module: "fundamentals.ts",
          function: "fetchEarningsCalendar()",
          apiKey: "FINNHUB_API_KEY"
        },
        fallback: {
          name: "Hardcoded Data",
          status: "✅ ACTIVE",
          module: "macro-free.ts",
          object: "FALLBACK_MACRO_DATA"
        }
      }
    },
    
    cpi_ppi: {
      description: "Inflation indicators",
      frequency: "monthly/quarterly",
      apis: {
        primary: {
          name: "World Bank API",
          status: "✅ ACTIVE",
          module: "macro-free.ts",
          function: "getWorldBankData('US', 'FP.CPI.TOTL.ZG')",
          apiKey: false
        },
        secondary: {
          name: "FRED API",
          status: "🔧 NEEDS KEY",
          module: "fred-api.ts",
          apiKey: "FRED_API_KEY (free)"
        },
        fallback: {
          name: "Hardcoded Recent Data",
          status: "✅ ACTIVE",
          module: "macro-free.ts",
          object: "FALLBACK_MACRO_DATA.inflation"
        }
      }
    },
    
    gdp_unemployment: {
      description: "Macro fundamentals",
      frequency: "quarterly/monthly",
      apis: {
        primary: {
          name: "World Bank API",
          status: "✅ ACTIVE",
          module: "macro-free.ts",
          function: "getUSMacroHistory()",
          apiKey: false,
          indicators: ["GDP Growth", "Unemployment", "Inflation"]
        }
      }
    },
    
    market_sentiment: {
      description: "Fear & Greed, Risk-on/off",
      apis: {
        fear_greed: {
          name: "Alternative.me",
          status: "✅ ACTIVE",
          module: "macro-free.ts",
          function: "getFearGreedIndex()",
          apiKey: false
        },
        regime: {
          name: "Calculated",
          status: "✅ ACTIVE",
          module: "macro-free.ts",
          function: "analyzeMacroEnvironment()"
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. COMPANY FUNDAMENTALS
  // ═══════════════════════════════════════════════════════════════════════════
  company_fundamentals: {
    financial_statements: {
      description: "Income, balance sheet, cash flows",
      frequency: "quarterly",
      apis: {
        primary: {
          name: "Financial Modeling Prep (FMP)",
          status: "✅ ACTIVE",
          module: "fmp-api.ts",
          functions: [
            "fetchIncomeStatement(symbol)",
            "fetchBalanceSheet(symbol)",
            "fetchCashFlow(symbol)"
          ],
          apiKey: "FMP_API_KEY",
          rateLimit: "250/day free"
        },
        ratios: {
          name: "FMP Ratios",
          status: "✅ ACTIVE",
          module: "fmp-api.ts",
          function: "fetchFinancialRatios(symbol)"
        },
        dcf: {
          name: "FMP DCF Valuation",
          status: "✅ ACTIVE",
          module: "fmp-api.ts",
          function: "fetchDCFValuation(symbol)"
        }
      }
    },
    
    earnings_announcements: {
      description: "EPS, revenue, guidance",
      frequency: "event-driven",
      apis: {
        primary: {
          name: "Finnhub Earnings",
          status: "✅ ACTIVE",
          module: "fundamentals.ts",
          functions: [
            "fetchEarningsHistory(symbol)",
            "fetchEarningsCalendar()"
          ],
          apiKey: "FINNHUB_API_KEY"
        },
        surprises: {
          name: "FMP Earnings Surprise",
          status: "✅ ACTIVE",
          module: "fmp-api.ts",
          endpoint: "/earnings-surprises/{symbol}"
        }
      }
    },
    
    insider_trades: {
      description: "SEC Form 4 / 13F",
      frequency: "event-driven",
      apis: {
        primary: {
          name: "Finnhub Insider",
          status: "✅ ACTIVE",
          module: "sentiment.ts",
          function: "fetchInsiderTransactions(symbol)",
          apiKey: "FINNHUB_API_KEY"
        },
        institutional: {
          name: "Finnhub Institutional",
          status: "✅ ACTIVE",
          module: "sentiment.ts",
          function: "fetchInstitutionalOwnership(symbol)"
        }
      }
    },
    
    company_profile: {
      description: "Company info, sector, industry",
      apis: {
        primary: {
          name: "Finnhub",
          status: "✅ ACTIVE",
          module: "fundamentals.ts",
          function: "fetchCompanyProfile(symbol)"
        },
        secondary: {
          name: "FMP",
          status: "✅ ACTIVE",
          module: "fmp-api.ts",
          endpoint: "/profile/{symbol}"
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. HISTORICAL ANALOGS & NEWS ARCHIVE
  // ═══════════════════════════════════════════════════════════════════════════
  historical_analogs: {
    past_crises: {
      description: "Market + macro response to major events",
      apis: {
        primary: {
          name: "Local Database",
          status: "✅ ACTIVE",
          module: "historical.ts",
          object: "HISTORICAL_EVENTS",
          events: [
            "2008 Financial Crisis",
            "2010 Flash Crash",
            "2011 EU Debt Crisis",
            "2015 China Devaluation",
            "2016 Brexit",
            "2018 Trade War",
            "2020 COVID Crash",
            "2021 Meme Stock Mania",
            "2022 Fed Pivot",
            "2022 FTX Collapse",
            "2023 SVB Crisis",
            "2024 Japan Carry Unwind"
          ]
        }
      }
    },
    
    pattern_matching: {
      description: "Find similar historical patterns",
      apis: {
        primary: {
          name: "Local Algorithm",
          status: "✅ ACTIVE",
          module: "historical.ts",
          function: "findSimilarEvents(newsCategory, marketConditions)"
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. CRYPTO ON-CHAIN DATA
  // ═══════════════════════════════════════════════════════════════════════════
  crypto_onchain: {
    funding_rates: {
      description: "Perpetual swap funding",
      apis: {
        primary: {
          name: "Binance Futures",
          status: "✅ ACTIVE",
          module: "onchain.ts",
          function: "fetchFundingRates(symbol)",
          apiKey: false
        }
      }
    },
    
    open_interest: {
      description: "Derivatives positioning",
      apis: {
        primary: {
          name: "Binance Futures",
          status: "✅ ACTIVE",
          module: "onchain.ts",
          function: "fetchOpenInterest(symbol)",
          apiKey: false
        }
      }
    },
    
    liquidations: {
      description: "Forced liquidations",
      apis: {
        primary: {
          name: "Binance",
          status: "✅ ACTIVE",
          module: "onchain.ts",
          function: "fetchLiquidations(symbol)",
          apiKey: false
        },
        aggregated: {
          name: "Coinglass",
          status: "⏳ TODO",
          endpoint: "https://open-api.coinglass.com/public/v2/liquidation_history",
          apiKey: "Free tier available"
        }
      }
    },
    
    exchange_flows: {
      description: "Exchange inflow/outflow",
      apis: {
        primary: {
          name: "CryptoQuant",
          status: "⏳ TODO",
          cost: "Free tier: 100 calls/day",
          note: "Best for exchange flows"
        },
        alternative: {
          name: "Glassnode",
          status: "❌ PAID",
          cost: "$29/mo minimum"
        }
      }
    },
    
    network_metrics: {
      description: "Hashrate, active addresses, gas fees",
      apis: {
        gas_fees: {
          name: "Etherscan API",
          status: "⏳ TODO",
          endpoint: "https://api.etherscan.io/api?module=gastracker&action=gasoracle",
          apiKey: "Free tier available"
        },
        blockchain_info: {
          name: "Blockchain.com",
          status: "⏳ TODO",
          endpoint: "https://api.blockchain.info/stats",
          apiKey: false
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. NEWS METADATA & SENTIMENT
  // ═══════════════════════════════════════════════════════════════════════════
  news_metadata: {
    news_feed: {
      description: "Raw news articles",
      apis: {
        primary: {
          name: "Finnhub Market News",
          status: "✅ ACTIVE",
          module: "news-metadata.ts",
          function: "fetchMarketNews(category)",
          apiKey: "FINNHUB_API_KEY",
          categories: ["general", "forex", "crypto", "merger"]
        },
        company_news: {
          name: "Finnhub Company News",
          status: "✅ ACTIVE",
          function: "fetchCompanyNews(symbol, from, to)"
        }
      }
    },
    
    source_scoring: {
      description: "News source reliability",
      apis: {
        primary: {
          name: "Local Database",
          status: "✅ ACTIVE",
          module: "news-metadata.ts",
          object: "NEWS_SOURCE_SCORES",
          sources: ["Bloomberg", "Reuters", "CNBC", "WSJ", "FT", "etc."]
        }
      }
    },
    
    nlp_analysis: {
      description: "Sentiment, keywords, importance",
      apis: {
        local: {
          name: "Keyword-based Analysis",
          status: "✅ ACTIVE",
          module: "news-metadata.ts",
          functions: [
            "analyzeHeadline(headline)",
            "categorizeNews(article)",
            "calculateImportanceScore(article)"
          ]
        },
        ai_enhanced: {
          name: "OpenAI GPT",
          status: "✅ ACTIVE",
          apiKey: "OPENAI_API_KEY",
          note: "Used for deep analysis"
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. POSITIONING & MARKET FLOW
  // ═══════════════════════════════════════════════════════════════════════════
  positioning_flow: {
    put_call_ratio: {
      description: "Options sentiment",
      apis: {
        primary: {
          name: "Yahoo Finance / CBOE Proxy",
          status: "🔧 PARTIAL",
          module: "sentiment.ts",
          function: "fetchCBOEPutCallRatio()"
        }
      }
    },
    
    short_interest: {
      description: "Stock short positions",
      apis: {
        primary: {
          name: "Finnhub",
          status: "✅ ACTIVE",
          module: "sentiment.ts",
          function: "fetchShortInterest(symbol)",
          apiKey: "FINNHUB_API_KEY"
        }
      }
    },
    
    institutional_holdings: {
      description: "13F filings, major holders",
      apis: {
        primary: {
          name: "Finnhub Ownership",
          status: "✅ ACTIVE",
          module: "sentiment.ts",
          function: "fetchInstitutionalOwnership(symbol)"
        }
      }
    },
    
    insider_transactions: {
      description: "Form 4 filings",
      apis: {
        primary: {
          name: "Finnhub Insider",
          status: "✅ ACTIVE",
          module: "sentiment.ts",
          function: "fetchInsiderTransactions(symbol)"
        }
      }
    },
    
    cftc_cot: {
      description: "Commitments of Traders",
      apis: {
        primary: {
          name: "CFTC API / Quandl",
          status: "⏳ TODO",
          endpoint: "https://publicreporting.cftc.gov/api/",
          note: "Free but complex to parse"
        }
      }
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// API KEY REQUIREMENTS SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

export const API_KEYS_REQUIRED = {
  existing: {
    FINNHUB_API_KEY: {
      status: "✅ CONFIGURED",
      usage: "Market data, earnings, insider, sentiment",
      rateLimit: "60/min free"
    },
    OPENAI_API_KEY: {
      status: "✅ CONFIGURED",
      usage: "AI analysis, news interpretation"
    },
    FMP_API_KEY: {
      status: "✅ CONFIGURED",
      usage: "Financial statements, DCF, ratios",
      rateLimit: "250/day free"
    }
  },
  
  optional: {
    FRED_API_KEY: {
      status: "⏳ OPTIONAL",
      signup: "https://fred.stlouisfed.org/docs/api/api_key.html",
      usage: "Official FRED data (alternative exists)",
      note: "macro-free.ts provides free alternative"
    },
    COINGLASS_API_KEY: {
      status: "⏳ OPTIONAL",
      signup: "https://www.coinglass.com/",
      usage: "Aggregated crypto liquidations, OI",
      cost: "Free tier: 100/day"
    },
    ETHERSCAN_API_KEY: {
      status: "⏳ OPTIONAL",
      signup: "https://etherscan.io/apis",
      usage: "ETH gas fees, token transfers",
      cost: "Free tier: 100,000/day"
    }
  },
  
  not_needed: [
    "Yahoo Finance - No API key needed",
    "Binance Public API - No API key needed",
    "Alternative.me (Fear & Greed) - No API key needed",
    "World Bank API - No API key needed",
    "CoinGecko (basic) - No API key needed"
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// COVERAGE MATRIX
// ═══════════════════════════════════════════════════════════════════════════════

export const DATA_COVERAGE = {
  market_prices: {
    coverage: "95%",
    equities: "✅ Yahoo + Finnhub",
    forex: "✅ Yahoo + Finnhub",
    crypto: "✅ Binance + CoinGecko",
    commodities: "✅ Yahoo Futures"
  },
  
  intraday_historical: {
    coverage: "90%",
    intraday: "✅ Yahoo (7 days 1m) + Finnhub",
    historical: "✅ Yahoo (20+ years)",
    volatility: "✅ VIX + Calculated"
  },
  
  volatility_risk: {
    coverage: "70%",
    vix: "✅ Yahoo",
    realized_vol: "✅ Calculated",
    implied_vol: "🔧 Partial (options chain scraping)",
    funding_rates: "✅ Binance"
  },
  
  macro_policy: {
    coverage: "85%",
    yields: "✅ Yahoo",
    inflation: "✅ World Bank + Fallback",
    gdp: "✅ World Bank",
    fear_greed: "✅ Alternative.me"
  },
  
  company_fundamentals: {
    coverage: "95%",
    statements: "✅ FMP",
    earnings: "✅ Finnhub",
    insider: "✅ Finnhub",
    institutional: "✅ Finnhub"
  },
  
  historical_analogs: {
    coverage: "80%",
    events_db: "✅ Local (12+ events)",
    pattern_match: "✅ Local algorithm"
  },
  
  crypto_onchain: {
    coverage: "60%",
    funding: "✅ Binance",
    oi: "✅ Binance",
    liquidations: "✅ Binance",
    exchange_flows: "⏳ Needs CryptoQuant"
  },
  
  news_sentiment: {
    coverage: "90%",
    news_feed: "✅ Finnhub",
    source_scoring: "✅ Local DB",
    nlp: "✅ Local + OpenAI"
  },
  
  positioning: {
    coverage: "75%",
    short_interest: "✅ Finnhub",
    institutional: "✅ Finnhub",
    insider: "✅ Finnhub",
    cot: "⏳ TODO"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK USAGE GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

export const USAGE_EXAMPLES = `
// ═══════════════════════════════════════════════════════════════════════════════
// ÖRNEK KULLANIM
// ═══════════════════════════════════════════════════════════════════════════════

import { 
  // Market Prices
  fetchYahooQuote,
  fetchBinanceQuote,
  fetchFinnhubQuote,
  
  // Historical/Intraday
  fetchYahooIntraday,
  fetchBinanceKlines,
  
  // Volatility
  fetchVIX,
  calculateRealizedVolatility,
  
  // Macro (FREE - no API key!)
  getFreeMacroSnapshot,
  getTreasuryYields,
  analyzeMacroEnvironment,
  
  // Fundamentals
  fetchIncomeStatement,
  fetchBalanceSheet,
  fetchDCFValuation,
  
  // Sentiment
  fetchShortInterest,
  fetchInsiderTransactions,
  
  // Crypto
  fetchFundingRates,
  fetchOpenInterest,
  
  // News
  fetchMarketNews,
  analyzeHeadline,
  
  // Historical
  findSimilarEvents,
  HISTORICAL_EVENTS
} from '@/lib/data';

// 1. Hisse fiyatı al
const applePrice = await fetchYahooQuote('AAPL');

// 2. Crypto fiyatı al  
const btcPrice = await fetchBinanceQuote('BTCUSDT');

// 3. Makro snapshot (ücretsiz!)
const macro = await getFreeMacroSnapshot();
console.log(macro.vix, macro.treasuryYields, macro.fearGreed);

// 4. Şirket finansalları
const income = await fetchIncomeStatement('AAPL');
const dcf = await fetchDCFValuation('AAPL');

// 5. Crypto on-chain
const funding = await fetchFundingRates('BTCUSDT');
const oi = await fetchOpenInterest('BTCUSDT');

// 6. Tarihsel analog bul
const similar = findSimilarEvents('rate_hike', { vix: 25, fearGreed: 30 });
`;
