// Local test for news analysis - check raw OpenAI response
import { readFileSync } from 'fs';

// Read .env.local
const envContent = readFileSync('.env.local', 'utf8');
const envLines = envContent.split('\n');
let OPENAI_API_KEY = '';
for (const line of envLines) {
  if (line.startsWith('OPENAI_API_KEY=')) {
    OPENAI_API_KEY = line.split('=')[1].replace(/['"]/g, '').trim();
    break;
  }
}
const OPENAI_MODEL = 'gpt-5.2';

async function testOpenAI() {
  console.log('Testing OpenAI API with model:', OPENAI_MODEL);
  console.log('API Key present:', !!OPENAI_API_KEY);
  
  const testPrompt = `You are a financial news analyst. Analyze this news and respond with valid JSON only.

NEWS: "Apple announces record Q4 earnings, beating analyst expectations with $89.5 billion in revenue."

Respond with this exact JSON structure (no markdown, no code blocks):
{
  "title": "Your analysis title",
  "analysis": "Brief analysis",
  "category": "stocks",
  "affected_assets": ["AAPL"],
  "should_build_infrastructure": true,
  "infrastructure_reasoning": "Reason"
}

Respond ONLY with valid JSON, no other text.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: testPrompt }],
        max_completion_tokens: 1000,
        reasoning_effort: 'high',
      }),
    });

    console.log('\n=== API Response Status ===');
    console.log('Status:', res.status, res.statusText);
    
    if (!res.ok) {
      const errText = await res.text();
      console.log('Error response:', errText);
      return;
    }

    const data = await res.json();
    
    console.log('\n=== Full API Response ===');
    console.log(JSON.stringify(data, null, 2));
    
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('\n=== Raw Content ===');
    console.log('Length:', content.length);
    console.log('Content:', content);
    
    console.log('\n=== Content as JSON string ===');
    console.log(JSON.stringify(content));
    
    console.log('\n=== Attempting JSON parse ===');
    try {
      const parsed = JSON.parse(content);
      console.log('SUCCESS! Parsed:', parsed);
    } catch (e) {
      console.log('PARSE FAILED:', e.message);
      
      // Try to find JSON in the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('\n=== Found JSON-like content ===');
        console.log(jsonMatch[0]);
        try {
          const extracted = JSON.parse(jsonMatch[0]);
          console.log('Extracted JSON parsed:', extracted);
        } catch (e2) {
          console.log('Extracted also failed:', e2.message);
        }
      }
    }
    
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testOpenAI();
