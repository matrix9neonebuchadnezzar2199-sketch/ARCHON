import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export type RRow = {
  key: string;
  modelId: string;
  line: string;
  group: string;
  source: "cloud" | "ollama" | "lm_studio";
  ollamaBase?: string;
  lmV1Base?: string;
  port?: number | null;
  /** クラウド候補選択時に `llm_provider` へ反映（例: openai） */
  cloudProvider?: string;
};

export type LlmLocalBlock = {
  ok: boolean;
  source: string;
  label: string;
  base_url: string | null;
  port: number | null;
  models: { id: string; label: string }[];
  scanned?: { port?: number; base_url: string; ok: boolean; host?: string }[];
};

export type LlmCandidatesData = {
  local: { ollama: LlmLocalBlock; lm_studio: LlmLocalBlock };
  cloud: { models: { id: string; label: string; source?: string; backend?: string }[] };
};

export const LLM_PICK_CUSTOM = "__custom_input__";
const CUSTOM = LLM_PICK_CUSTOM;

export function buildModelRows(c: LlmCandidatesData | null): RRow[] {
  if (!c) return [];
  const out: RRow[] = [];
  for (const m of c.cloud.models || []) {
    const be = m.backend || "—";
    out.push({
      key: `cloud|${m.id}`,
      modelId: m.id,
      line: `${m.label}（クラウド: ${be}）`,
      group: "クラウド / 登録候補",
      source: "cloud",
      cloudProvider: be !== "—" ? be : undefined,
    });
  }
  const o = c.local.ollama;
  if (o?.ok && o.base_url) {
    for (const m of o.models) {
      out.push({
        key: `ollama|${m.id}`,
        modelId: m.id,
        line: `${m.label} · Ollama 経由 · ポート ${o.port ?? "—"}`,
        group: o.label || "Ollama",
        source: "ollama",
        ollamaBase: o.base_url,
        port: o.port,
      });
    }
  }
  const l = c.local.lm_studio;
  if (l?.ok && l.base_url) {
    const v1 = l.base_url.replace(/\/$/, "").endsWith("/v1")
      ? l.base_url.replace(/\/$/, "")
      : `${l.base_url.replace(/\/$/, "")}/v1`;
    for (const m of l.models) {
      out.push({
        key: `lms|${l.port}|${m.id}`,
        modelId: m.id,
        line: `${m.id} · LM Studio 互換 (OpenAI API) · ${v1} · ポート ${l.port ?? "—"}`,
        group: l.label || "LM Studio",
        source: "lm_studio",
        lmV1Base: v1,
        port: l.port,
      });
    }
  }
  return out;
}

export type Meta = {
  setProvider: "ollama" | "openai" | "cloud" | "unchanged";
  ollamaBase?: string;
  lmV1Base?: string;
  cloudProvider?: string;
};

export function LlmModelSelectField({
  label,
  className,
  pickKey,
  onPickKey,
  customModelId,
  onCustomModelId,
  rows,
  disabled,
}: {
  label: string;
  className?: string;
  pickKey: string;
  onPickKey: (k: string, modelId: string, meta: Meta) => void;
  customModelId: string;
  onCustomModelId: (s: string) => void;
  rows: RRow[];
  disabled?: boolean;
}) {
  const isCustom = pickKey === CUSTOM || pickKey.startsWith("__raw__");
  const selectValue = isCustom ? CUSTOM : pickKey;
  const groups = useMemo(() => {
    const g: Record<string, RRow[]> = {};
    for (const r of rows) {
      if (!g[r.group]) g[r.group] = [];
      g[r.group].push(r);
    }
    return g;
  }, [rows]);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <Select
        value={selectValue}
        onValueChange={(k) => {
          if (k === CUSTOM) {
            onPickKey(CUSTOM, customModelId, { setProvider: "unchanged" });
            return;
          }
          const r = rows.find((x) => x.key === k);
          if (!r) return;
          const meta: Meta = { setProvider: "unchanged" };
          if (r.source === "ollama" && r.ollamaBase) {
            meta.setProvider = "ollama";
            meta.ollamaBase = r.ollamaBase;
          } else if (r.source === "lm_studio" && r.lmV1Base) {
            meta.setProvider = "openai";
            meta.lmV1Base = r.lmV1Base;
          } else if (r.source === "cloud" && r.cloudProvider) {
            meta.setProvider = "cloud";
            meta.cloudProvider = r.cloudProvider;
          } else {
            meta.setProvider = "unchanged";
          }
          onPickKey(k, r.modelId, meta);
        }}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="候補を選択" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {Object.entries(groups).map(([name, list]) => (
            <SelectGroup key={name}>
              <SelectLabel className="text-xs text-archon-400/90">{name}</SelectLabel>
              {list.map((r) => (
                <SelectItem key={r.key} value={r.key} className="text-xs">
                  {r.line}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
          <SelectSeparator />
          <SelectItem value={CUSTOM} className="text-xs text-muted-foreground">
            手でモデル名を入力…
          </SelectItem>
        </SelectContent>
      </Select>
      {isCustom && (
        <Input
          className="mt-1 font-mono text-xs"
          value={customModelId}
          onChange={(e) => onCustomModelId(e.target.value)}
          placeholder="例: gpt-4.1 または llama3.2:latest"
        />
      )}
    </div>
  );
}

export function findPickKeyForModel(
  modelId: string,
  prov: string,
  rows: RRow[],
): string {
  if (!modelId) return CUSTOM;
  const cands = rows.filter((r) => r.modelId === modelId);
  if (cands.length === 0) return `__raw__${modelId}`;
  if (cands.length === 1) return cands[0].key;
  if (prov === "ollama")
    return cands.find((c) => c.source === "ollama")?.key ?? cands[0].key;
  if (cands.length > 1 && prov === "openai" && cands.some((c) => c.source === "lm_studio"))
    return cands.find((c) => c.source === "lm_studio")?.key ?? cands[0].key;
  return cands.find((c) => c.source === "cloud")?.key ?? cands[0].key;
}

