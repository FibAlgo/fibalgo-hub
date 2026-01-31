/**
 * FMP canonical symbols – complete list of correct spellings for Stage 1.
 * All symbols here are valid FMP quote/intraday symbols (no prefixes).
 */

/** Forex pairs – 6-letter, FMP format (e.g. EURUSD, USDJPY) */
export const ALL_FMP_FOREX: readonly string[] = [
  // Majors
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  // EUR crosses
  'EURJPY', 'EURGBP', 'EURCHF', 'EURAUD', 'EURNZD', 'EURCAD', 'EURSGD', 'EURSEK', 'EURNOK', 'EURMXN', 'EURTRY',
  // GBP crosses
  'GBPJPY', 'GBPCHF', 'GBPAUD', 'GBPNZD', 'GBPCAD', 'GBPSEK', 'GBPNOK',
  // JPY crosses
  'AUDJPY', 'NZDJPY', 'CADJPY', 'CHFJPY', 'SGDJPY',
  // AUD/NZD/CAD
  'AUDNZD', 'AUDCAD', 'AUDCHF', 'AUDSEK', 'NZDCAD', 'NZDCHF', 'CADCHF',
  // Exotics / EM
  'USDMXN', 'USDTRY', 'USDZAR', 'USDSEK', 'USDNOK', 'USDDKK', 'USDPLN', 'USDHUF', 'USDCZK', 'USDSGD', 'USDHKD', 'USDSAR', 'USDINR', 'USDTHB', 'USDCNH', 'USDKRW',
  'EURTRY', 'EURPLN', 'GBPTRY',
];

/** Commodities – FMP format (GCUSD=gold, CLUSD=oil, SIUSD=silver, etc.) */
export const ALL_FMP_COMMODITIES: readonly string[] = [
  'GCUSD',   // Gold
  'CLUSD',   // Crude oil (WTI)
  'SIUSD',   // Silver
  'NGUSD',   // Natural gas
  'HGUSD',   // Copper
  'PLUSD',   // Platinum
  'PAUSD',   // Palladium
  'ZCUSD',   // Corn
  'ZWUSD',   // Wheat
  'ZSUSD',   // Soybeans
  'CCUSD',   // Cocoa
  'CTUSD',   // Cotton
  'SBUSD',   // Sugar
  'KCUSD',   // Coffee
];

/** Indices / benchmarks – FMP format */
export const ALL_FMP_INDICES: readonly string[] = [
  'SPX',     // S&P 500 index
  'DXY',     // US Dollar Index
  'VIX',     // CBOE Volatility index
  'NDX',     // Nasdaq 100
  'DJI',     // Dow Jones
  'RUT',     // Russell 2000
];

/** Crypto – FMP format (BASEUSD, e.g. BTCUSD) */
export const ALL_FMP_CRYPTO: readonly string[] = [
  'BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'BNBUSD', 'DOGEUSD', 'ADAUSD', 'AVAXUSD',
  'LINKUSD', 'MATICUSD', 'DOTUSD', 'LTCUSD', 'SHIBUSD', 'TRXUSD', 'ETCUSD', 'XLMUSD',
  'NEARUSD', 'APTUSD', 'ARBUSD', 'OPUSD', 'SUIUSD', 'PEPEUSD', 'WIFUSD', 'BONKUSD',
  'FETUSD', 'RNDRUSD', 'IMXUSD', 'SEIUSD', 'INJUSD', 'MEMEUSD', 'UNIUSD', 'ATOMUSD',
  'STXUSD', 'FILUSD', 'HBARUSD', 'VETUSD', 'ALGOUSD', 'ICPUSD', 'AAVEUSD', 'MKRUSD',
  'GRTUSD', 'SANDUSD', 'MANAUSD', 'AXSUSD', 'CRVUSD', 'SNXUSD', 'COMPUSD', 'YFIUSD',
];

/** Stocks & ETFs – FMP ticker only (no suffix). S&P 500 representative + major ETFs + international */
export const ALL_FMP_STOCKS_ETFS: readonly string[] = [
  // Mega cap / Tech
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'INTC', 'CRM', 'ORCL', 'ADBE', 'PYPL', 'NFLX', 'CSCO', 'AVGO', 'QCOM', 'TXN', 'AMAT', 'MU', 'LRCX', 'KLAC', 'MRVL', 'SNPS', 'CDNS', 'FTNT', 'CRWD', 'PANW', 'DDOG', 'ZS', 'NET', 'SNOW', 'MDB', 'OKTA', 'PLTR', 'COIN', 'MSTR', 'SQ', 'SHOP', 'UBER', 'ABNB', 'LYFT', 'DASH', 'RBLX', 'ROKU', 'SPOT', 'TTWO', 'EA', 'ATVI', 'WDAY', 'VEEV', 'NOW', 'TEAM', 'DOCU', 'ZM', 'TWLO', 'BILL', 'HUBS', 'GDDY', 'AKAM', 'FFIV', 'ANSS', 'CDW', 'HPQ', 'DELL', 'HPE', 'NTAP', 'WDC', 'STX', 'SMCI',
  // Banks / Financials
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'SCHW', 'BLK', 'AXP', 'V', 'MA', 'PYPL', 'COF', 'USB', 'PNC', 'TFC', 'BK', 'STT', 'FITB', 'KEY', 'CFG', 'HBAN', 'MTB', 'ZION', 'RF', 'CMA', 'ALLY', 'SOFI',
  // Healthcare
  'UNH', 'JNJ', 'PFE', 'ABBV', 'MRK', 'LLY', 'TMO', 'ABT', 'DHR', 'BMY', 'AMGN', 'GILD', 'VRTX', 'REGN', 'MRNA', 'BIIB', 'ILMN', 'ISRG', 'SYK', 'MDT', 'BSX', 'ZBH', 'EW', 'HCA', 'CI', 'HUM', 'ELV', 'CVS', 'MCK', 'CAH', 'ABC', 'JAZZ', 'BMRN', 'ALNY', 'EXEL', 'INCY', 'BPMC', 'SRPT', 'NBIX', 'SGEN', 'DXCM', 'IDXX', 'IQV', 'A', 'WAT', 'TECH', 'MTD', 'WST', 'RMD', 'HOLX', 'BAX', 'BDX', 'ZTS', 'HES', 'CNC', 'MOH', 'DGX', 'LH',
  // Consumer
  'WMT', 'PG', 'KO', 'PEP', 'COST', 'HD', 'LOW', 'TGT', 'NKE', 'SBUX', 'MCD', 'YUM', 'CMG', 'DPZ', 'WING', 'DRI', 'CAVA', 'EL', 'CL', 'KMB', 'GIS', 'K', 'SJM', 'CPB', 'HRL', 'MKC', 'HSY', 'KHC', 'MDLZ', 'PM', 'MO', 'BTI', 'TAP', 'STZ', 'BF.B', 'SAM', 'F', 'GM', 'RIVN', 'LCID', 'TSLA', 'TM', 'HMC', 'NIO', 'XPEV', 'LI', 'LKQ', 'BWA', 'LEG', 'PHM', 'LEN', 'DHI', 'NVR', 'TOL', 'KBH', 'MTH',
  // Energy
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PXD', 'MPC', 'PSX', 'VLO', 'OXY', 'HAL', 'BKR', 'DVN', 'FANG', 'HES', 'MRO', 'APA', 'OKE', 'WMB', 'KMI', 'ET', 'EPD', 'MPLX', 'VICI', 'PAA', 'PSXP',
  // Industrials
  'CAT', 'DE', 'HON', 'UPS', 'UNP', 'RTX', 'LMT', 'BA', 'GE', 'MMM', 'ITW', 'ETN', 'EMR', 'ROK', 'CARR', 'OTIS', 'JCI', 'PH', 'ROK', 'DOV', 'IR', 'TT', 'SWK', 'FAST', 'NDSN', 'GNRC', 'AME', 'FTV', 'IEX', 'XYL', 'EFX', 'CMI', 'PCAR', 'WM', 'RSG', 'CSX', 'NSC', 'FDX', 'LUV', 'DAL', 'UAL', 'AAL', 'JBLU', 'SAVE', 'ALK', 'LDOS', 'PWR', 'J', 'GVA', 'FLR', 'PLL', 'TXT', 'LHX', 'NOC', 'GD', 'LDOS',
  // Materials
  'LIN', 'APD', 'SHW', 'ECL', 'FCX', 'NEM', 'NUE', 'STLD', 'VMC', 'MLM', 'ALB', 'CF', 'MOS', 'FMC', 'DD', 'DOW', 'PPG', 'CE', 'EMN', 'LYB', 'ALLE', 'IFF', 'WRK', 'SEE', 'IP', 'PKG', 'AMCR', 'GPK', 'SON', 'BERY', 'CCK', 'TECK', 'SCCO', 'CLF', 'X', 'ATI', 'RS', 'CBT', 'OLN', 'HUN', 'WLK', 'WLKP', 'KOP', 'AVNT', 'MTRN', 'KWR', 'HWM', 'CMC', 'RX', 'REX', 'EXP', 'SUM', 'UFPI', 'OC', 'FUL', 'NEU', 'SXT', 'PMVC', 'HUBB', 'GNRC',
  // Real estate / REITs
  'AMT', 'PLD', 'CCI', 'EQIX', 'PSA', 'SPG', 'O', 'WELL', 'DLR', 'VICI', 'AVB', 'EQR', 'UDR', 'ARE', 'VTR', 'EXR', 'PEAK', 'MAA', 'ESS', 'INVH', 'SUI', 'CPT', 'KIM', 'REG', 'HR', 'FRT', 'BRX', 'NNN', 'ADC', 'OHI', 'SBAC', 'LSI', 'HIW', 'DOC', 'PECO', 'CTRE', 'LTC', 'DEA', 'NTST', 'BRG', 'AIV', 'UHT', 'HTA', 'APTS', 'IRT', 'TRNO', 'STAG', 'ILPT', 'GTY', 'REXR', 'AKR', 'BXP', 'SLG', 'VNO', 'FSP', 'PDM', 'LXP', 'DEI', 'ABR', 'RC', 'OUT', 'SITC', 'GNL', 'SRG', 'CUBE', 'JBGS', 'AMH', 'UMH', 'MHO', 'CVCO', 'SKY', 'LGIH', 'MDC', 'GRBK', 'TPH', 'DFH', 'HCXY',
  // ETFs – major
  'SPY', 'QQQ', 'IWM', 'DIA', 'VOO', 'VTI', 'VTV', 'VUG', 'VB', 'VXF', 'RSP', 'IVV', 'IJH', 'IJR', 'MDY', 'VEA', 'VWO', 'EFA', 'EEM', 'IEMG', 'VGK', 'EWJ', 'FXI', 'EWZ', 'VXUS', 'BND', 'AGG', 'LQD', 'HYG', 'JNK', 'TLT', 'IEF', 'SHY', 'TIP', 'GLD', 'SLV', 'USO', 'UNG', 'XLE', 'XLF', 'XLK', 'XLV', 'XLI', 'XLP', 'XLY', 'XLB', 'XLU', 'XLRE', 'ARKK', 'SOXL', 'TQQQ', 'SQQQ', 'UPRO', 'SDS', 'QLD', 'SSO', 'UCO', 'SCO', 'USO', 'BNO', 'DBA', 'DBC', 'PDBC', 'IAU', 'GDX', 'GDXJ', 'VNQ', 'IYR', 'REM', 'MUB', 'BNDX', 'BWX', 'EMB', 'LEMB', 'VCIT', 'VCSH', 'VCLT', 'SHV', 'BIL', 'SGOV', 'FLOT', 'ICSH', 'MINT', 'NEAR', 'JPST', 'BILS',
];

/** Single array of all non-stock FMP symbols (forex + commodities + indices + crypto) */
export const ALL_FMP_NON_STOCKS: readonly string[] = [
  ...ALL_FMP_FOREX,
  ...ALL_FMP_COMMODITIES,
  ...ALL_FMP_INDICES,
  ...ALL_FMP_CRYPTO,
];

/** Every FMP symbol we allow (stocks/ETFs + forex + commodities + indices + crypto) */
export const ALL_FMP_SYMBOLS: readonly string[] = [
  ...ALL_FMP_NON_STOCKS,
  ...ALL_FMP_STOCKS_ETFS,
];
