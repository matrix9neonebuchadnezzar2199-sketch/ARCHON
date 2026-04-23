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
