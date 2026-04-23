import type { LlmCandidatesData } from "@/components/settings/LlmModelSelect";
import type { LlmCandidate, LlmCandidatesResponse } from "@/types";

/** GET /api/archon/llm/candidates (Phase 8) → 既存 `buildModelRows` 用 */
export function phase8ResponseToLegacyLlmData(r: LlmCandidatesResponse): LlmCandidatesData {
  const ollamaC = r.candidates.filter(
    (c) => c.source === "local" && c.provider === "ollama",
  );
  const lmsC = r.candidates.filter(
    (c) => c.source === "local" && (c.provider === "lm-studio" || c.provider === "lm_studio"),
  );
  return {
    local: {
      ollama: {
        ok: r.ollama_detected,
        source: "ollama",
        label: "Ollama",
        base_url: r.ollama_base_url ?? null,
        port: r.ollama_port ?? null,
        models: ollamaC.map((m) => ({ id: m.id, label: m.display_name })),
        scanned: [],
      },
      lm_studio: {
        ok: r.lm_studio_detected,
        source: "lm_studio",
        label: "LM Studio",
        base_url: r.lm_studio_base_url ?? null,
        port: r.lm_studio_port ?? null,
        models: lmsC.map((m) => ({ id: m.id, label: m.display_name })),
        scanned: [],
      },
    },
    cloud: {
      models: r.candidates
        .filter((c) => c.source === "cloud")
        .map((m) => ({
          id: m.id,
          label: m.display_name,
          source: "cloud" as const,
          backend: m.provider,
        })),
    },
  };
}

export function countPhase8LocalModels(r: LlmCandidatesResponse | null): { o: number; l: number; c: number } {
  if (!r) return { o: 0, l: 0, c: 0 };
  let o = 0;
  let l = 0;
  let c = 0;
  for (const m of r.candidates) {
    if (m.source === "local" && m.provider === "ollama") o += 1;
    else if (m.source === "local" && (m.provider === "lm-studio" || m.provider === "lm_studio")) l += 1;
    else if (m.source === "cloud") c += 1;
  }
  return { o, l, c };
}

export type { LlmCandidate, LlmCandidatesResponse };
