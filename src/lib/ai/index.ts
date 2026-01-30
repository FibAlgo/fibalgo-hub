/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🧠 AI MODULE EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// V1 - Legacy meta-prompting
export * from './news-analysis';

// V2 - Elite strategist (GPT-5.2 compatible)
export {
  analyzeNewsV2,
  analyzeNewsBatchV2,
  STRATEGIST_SYSTEM_PROMPT,
  buildExecutorPrompt,
  fetchMarketContext,
  validateStrategyOutput,
  validateExecutorOutput,
  MODEL_CONFIGS,
  type NewsInput,
  type StrategistOutput,
  type ExecutorOutput,
  type AnalysisPipelineResult,
  type BatchAnalysisResult,
  type AnalysisOptions,
} from './news-strategist-v2';
