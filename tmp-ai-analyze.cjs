// Analyze the new blog post for AI detection patterns
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function analyze() {
  const { data } = await s.from('blog_posts')
    .select('slug,title,content,word_count')
    .eq('slug', 'overtrading-how-to-stop-circuit-breaker-method')
    .single();

  if (!data) { console.log('Post bulunamadı!'); return; }

  const text = data.content.replace(/<[^>]+>/g, '');
  const words = data.word_count;

  console.log(`📝 "${data.title}"`);
  console.log(`   Kelime: ${words}\n`);

  // 1. BANNED WORDS CHECK
  console.log('=== 🚫 YASAKLI KELİMELER ===');
  const banned = [
    { name: 'comprehensive/robust', re: /\bcomprehensive\b|\brobust\b/gi },
    { name: 'cutting-edge/game-changer', re: /cutting[\s-]edge|game[\s-]changer/gi },
    { name: 'delve/deep dive/dive into', re: /\bdelve\b|deep dive|dive into/gi },
    { name: 'tapestry/multifaceted/realm/landscape', re: /\btapestry\b|\bmultifaceted\b|\brealm\b|\blandscape\b/gi },
    { name: 'unleash/unlock/empower/leverage', re: /\bunleash\b|\bunlock\b|\bempower\b|\bleverage\b/gi },
    { name: 'seamlessly/effortlessly', re: /\bseamlessly\b|\beffortlessly\b/gi },
    { name: 'at its core/in today\'s', re: /at its core|in today's/gi },
    { name: 'navigate complexities', re: /navigate.*complex/gi },
    { name: 'Whether you\'re a beginner', re: /whether you're a/gi },
    { name: 'Let\'s explore/dive', re: /let's (explore|dive)/gi },
  ];
  let bannedCount = 0;
  for (const b of banned) {
    const matches = text.match(b.re);
    if (matches) {
      console.log(`   ❌ "${b.name}": ${matches.length}x — ${matches.join(', ')}`);
      bannedCount += matches.length;
    }
  }
  if (bannedCount === 0) console.log('   ✅ SIFIR yasaklı kelime!');
  else console.log(`   ⚠️  Toplam ${bannedCount} yasaklı kelime bulundu`);

  // 2. AI PATTERN CHECK (broader)
  console.log('\n=== 🤖 AI PATTERN KONTROLÜ ===');
  const aiPatterns = [
    { name: 'Key Insight (tekrarlı)', re: /Key Insight/g },
    { name: 'Key Takeaway (tekrarlı)', re: /Key Takeaway/g },
    { name: 'Pro Tip (tekrarlı)', re: /Pro Tip/g },
    { name: 'Ready to (CTA başlangıcı)', re: /Ready to implement|Ready to transform|Ready to take/gi },
  ];
  for (const p of aiPatterns) {
    const matches = text.match(p.re);
    const count = matches ? matches.length : 0;
    const flag = count > 2 ? '❌' : count > 0 ? '🟡' : '✅';
    console.log(`   ${flag} "${p.name}": ${count}x`);
  }

  // 3. CALLOUT DIVERSITY
  console.log('\n=== 🏷️ CALLOUT ÇEŞİTLİLİĞİ ===');
  const insightLabels = [...data.content.matchAll(/class="callout-insight"><strong>(.*?)<\/strong>/g)].map(m => m[1]);
  const proLabels = [...data.content.matchAll(/class="callout-pro"><strong>(.*?)<\/strong>/g)].map(m => m[1]);
  const warningLabels = [...data.content.matchAll(/class="callout-warning"><strong>(.*?)<\/strong>/g)].map(m => m[1]);
  const takeawayHeading = [...data.content.matchAll(/class="key-takeaways"><h3>(.*?)<\/h3>/g)].map(m => m[1]);
  
  console.log(`   Insight labels: ${insightLabels.length > 0 ? insightLabels.join(', ') : 'YOK'}`);
  console.log(`   Pro labels: ${proLabels.length > 0 ? proLabels.join(', ') : 'YOK'}`);
  console.log(`   Warning labels: ${warningLabels.length > 0 ? warningLabels.join(', ') : 'YOK'}`);
  console.log(`   Takeaway heading: ${takeawayHeading.length > 0 ? takeawayHeading.join(', ') : 'YOK'}`);
  
  const allLabels = [...insightLabels, ...proLabels, ...warningLabels];
  const uniqueLabels = new Set(allLabels);
  const diverse = uniqueLabels.size === allLabels.length;
  console.log(`   ${diverse ? '✅' : '❌'} Label çeşitliliği: ${uniqueLabels.size}/${allLabels.length} unique`);

  // 4. HUMAN-LIKE WRITING
  console.log('\n=== 🧑 İNSAN YAZISI BELİRTEÇLERİ ===');
  
  // First person
  const firstPerson = text.match(/\bI've\b|\bI('|')ve\b|\bIn my experience\b|\bI always\b|\bI('|')ve watched\b|\bI('|')ve seen\b|\bmy experience\b/gi);
  console.log(`   ${firstPerson && firstPerson.length >= 2 ? '✅' : '🟡'} 1. tekil kişi: ${firstPerson ? firstPerson.length + 'x — ' + firstPerson.join(', ') : '0x'}`);
  
  // Casual phrases
  const casual = text.match(/here's the thing|let's be real|spoiler alert|plot twist|real talk|here's the deal|truth is|honestly/gi);
  console.log(`   ${casual ? '✅' : '🟡'} Günlük dil: ${casual ? casual.length + 'x — ' + casual.join(', ') : '0x'}`);
  
  // Sentence fragments (sentences under 6 words ending with period)
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  const fragments = sentences.filter(s => s.split(/\s+/).length <= 5 && s.split(/\s+/).length >= 2);
  console.log(`   ${fragments.length >= 3 ? '✅' : '🟡'} Kısa cümle fragmentleri: ${fragments.length}x`);
  
  // Real trader names
  const traderNames = text.match(/Paul Tudor Jones|Mark Douglas|Ed Seykota|Jesse Livermore|Ray Dalio|Warren Buffett|George Soros|Linda Raschke|Van Tharp|Alexander Elder/gi);
  console.log(`   ${traderNames ? '✅' : '🟡'} Gerçek trader referansı: ${traderNames ? traderNames.join(', ') : 'yok'}`);

  // 5. PARAGRAPH VARIATION
  console.log('\n=== 📐 PARAGRAF VARYASYONU ===');
  const paragraphs = data.content.split('</p>')
    .map(p => p.replace(/<[^>]+>/g, '').trim())
    .filter(p => p.length > 10);
  const parLens = paragraphs.map(p => p.split(/\s+/).length);
  const shortParas = parLens.filter(l => l <= 15).length;
  const longParas = parLens.filter(l => l > 40).length;
  const medParas = parLens.filter(l => l > 15 && l <= 40).length;
  const avgLen = Math.round(parLens.reduce((a, b) => a + b, 0) / parLens.length);
  const variance = parLens.reduce((sum, l) => sum + Math.pow(l - avgLen, 2), 0) / parLens.length;
  const cv = Math.round(Math.sqrt(variance) / avgLen * 100);
  
  console.log(`   Paragraflar: ${parLens.length} adet`);
  console.log(`   Kısa (≤15 kelime): ${shortParas}  |  Orta (16-40): ${medParas}  |  Uzun (40+): ${longParas}`);
  console.log(`   Uzunluk varyasyonu CV: ${cv}%  ${cv >= 60 ? '✅ Doğal' : cv >= 45 ? '🟡 Kabul edilebilir' : '❌ Çok uniform'}`);

  // 6. SENTENCE STARTER DIVERSITY
  console.log('\n=== 📝 CÜMLE BAŞLANGIÇ ÇEŞİTLİLİĞİ ===');
  const allSentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  const starters = {};
  allSentences.forEach(s => {
    const first = s.split(/\s+/)[0].toLowerCase();
    starters[first] = (starters[first] || 0) + 1;
  });
  const repetitive = Object.entries(starters)
    .filter(([, count]) => count >= 4)
    .sort((a, b) => b[1] - a[1]);
  if (repetitive.length > 0) {
    console.log('   🟡 Çok tekrarlayan başlangıçlar:');
    repetitive.forEach(([word, count]) => console.log(`      "${word}..." ${count}x`));
  } else {
    console.log('   ✅ Cümle başlangıçları yeterince çeşitli');
  }

  // 7. CTA ENDING
  console.log('\n=== 🎯 CTA BİTİŞ ===');
  const lastParagraphs = paragraphs.slice(-3);
  const lastText = lastParagraphs.join(' ');
  const readyTo = /^Ready to/i.test(lastParagraphs[lastParagraphs.length - 1]);
  console.log(`   ${readyTo ? '❌ "Ready to" ile başlıyor' : '✅ "Ready to" ile başlamıyor'}`);
  console.log(`   Son paragraflar:`);
  lastParagraphs.forEach(p => console.log(`      "${p.substring(0, 100)}..."`));

  // 8. CONTENT PREVIEW
  console.log('\n=== 📄 İÇERİK ÖNİZLEME (ilk 500 karakter) ===');
  console.log(text.substring(0, 500));
  console.log('\n=== 📄 İÇERİK SONU (son 400 karakter) ===');
  console.log(text.substring(text.length - 400));

  // FINAL SCORE
  console.log('\n' + '='.repeat(50));
  let score = 0;
  if (bannedCount === 0) score += 3;
  else if (bannedCount <= 2) score += 1;
  if (diverse) score += 2;
  if (firstPerson && firstPerson.length >= 2) score += 2;
  if (casual) score += 1;
  if (cv >= 50) score += 2;
  else if (cv >= 40) score += 1;
  if (!readyTo) score += 1;
  if (repetitive.length === 0) score += 1;
  if (traderNames) score += 1;
  
  const maxScore = 13;
  const pct = Math.round(score / maxScore * 100);
  const grade = pct >= 85 ? '🟢 MÜKEMMEL' : pct >= 65 ? '🟡 İYİ' : pct >= 45 ? '🟠 ORTA' : '🔴 ZAYIF';
  console.log(`📊 İNSAN BENZERLİK SKORU: ${score}/${maxScore} (${pct}%) ${grade}`);
  console.log(`🤖 Google AI Tespit Riski: ${pct >= 85 ? 'ÇOK DÜŞÜK' : pct >= 65 ? 'DÜŞÜK' : pct >= 45 ? 'ORTA' : 'YÜKSEK'}`);
}

analyze();
