/**
 * Perplexity AI Search API Test
 * Yandex Yazeka alternatifi - Vercel'de çalışır!
 */

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';

interface PerplexityResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  citations?: string[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

async function searchPerplexity(query: string): Promise<string | null> {
  console.log(`\n🔍 Perplexity araması: "${query}"`);
  
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar', // En hızlı ve ucuz model
        messages: [
          {
            role: 'system',
            content: 'You are a financial research assistant. Provide factual, data-driven answers with specific numbers, dates, and sources when available. Be concise but comprehensive.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        return_citations: true,
        search_recency_filter: 'month' // Son 1 ay içindeki sonuçlar
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`   ❌ API Hatası (${response.status}):`, error);
      return null;
    }

    const data: PerplexityResponse = await response.json();
    
    const content = data.choices[0]?.message?.content || null;
    const citations = data.citations || [];
    
    console.log(`   ✅ Cevap alındı! (${data.usage.total_tokens} token)`);
    console.log(`   📚 Kaynak sayısı: ${citations.length}`);
    
    // Kaynakları da ekle
    let result = content;
    if (citations.length > 0) {
      result += '\n\n📚 Kaynaklar:\n' + citations.map((c, i) => `${i + 1}. ${c}`).join('\n');
    }
    
    return result;

  } catch (error) {
    console.error(`   ❌ Hata:`, error);
    return null;
  }
}

// Test
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🤖 PERPLEXITY AI SEARCH TEST');
  console.log('═══════════════════════════════════════════════════════════════');

  // Test 1: MIND marine (Yandex'te test ettiğimiz)
  console.log('\n📌 TEST 1: MIND Marine Subsea');
  const result1 = await searchPerplexity('MIND marine subsea market conditions and order status 2025');
  if (result1) {
    console.log('\n   📝 Sonuç:');
    console.log('   ' + '─'.repeat(60));
    console.log(result1.split('\n').map(l => '   ' + l).join('\n'));
    console.log('   ' + '─'.repeat(60));
  }

  // Test 2: Tesla Q4 (Yandex'te test ettiğimiz)
  console.log('\n📌 TEST 2: Tesla Q4 2025 Earnings');
  const result2 = await searchPerplexity('Tesla Q4 2025 earnings revenue profit delivery numbers');
  if (result2) {
    console.log('\n   📝 Sonuç:');
    console.log('   ' + '─'.repeat(60));
    console.log(result2.split('\n').map(l => '   ' + l).join('\n'));
    console.log('   ' + '─'.repeat(60));
  }

  console.log('\n✅ Test tamamlandı!');
}

main().catch(console.error);

// Export for use in other modules
export { searchPerplexity };
