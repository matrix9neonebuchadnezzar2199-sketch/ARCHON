import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageDoc } from "@/components/shared/PageDoc";
import {
  findPickKeyForModel,
  LLM_PICK_CUSTOM,
  type Meta,
} from "@/components/settings/LlmModelSelect";
import { LlmModeSelector, type LlmMode } from "@/components/settings/LlmModeSelector";
import { OnlinePanel } from "@/components/settings/OnlinePanel";
import { LocalPanel, type LocalTool } from "@/components/settings/LocalPanel";
import { EngineSettingsPanel, type EngineEditValues } from "@/components/settings/EngineSettingsPanel";
import { AdminPanel } from "@/components/settings/AdminPanel";
import { buildRowsForSettingsMode } from "@/lib/llmPhase8Adapters";
import { fetchJSON, postJSON } from "@/lib/api";
import { getPageHelp } from "@/docs/pageHelps";
import { Settings, Save, RefreshCw, Loader2 } from "lucide-react";
import type {
  ArchonConfig,
  Guru,
  Analyst,
  LlmCandidatesResponse,
  ConnectionTestResult,
} from "@/types";

type SettingsGet = { config: ArchonConfig; secrets_set: Record<string, boolean> };

type SecretShape = {
  openai_api_key: string;
  anthropic_api_key: string;
  google_api_key: string;
  xai_api_key: string;
  groq_api_key: string;
  deepseek_api_key: string;
  financial_datasets_api_key: string;
  alpha_vantage_api_key: string;
};

const emptySecrets = (): SecretShape => ({
  openai_api_key: "",
  anthropic_api_key: "",
  google_api_key: "",
  xai_api_key: "",
  groq_api_key: "",
  deepseek_api_key: "",
  financial_datasets_api_key: "",
  alpha_vantage_api_key: "",
});

const LOCAL_PROVIDERS = new Set(["ollama"]);

function inferMode(provider: string, openaiBaseUrl: string): LlmMode {
  if (LOCAL_PROVIDERS.has(provider)) return "local";
  const b = (openaiBaseUrl || "").trim();
  if (
    b.length > 0 &&
    !b.includes("api.openai.com") &&
    (b.includes("127.0.0.1") || b.includes("localhost") || b.includes("host.docker.internal"))
  ) {
    return "local";
  }
  return "online";
}

function inferLocalTool(provider: string, openaiBaseUrl: string): LocalTool {
  if (provider === "ollama") return "ollama";
  if (openaiBaseUrl && !openaiBaseUrl.includes("api.openai.com") && openaiBaseUrl.length > 0) {
    return "lm-studio";
  }
  return "ollama";
}

type FullEdit = EngineEditValues & {
  llm_provider: string;
  deep_think_llm: string;
  quick_think_llm: string;
  guru_llm: string;
  ollama_base_url: string;
  openai_base_url: string;
};

export default function SettingsPage() {
  const [config, setConfig] = useState<ArchonConfig | null>(null);
  const [secretsSet, setSecretsSet] = useState<Record<string, boolean>>({});
  const [secrets, setSecrets] = useState<SecretShape>(() => emptySecrets());
  const [saving, setSaving] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);

  const [llmMode, setLlmMode] = useState<LlmMode>("online");
  const [localTool, setLocalTool] = useState<LocalTool>("ollama");

  const [phase8, setPhase8] = useState<LlmCandidatesResponse | null>(null);
  const [candLoading, setCandLoading] = useState(false);

  const [connResults, setConnResults] = useState<ConnectionTestResult[]>([]);
  const [connTesting, setConnTesting] = useState(false);

  const [pickD, setPickD] = useState(LLM_PICK_CUSTOM);
  const [pickQ, setPickQ] = useState(LLM_PICK_CUSTOM);
  const [pickG, setPickG] = useState(LLM_PICK_CUSTOM);

  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [analystList, setAnalystList] = useState<Analyst[]>([]);

  const [ev, setEv] = useState<FullEdit>({
    llm_provider: "openai",
    deep_think_llm: "",
    quick_think_llm: "",
    guru_llm: "",
    ollama_base_url: "",
    openai_base_url: "",
    output_language: "",
    max_invest_debate_rounds: 2,
    max_risk_debate_rounds: 2,
    anthropic_effort: "",
    openai_reasoning_effort: "",
    google_thinking_level: "",
    enable_valuation_agent: true,
    enable_memory: true,
    enable_reflection: true,
    allow_short: true,
    initial_cash: 100_000,
    margin_requirement: 0,
    enabled_gurus: [] as string[],
    selected_analysts: [] as string[],
  });

  const evRef = useRef(ev);
  useEffect(() => {
    evRef.current = ev;
  }, [ev]);

  const activeRows = useMemo(
    () => buildRowsForSettingsMode(phase8, llmMode, localTool),
    [phase8, llmMode, localTool],
  );

  const loadConfig = useCallback(async () => {
    setSavingError(null);
    const [res, cand] = await Promise.all([
      fetchJSON<SettingsGet>("/api/archon/settings"),
      fetchJSON<LlmCandidatesResponse>("/api/archon/llm/candidates").catch(() => null),
    ]);
    setConfig(res.config);
    setSecretsSet(res.secrets_set);
    if (cand) setPhase8(cand);
    setSecrets(emptySecrets());

    const c = res.config;
    const provider = c.llm_provider || "openai";
    const ollamaUrl = String((c as ArchonConfig & { ollama_base_url?: string }).ollama_base_url ?? "");
    const openaiUrl = String((c as ArchonConfig & { openai_base_url?: string }).openai_base_url ?? "");
    const mode = inferMode(provider, openaiUrl);
    const tool = inferLocalTool(provider, openaiUrl);

    const newEv: FullEdit = {
      llm_provider: provider,
      deep_think_llm: c.deep_think_llm || "",
      quick_think_llm: c.quick_think_llm || "",
      guru_llm: c.guru_llm || "",
      ollama_base_url: ollamaUrl,
      openai_base_url: openaiUrl,
      output_language: c.output_language || "",
      max_invest_debate_rounds: c.max_invest_debate_rounds ?? 2,
      max_risk_debate_rounds: c.max_risk_debate_rounds ?? 2,
      anthropic_effort: String(c.anthropic_effort ?? ""),
      openai_reasoning_effort: String(c.openai_reasoning_effort ?? ""),
      google_thinking_level: String(c.google_thinking_level ?? ""),
      enable_valuation_agent: c.enable_valuation_agent !== false,
      enable_memory: c.enable_memory !== false,
      enable_reflection: c.enable_reflection !== false,
      allow_short: c.allow_short !== false,
      initial_cash: typeof c.initial_cash === "number" ? c.initial_cash : 100_000,
      margin_requirement: typeof c.margin_requirement === "number" ? c.margin_requirement : 0,
      enabled_gurus: (c.enabled_gurus as string[]) || [],
      selected_analysts: (c.selected_analysts as string[]) || [],
    };
    setEv(newEv);
    setLlmMode(mode);
    setLocalTool(tool);

    if (cand) {
      const rows = buildRowsForSettingsMode(cand, mode, tool);
      setPickD(findPickKeyForModel(newEv.deep_think_llm, provider, rows));
      setPickQ(findPickKeyForModel(newEv.quick_think_llm, provider, rows));
      setPickG(findPickKeyForModel(newEv.guru_llm, provider, rows));
    }
  }, []);

  const loadCandidates = useCallback(async () => {
    setCandLoading(true);
    try {
      const data = await fetchJSON<LlmCandidatesResponse>("/api/archon/llm/candidates");
      setPhase8(data);
      const rows = buildRowsForSettingsMode(
        data,
        llmMode,
        localTool,
      );
      const e = evRef.current;
      const p = e.llm_provider || "";
      setPickD((pd) => (pd === LLM_PICK_CUSTOM ? pd : findPickKeyForModel(e.deep_think_llm, p, rows)));
      setPickQ((pd) => (pd === LLM_PICK_CUSTOM ? pd : findPickKeyForModel(e.quick_think_llm, p, rows)));
      setPickG((pd) => (pd === LLM_PICK_CUSTOM ? pd : findPickKeyForModel(e.guru_llm, p, rows)));
    } catch (e) {
      console.error(e);
    } finally {
      setCandLoading(false);
    }
  }, [llmMode, localTool]);

  useEffect(() => {
    if (!phase8) return;
    const e = evRef.current;
    const p = e.llm_provider || "";
    setPickD((pd) => (pd === LLM_PICK_CUSTOM ? pd : findPickKeyForModel(e.deep_think_llm, p, activeRows)));
    setPickQ((pd) => (pd === LLM_PICK_CUSTOM ? pd : findPickKeyForModel(e.quick_think_llm, p, activeRows)));
    setPickG((pd) => (pd === LLM_PICK_CUSTOM ? pd : findPickKeyForModel(e.guru_llm, p, activeRows)));
  }, [llmMode, localTool, phase8, activeRows]);

  const loadGurusAnalysts = useCallback(async () => {
    try {
      const [g, a] = await Promise.all([
        fetchJSON<{ gurus: Guru[] }>("/api/ultimate/gurus"),
        fetchJSON<{ analysts: Analyst[] }>("/api/ultimate/analysts"),
      ]);
      setGuruList(g.gurus || []);
      setAnalystList(a.analysts || []);
    } catch {
      setGuruList([]);
      setAnalystList([]);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
    void loadGurusAnalysts();
  }, [loadConfig, loadGurusAnalysts]);

  const handleModeChange = (mode: LlmMode) => {
    setLlmMode(mode);
    setConnResults([]);
    if (mode === "online") {
      setEv((p) => ({ ...p, llm_provider: p.llm_provider === "ollama" ? "openai" : p.llm_provider }));
    } else {
      setEv((p) => ({
        ...p,
        llm_provider: localTool === "ollama" ? "ollama" : "openai",
      }));
    }
  };

  const handleLocalToolChange = (tool: LocalTool) => {
    setLocalTool(tool);
    setConnResults([]);
    setEv((p) => ({
      ...p,
      llm_provider: tool === "ollama" ? "ollama" : "openai",
    }));
  };

  const handleProviderChange = (next: string) => {
    setEv((p) => ({ ...p, llm_provider: next }));
    setConnResults([]);
  };

  const mkPick =
    (setP: (k: string) => void, field: "deep_think_llm" | "quick_think_llm" | "guru_llm") =>
    (key: string, modelId: string, meta: Meta) => {
      if (key === LLM_PICK_CUSTOM) {
        setP(LLM_PICK_CUSTOM);
        return;
      }
      setP(key);
      setEv((prev) => {
        const n = { ...prev, [field]: modelId } as FullEdit;
        if (meta.setProvider === "ollama" && meta.ollamaBase) {
          n.llm_provider = "ollama";
          n.ollama_base_url = meta.ollamaBase;
        } else if (meta.setProvider === "openai" && meta.lmV1Base) {
          n.llm_provider = "openai";
          n.openai_base_url = meta.lmV1Base;
        } else if (meta.setProvider === "cloud" && meta.cloudProvider) {
          n.llm_provider = meta.cloudProvider;
        }
        return n;
      });
    };

  const mkCustom =
    (field: "deep_think_llm" | "quick_think_llm" | "guru_llm", setP: (k: string) => void) => (s: string) => {
      setEv((p) => ({ ...p, [field]: s }));
      setP(s ? `__raw__${s}` : LLM_PICK_CUSTOM);
    };

  const handleConnectionTest = async () => {
    setConnTesting(true);
    try {
      const r = await postJSON<ConnectionTestResult[]>("/api/archon/llm/connection-test", {});
      setConnResults(r);
    } catch (e) {
      console.error(e);
    } finally {
      setConnTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSavingError(null);
    try {
      const body: Record<string, unknown> = { ...ev };
      (Object.keys(secrets) as (keyof SecretShape)[]).forEach((k) => {
        const v = secrets[k].trim();
        if (v) {
          body[k] = v;
        }
      });
      const res = await fetch("/api/archon/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        setSavingError(t);
        throw new Error(t);
      }
      await loadConfig();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const onSecretChange = (k: string, v: string) => {
    setSecrets((p) => ({ ...p, [k]: v } as SecretShape));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Settings className="h-8 w-8 text-archon-500" />
          設定
        </h1>
        <p className="mt-1 text-muted-foreground">
          接続方式を選び、API キーまたはローカル LLM を設定してから、モデルとエンジンを調整します
        </p>
      </div>

      <PageDoc markdown={getPageHelp("/settings")} title="この画面の説明（Markdown）" defaultOpen={false} />

      <LlmModeSelector value={llmMode} onChange={handleModeChange} />

      {llmMode === "online" ? (
        <OnlinePanel
          provider={ev.llm_provider}
          onProviderChange={handleProviderChange}
          secrets={secrets as Record<string, string>}
          onSecretChange={onSecretChange}
          secretsSet={secretsSet}
          phase8={phase8}
          deepModel={ev.deep_think_llm}
          quickModel={ev.quick_think_llm}
          guruModel={ev.guru_llm}
          pickD={pickD}
          pickQ={pickQ}
          pickG={pickG}
          onPickD={mkPick(setPickD, "deep_think_llm")}
          onPickQ={mkPick(setPickQ, "quick_think_llm")}
          onPickG={mkPick(setPickG, "guru_llm")}
          onCustomD={mkCustom("deep_think_llm", setPickD)}
          onCustomQ={mkCustom("quick_think_llm", setPickQ)}
          onCustomG={mkCustom("guru_llm", setPickG)}
          connResults={connResults}
          connTesting={connTesting}
          onConnectionTest={handleConnectionTest}
        />
      ) : (
        <LocalPanel
          tool={localTool}
          onToolChange={handleLocalToolChange}
          ollamaBaseUrl={ev.ollama_base_url}
          onOllamaBaseUrlChange={(v) => setEv((p) => ({ ...p, ollama_base_url: v }))}
          openaiBaseUrl={ev.openai_base_url}
          onOpenaiBaseUrlChange={(v) => setEv((p) => ({ ...p, openai_base_url: v }))}
          phase8={phase8}
          candLoading={candLoading}
          onRefreshCandidates={() => {
            void loadCandidates();
          }}
          deepModel={ev.deep_think_llm}
          quickModel={ev.quick_think_llm}
          guruModel={ev.guru_llm}
          pickD={pickD}
          pickQ={pickQ}
          pickG={pickG}
          onPickD={mkPick(setPickD, "deep_think_llm")}
          onPickQ={mkPick(setPickQ, "quick_think_llm")}
          onPickG={mkPick(setPickG, "guru_llm")}
          onCustomD={mkCustom("deep_think_llm", setPickD)}
          onCustomQ={mkCustom("quick_think_llm", setPickQ)}
          onCustomG={mkCustom("guru_llm", setPickG)}
          connResults={connResults}
          connTesting={connTesting}
          onConnectionTest={handleConnectionTest}
        />
      )}

      <EngineSettingsPanel
        ev={ev}
        onChange={(patch) => setEv((p) => ({ ...p, ...patch }))}
        guruList={guruList}
        analystList={analystList}
      />

      <AdminPanel onConfigReload={() => void loadConfig()} />

      {savingError && (
        <p className="text-sm text-amber-600/90">保存に失敗しました: {savingError.slice(0, 200)}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={saving} className="bg-archon-500 hover:bg-archon-600">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "保存中…" : "設定を保存"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void loadConfig();
            void loadCandidates();
            void loadGurusAnalysts();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          全て再読込
        </Button>
        {candLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {config && (
        <p className="text-xs text-muted-foreground">
          表示中: Guru {config.enabled_gurus?.length} 名 / TA {config.selected_analysts?.length} 名
        </p>
      )}
    </div>
  );
}
