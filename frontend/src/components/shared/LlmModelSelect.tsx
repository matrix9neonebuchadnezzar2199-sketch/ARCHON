/**
 * Phase 8: 既存 `settings/LlmModelSelect` の再エクスポート。
 * `phase8ResponseToLegacyLlmData` で `LlmCandidatesData` へ変換して行を構築する。
 */
export {
  LlmModelSelectField,
  buildModelRows,
  findPickKeyForModel,
  LLM_PICK_CUSTOM,
} from "@/components/settings/LlmModelSelect";
export type { RRow, LlmCandidatesData, LlmLocalBlock, Meta } from "@/components/settings/LlmModelSelect";
export { phase8ResponseToLegacyLlmData } from "@/lib/llmPhase8Adapters";
