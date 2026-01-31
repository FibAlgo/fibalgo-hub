const payload = {
  title: 'BREAKING: Fed signals earlier rate cuts; DXY drops and gold jumps as yields slide',
  article:
    "The Federal Reserve signaled that rate cuts may come earlier than markets expected, triggering an immediate repricing across rates and FX. The US dollar weakened broadly, Treasury yields fell, and gold rallied as investors shifted to risk-on positioning. Traders are now reassessing the path of policy and inflation in the next 1–3 months.",
  source: 'Test',
  url: '',
};

async function main() {
  const res = await fetch('http://localhost:3000/api/test-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const j = await res.json();
  console.log('test_analyze_response', j);

  const u = new URL('http://localhost:3000/api/news');
  u.searchParams.set('limit', '40');
  u.searchParams.set('period', '24h');
  const news = await fetch(u).then((r) => r.json());

  const tests = (news.news || []).filter((x) => String(x.newsId || '').startsWith('test-'));
  const item = tests[0];
  if (!item) {
    console.log('no_test_item_found');
    return;
  }

  const costs = item.aiAnalysis?.costs || {};
  const haiku = costs.claudeHaiku || {};
  const sonnet = costs.claudeSonnet || {};
  const pplx = costs.perplexity || {};

  const totalDb = Number(costs.total || 0);
  const totalRecomputed =
    Number(haiku.cost || 0) + Number(sonnet.cost || 0) + Number(pplx.cost || 0);

  const out = {
    newsId: item.newsId,
    title: item.aiAnalysis?.stage1?.title || item.content,
    should_build_infrastructure: item.aiAnalysis?.stage1?.should_build_infrastructure,
    trade_decision: item.aiAnalysis?.stage3?.trade_decision,
    importance_score: item.aiAnalysis?.stage3?.importance_score,
    claudeHaiku: { input: haiku.input, output: haiku.output, cost: haiku.cost },
    perplexity: {
      prompt: pplx.prompt,
      completion: pplx.completion,
      requests: pplx.requests,
      cost: pplx.cost,
    },
    claudeSonnet: { input: sonnet.input, output: sonnet.output, cost: sonnet.cost },
    total_db: totalDb,
    total_recomputed: totalRecomputed,
    delta: Number((totalDb - totalRecomputed).toFixed(10)),
    stage2_has_fmp: !!item.aiAnalysis?.market_reaction,
    stage2_has_external_impact: !!item.aiAnalysis?.external_impact,
    stage2_has_raw_perplexity: !!item.aiAnalysis?.stage2_debug?.external_impact_raw,
    legacy_collected_queries: item.aiAnalysis?.collectedData?.length || 0,
  };

  console.log('cost_breakdown', JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

