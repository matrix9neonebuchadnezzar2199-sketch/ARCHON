// SSE — aligned with archon_app/models/events.py

export interface SSEStartEvent {
  type: "start";
  engine: string;
}

export interface SSEProgressEvent {
  type: "progress";
  engine: string;
  agent: string;
  ticker?: string;
  status: string;
  detail?: string;
}

export interface SSECompleteEvent {
  type: "complete";
  engine: string;
  data: Record<string, unknown>;
}

export interface SSEErrorEvent {
  type: "error";
  engine: string;
  message: string;
}

export type SSEEvent =
  | SSEStartEvent
  | SSEProgressEvent
  | SSECompleteEvent
  | SSEErrorEvent;

// API

export interface HealthResponse {
  status: string;
  system: string;
  version: string;
  engines: {
    ai_hedge_fund: boolean;
    trading_agents: boolean;
    ultimate: boolean;
  };
  /** Present from API v0.2.0+ */
  llm?: {
    provider: string;
    api_key_configured: boolean;
    expected_api_key_env: string | null;
  };
}

export interface Analyst {
  key: string;
  name: string;
  description: string;
}

export interface Guru {
  key: string;
  display_name: string;
  description: string;
  investing_style: string;
}

export interface TARunRequest {
  tickers: string[];
  trade_date: string;
  selected_analysts?: string[];
  llm_provider?: string;
  deep_think_model?: string;
  quick_think_model?: string;
  max_debate_rounds?: number;
  max_risk_rounds?: number;
  output_language?: string;
}

export interface ArchonConfig {
  llm_provider: string;
  deep_think_llm: string;
  quick_think_llm: string;
  guru_llm: string;
  output_language: string;
  max_invest_debate_rounds: number;
  max_risk_debate_rounds: number;
  enabled_gurus: string[];
  selected_analysts: string[];
  [key: string]: unknown;
}

export type Signal = "bullish" | "bearish" | "neutral";

// Ultimate Mode

export interface GuruSignalEntry {
  guru: string;
  signal: Signal;
  confidence: number;
  reasoning: string;
}

export interface Verdict {
  action: "buy" | "sell" | "hold";
  confidence: number;
  aligned: boolean;
  guru_lean: string;
  ta_lean: string;
  reasoning: string;
}

export interface TickerFusion {
  guru_signals: {
    bullish: GuruSignalEntry[];
    bearish: GuruSignalEntry[];
    neutral: GuruSignalEntry[];
  };
  guru_bull_count: number;
  guru_bear_count: number;
  guru_neutral_count: number;
  ta_decision: unknown;
  ta_reports: Record<string, unknown>;
  ta_debate: Record<string, unknown>;
  ta_trader_plan: unknown;
  verdict: Verdict;
}

export interface UltimateRunRequest {
  tickers: string[];
  trade_date: string;
  start_date?: string;
  end_date?: string;
  enabled_gurus?: string[];
  selected_analysts?: string[];
  llm_provider?: string;
  deep_think_model?: string;
  quick_think_model?: string;
  guru_model?: string;
  max_invest_debate_rounds?: number;
  max_risk_debate_rounds?: number;
  output_language?: string;
}

export interface UltimateResult {
  tickers: string[];
  trade_date: string;
  fusion: Record<string, TickerFusion>;
  hedge_fund_result: Record<string, unknown>;
  trading_agents_result: Record<string, unknown>;
  engine: string;
  phase: number;
}

// AI Hedge Fund (ARCHON /api/hf)

export interface HFRunRequest {
  tickers: string[];
  start_date: string;
  end_date: string;
  selected_analysts?: string[];
  model_name?: string;
  model_provider?: string;
  initial_cash?: number;
  show_reasoning?: boolean;
}

export interface HFResult {
  decisions: unknown;
  analyst_signals: Record<string, unknown>;
  engine: string;
  mode: string;
}

// Backtest

export interface BacktestRunRequest {
  tickers: string[];
  start_date: string;
  end_date: string;
  initial_capital?: number;
  model_name?: string;
  model_provider?: string;
  selected_analysts?: string[];
  margin_requirement?: number;
}

export interface BacktestPortfolioValue {
  date: string;
  value: number;
  long_exposure?: number;
  short_exposure?: number;
  gross_exposure?: number;
  net_exposure?: number;
  long_short_ratio?: number;
}

export interface BacktestPerformanceMetrics {
  sharpe_ratio?: number | null;
  sortino_ratio?: number | null;
  max_drawdown?: number | null;
  max_drawdown_date?: string | null;
  long_short_ratio?: number | null;
  gross_exposure?: number | null;
  net_exposure?: number | null;
}

export interface BacktestResult {
  performance_metrics: BacktestPerformanceMetrics;
  portfolio_values: BacktestPortfolioValue[];
  total_days: number;
  initial_capital: number;
  final_value: number;
  total_return_pct: number;
}

// Portfolio

export interface PortfolioPosition {
  ticker: string;
  long_shares: number;
  short_shares: number;
  cost_basis: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  weight_pct: number;
}

export interface PortfolioSummary {
  last_updated: string | null;
  cash: number;
  total_value: number;
  positions: PortfolioPosition[];
  engine_results: Record<string, string>;
}

// Memory (TradingAgents BM25)

export interface MemoryEntry {
  situation: string;
  recommendation: string;
}

export interface MemoryStats {
  disk: Record<string, number>;
  live: Record<string, number>;
  total_disk: number;
  total_live: number;
  memory_dir: string;
}

export interface MemoryQueryMatch {
  matched_situation: string;
  recommendation: string;
  similarity_score: number;
}

// Logs (TA files + archon run JSON)

export interface LogEntry {
  id: string;
  engine: string;
  ticker: string;
  date: string;
  file_path: string;
  size_bytes: number;
}

export interface LogDetail extends LogEntry {
  content: unknown;
  error?: string;
}

// —— Phase 8: LLM candidates, connection test, audit

export interface LlmCandidate {
  id: string;
  display_name: string;
  provider: string;
  source: "local" | "cloud";
  parameter_size?: string | null;
  quantization?: string | null;
}

export interface LlmCandidatesResponse {
  candidates: LlmCandidate[];
  ollama_detected: boolean;
  ollama_base_url?: string | null;
  ollama_port?: number | null;
  ollama_error?: string | null;
  lm_studio_detected: boolean;
  lm_studio_base_url?: string | null;
  lm_studio_port?: number | null;
  lm_studio_openai_v1_url?: string | null;
  lm_studio_error?: string | null;
  cloud_providers: string[];
}

export interface ConnectionTestResult {
  provider: string;
  reachable: boolean;
  latency_ms?: number | null;
  error?: string | null;
  model_count?: number | null;
}

export interface AuditEntryV8 {
  ts: string;
  action: string;
  detail: Record<string, unknown>;
}

export interface ConfigExportV8 {
  config: Record<string, unknown>;
  exported_at: string;
  version?: string;
}
