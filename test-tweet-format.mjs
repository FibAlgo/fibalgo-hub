// Test tweet format locally - using sample data

// Extract top keywords from text for hashtags
function extractTopKeywords(text, count = 2) {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'their', 'we', 'our', 'you',
    'your', 'i', 'my', 'he', 'she', 'his', 'her', 'can', 'not', 'no', 'yes', 'all',
    'more', 'most', 'some', 'any', 'each', 'every', 'both', 'few', 'many', 'much',
    'other', 'another', 'such', 'what', 'which', 'who', 'whom', 'when', 'where', 'why',
    'how', 'if', 'then', 'than', 'so', 'just', 'only', 'also', 'very', 'too', 'even',
    'new', 'old', 'first', 'last', 'next', 'now', 'still', 'well', 'way', 'after',
    'before', 'between', 'under', 'over', 'through', 'during', 'into', 'about', 'up',
    'down', 'out', 'off', 'again', 'further', 'once', 'here', 'there', 'news', 'says',
    'said', 'per', 'via', 'according', 'report', 'reports', 'reported', 'year', 'month',
    'day', 'week', 'time', 'today', 'yesterday', 'tomorrow', 'market', 'markets', 'stock',
    'stocks', 'price', 'prices', 'trade', 'trading', 'analysis', 'data', 'billion', 'million'
  ]);
  
  const words = text.toLowerCase()
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !stopWords.has(w));
  
  const freq = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }
  
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
}

// Format tweet - yeni format (score en üstte, assets altında)
function formatTweet(news) {
  const sentimentEmoji = news.sentiment === 'bullish' ? '🟢' : news.sentiment === 'bearish' ? '🔴' : '⚪';
  const sentimentText = news.sentiment === 'bullish' ? 'Bullish News' : news.sentiment === 'bearish' ? 'Bearish News' : 'Neutral News';
  const isBreaking = news.is_breaking || news.score >= 8;
  
  // Convert trading pairs to $ format (NASDAQ:AAPL -> $AAPL)
  const tickers = (news.trading_pairs || [])
    .slice(0, 4)
    .map(pair => {
      const symbol = pair.includes(':') ? pair.split(':')[1] : pair;
      return `$${symbol}`;
    })
    .join(' ');

  // Extract keywords from title and summary
  const textForKeywords = `${news.title} ${news.summary || ''}`;
  const keywords = extractTopKeywords(textForKeywords, 2);
  
  // Category hashtag
  const catTag = news.category === 'stocks' ? '#Stocks' 
    : news.category === 'crypto' ? '#Crypto'
    : news.category === 'forex' ? '#Forex'
    : news.category === 'commodities' ? '#Commodities'
    : news.category === 'macro' ? '#Macro'
    : news.category === 'indices' ? '#Indices'
    : '#Markets';
  
  // Build tweet
  let tweet = '';
  
  // Breaking news prefix
  if (isBreaking) {
    tweet += `🚨 BREAKING NEWS 🚨\n\n`;
  }
  
  // Score and sentiment at TOP
  tweet += `${sentimentEmoji} ${sentimentText} | Score: ${news.score}/10\n`;
  
  // Assets below score
  if (tickers) {
    tweet += `${tickers}\n`;
  }
  
  tweet += `\n`;
  
  // Title (max 100 chars)
  const maxTitleLen = 100;
  const title = news.title.length > maxTitleLen 
    ? news.title.slice(0, maxTitleLen - 3) + '...' 
    : news.title;
  
  tweet += `${title}\n\n`;
  
  tweet += `Full analysis on FibAlgo:\n`;
  tweet += `🔗 FibAlgo.com\n\n`;
  
  // Add keyword hashtags + category
  const keywordTags = keywords.map(k => `#${k}`).join(' ');
  tweet += `${keywordTags} ${catTag}`;
  
  // Ensure under 280 chars
  if (tweet.length > 280) {
    tweet = tweet.replace(keywordTags + ' ', '');
  }
  if (tweet.length > 280) {
    tweet = tweet.slice(0, 277) + '...';
  }
  
  return tweet;
}

// Sample news data
const samples = [
  {
    title: "Trump launches $12B critical-minerals stockpile to counter China; tailwind for base metals",
    sentiment: "bullish",
    score: 8,
    trading_pairs: ["COMEX:HG1!", "AMEX:COPX", "NYSE:FCX"],
    category: "commodities",
    is_breaking: true,
    summary: "Trump administration announces $12 billion strategic minerals stockpile initiative."
  },
  {
    title: "Fed signals potential rate cut in March as inflation cools faster than expected",
    sentiment: "bullish",
    score: 9,
    trading_pairs: ["TVC:DXY", "TVC:US10Y", "AMEX:SPY"],
    category: "macro",
    is_breaking: true,
    summary: "Federal Reserve officials hint at possible rate cut in March meeting."
  },
  {
    title: "Apple reports steady iPhone sales in Q4, in line with expectations",
    sentiment: "neutral",
    score: 5,
    trading_pairs: ["NASDAQ:AAPL"],
    category: "stocks",
    is_breaking: false,
    summary: "Apple quarterly results meet analyst expectations with no major surprises."
  },
  {
    title: "Minor adjustments to EU trade policy discussions continue",
    sentiment: "neutral",
    score: 3,
    trading_pairs: ["FX:EURUSD"],
    category: "forex",
    is_breaking: false,
    summary: "Routine EU trade negotiations proceed as expected."
  },
  {
    title: "Bitcoin drops below $40,000 as SEC delays spot ETF decision again",
    sentiment: "bearish",
    score: 7,
    trading_pairs: ["BINANCE:BTCUSDT", "COINBASE:ETHUSD"],
    category: "crypto",
    is_breaking: false,
    summary: "Bitcoin falls sharply after SEC postpones spot ETF approval decision."
  }
];

console.log('='.repeat(60));
console.log('YENİ TWEET FORMAT TESTİ');
console.log('='.repeat(60));

for (const news of samples) {
  const tweet = formatTweet(news);
  console.log('\n' + '-'.repeat(60));
  console.log(`[${news.sentiment.toUpperCase()}] Score: ${news.score}/10 | ${news.category}`);
  console.log('-'.repeat(60));
  console.log(tweet);
  console.log(`\n[${tweet.length}/280 karakter]`);
}
