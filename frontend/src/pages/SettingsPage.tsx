import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageDoc } from "@/components/shared/PageDoc";
import {
  buildModelRows,
  findPickKeyForModel,
  LlmModelSelectField,
  type LlmCandidatesData,
  type Meta,
  LLM_PICK_CUSTOM,
} from "@/components/settings/LlmModelSelect";
import { phase8ResponseToLegacyLlmData } from "@/lib/llmPhase8Adapters";
import { fetchJSON, postJSON } from "@/lib/api";
import { getPageHelp } from "@/docs/pageHelps";
import { cn } from "@/lib/utils";
import {
  Settings,
  Save,
  RefreshCw,
  Loader2,
  Wifi,
  Download,
  Upload,
  History,
} from "lucide-react";
import type {
  ArchonConfig,
  Guru,
  Analyst,
  LlmCandidatesResponse,
  ConnectionTestResult,
  AuditEntryV8,
} from "@/types";

type SettingsGet = {
  config: ArchonConfig;
  secrets_set: Record<string, boolean>;
};

type secretShape = {
  openai_api_key: string;
  anthropic_api_key: string;
  google_api_key: string;
  xai_api_key: string;
  groq_api_key: string;
  deepseek_api_key: string;
  financial_datasets_api_key: string;
  alpha_vantage_api_key: string;
};

const SECRET_FIELDS: { apiKey: keyof secretShape; env: string; label: string }[] = [
  { apiKey: "openai_api_key", env: "OPENAI_API_KEY", label: "OpenAI" },
  { apiKey: "anthropic_api_key", env: "ANTHROPIC_API_KEY", label: "Anthropic" },
  { apiKey: "google_api_key", env: "GOOGLE_API_KEY", label: "Google" },
  { apiKey: "xai_api_key", env: "XAI_API_KEY", label: "xAI" },
  { apiKey: "groq_api_key", env: "GROQ_API_KEY", label: "Groq" },
  { apiKey: "deepseek_api_key", env: "DEEPSEEK_API_KEY", label: "DeepSeek" },
  { apiKey: "financial_datasets_api_key", env: "FINANCIAL_DATASETS_API_KEY", label: "Financial Datasets" },
  { apiKey: "alpha_vantage_api_key", env: "ALPHA_VANTAGE_API_KEY", label: "Alpha Vantage" },
];

const emptySecrets = (): secretShape => ({
  openai_api_key: "",
  anthropic_api_key: "",
  google_api_key: "",
  xai_api_key: "",
  groq_api_key: "",
  deepseek_api_key: "",
  financial_datasets_api_key: "",
  alpha_vantage_api_key: "",
});

export default function SettingsPage() {
  const [config, setConfig] = useState<ArchonConfig | null>(null);
  const [secretsSet, setSecretsSet] = useState<Record<string, boolean>>({});
  const [phase8, setPhase8] = useState<LlmCandidatesResponse | null>(null);
  const [candLoading, setCandLoading] = useState(false);
  const [candErr, setCandErr] = useState<string | null>(null);
  const [connResults, setConnResults] = useState<ConnectionTestResult[]>([]);
  const [connTesting, setConnTesting] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntryV8[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [pickD, setPickD] = useState<string>("");
  const [pickQ, setPickQ] = useState<string>("");
  const [pickG, setPickG] = useState<string>("");
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [analystList, setAnalystList] = useState<Analyst[]>([]);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState({
    llm_provider: "",
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
  const editRef = useRef(editValues);
  const [secrets, setSecrets] = useState<secretShape>(() => emptySecrets());

  useEffect(() => {
    editRef.current = editValues;
  }, [editValues]);

  const candidates = useMemo(
    () => (phase8 ? phase8ResponseToLegacyLlmData(phase8) : null),
    [phase8],
  );
  const modelRows = useMemo(() => buildModelRows(candidates), [candidates]);

  const applyPicksForConfig = useCallback((c: ArchonConfig, data: LlmCandidatesData | null) => {
    const rows = buildModelRows(data);
    const p = c.llm_provider || "";
    setPickD(findPickKeyForModel(c.deep_think_llm || "", p, rows));
    setPickQ(findPickKeyForModel(c.quick_think_llm || "", p, rows));
    setPickG(findPickKeyForModel(c.guru_llm || "", p, rows));
  }, []);

  const loadConfig = useCallback(async () => {
    const [res, cand] = await Promise.all([
      fetchJSON<SettingsGet>("/api/archon/settings"),
      fetchJSON<LlmCandidatesResponse>("/api/archon/llm/candidates").catch((e) => {
        console.warn("llm/candidates", e);
        return null;
      }),
    ]);
    setConfig(res.config);
    setSecretsSet(res.secrets_set);
    const c = res.config;
    if (cand) {
      setPhase8(cand);
    }
    const leg = cand ? phase8ResponseToLegacyLlmData(cand) : null;
    setEditValues({
      llm_provider: c.llm_provider || "",
      deep_think_llm: c.deep_think_llm || "",
      quick_think_llm: c.quick_think_llm || "",
      guru_llm: c.guru_llm || "",
      ollama_base_url: String(
        (c as ArchonConfig & { ollama_base_url?: string }).ollama_base_url ?? "",
      ),
      openai_base_url: String(
        (c as ArchonConfig & { openai_base_url?: string }).openai_base_url ?? "",
      ),
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
    });
    setSecrets(emptySecrets());
    applyPicksForConfig(c, leg);
  }, [applyPicksForConfig]);

  const loadCandidates = useCallback(async () => {
    setCandLoading(true);
    setCandErr(null);
    try {
      const data = await fetchJSON<LlmCandidatesResponse>("/api/archon/llm/candidates");
      setPhase8(data);
      const rows = buildModelRows(phase8ResponseToLegacyLlmData(data));
      const ev = editRef.current;
      const p = ev.llm_provider || "";
      setPickD((pd) => (pd === LLM_PICK_CUSTOM ? pd : findPickKeyForModel(ev.deep_think_llm, p, rows)));
      setPickQ((pd) => (pd === LLM_PICK_CUSTOM ? pd : findPickKeyForModel(ev.quick_think_llm, p, rows)));
      setPickG((pd) => (pd === LLM_PICK_CUSTOM ? pd : findPickKeyForModel(ev.guru_llm, p, rows)));
    } catch (e) {
      setCandErr(e instanceof Error ? e.message : String(e));
    } finally {
      setCandLoading(false);
    }
  }, []);

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

  const handleExport = async () => {
    try {
      const data = await fetchJSON<{
        config: Record<string, unknown>;
        exported_at: string;
        version?: string;
      }>("/api/archon/settings/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `archon-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const payload = JSON.parse(text) as { config: Record<string, unknown> };
        await postJSON<{ status: string }>("/api/archon/settings/import", payload);
        await loadConfig();
      } catch (e) {
        console.error(e);
      }
    };
    input.click();
  };

  const handleLoadAudit = async () => {
    try {
      const entries = await fetchJSON<AuditEntryV8[]>("/api/archon/audit?limit=50");
      setAuditLog(entries);
      setShowAudit(true);
    } catch (e) {
      console.error(e);
    }
  };

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
    void loadConfig().catch(console.error);
    void loadGurusAnalysts();
  }, [loadConfig, loadGurusAnalysts]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...editValues };
      (Object.keys(secrets) as (keyof secretShape)[]).forEach((k) => {
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
        throw new Error(await res.text());
      }
      await loadConfig();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleGuru = (key: string) => {
    setEditValues((p) => {
      const s = new Set(p.enabled_gurus);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return { ...p, enabled_gurus: Array.from(s) };
    });
  };

  const toggleAnalyst = (key: string) => {
    setEditValues((p) => {
      const s = new Set(p.selected_analysts);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return { ...p, selected_analysts: Array.from(s) };
    });
  };

  const onPickDeep = (k: string, modelId: string, meta: Meta) => {
    if (k === LLM_PICK_CUSTOM) {
      setPickD(LLM_PICK_CUSTOM);
      return;
    }
    setPickD(k);
    setEditValues((ev) => {
      const n = { ...ev, deep_think_llm: modelId };
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
  const onCustomDeep = (s: string) => {
    setEditValues((ev) => ({ ...ev, deep_think_llm: s }));
    setPickD(s ? `__raw__${s}` : LLM_PICK_CUSTOM);
  };

  const onPickQuick = (k: string, modelId: string, meta: Meta) => {
    if (k === LLM_PICK_CUSTOM) {
      setPickQ(LLM_PICK_CUSTOM);
      return;
    }
    setPickQ(k);
    setEditValues((ev) => {
      const n = { ...ev, quick_think_llm: modelId };
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
  const onCustomQuick = (s: string) => {
    setEditValues((ev) => ({ ...ev, quick_think_llm: s }));
    setPickQ(s ? `__raw__${s}` : LLM_PICK_CUSTOM);
  };

  const onPickGuru = (k: string, modelId: string, meta: Meta) => {
    if (k === LLM_PICK_CUSTOM) {
      setPickG(LLM_PICK_CUSTOM);
      return;
    }
    setPickG(k);
    setEditValues((ev) => {
      const n = { ...ev, guru_llm: modelId };
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
  const onCustomGuru = (s: string) => {
    setEditValues((ev) => ({ ...ev, guru_llm: s }));
    setPickG(s ? `__raw__${s}` : LLM_PICK_CUSTOM);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Settings className="h-8 w-8 text-archon-500" />
          設定
        </h1>
        <p className="mt-1 text-muted-foreground">
          この画面の変更は**プロセス内に即反映**（API キーは**サーバ内ファイル**に保存）。不整合時はバックエンド再起動。
        </p>
      </div>

      <PageDoc markdown={getPageHelp("/settings")} title="この画面の説明（Markdown）" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API キー（空欄で保存すると変更しません）</CardTitle>
          <CardDescription>
            値は `.memory/ui_secrets.json` に永続。Docker では .memory ボリューム配下。共有端末では**画面共有**に注意。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SECRET_FIELDS.map(({ apiKey, env, label }) => {
            const set = secretsSet[env];
            return (
              <div key={env} className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {label}（{env}）{set ? " · 設定済" : " · 未設定"}
                </label>
                <Input
                  type="password"
                  value={secrets[apiKey as keyof secretShape]}
                  onChange={(e) =>
                    setSecrets((p) => ({ ...p, [apiKey]: e.target.value } as secretShape))
                  }
                  autoComplete="off"
                  placeholder={set ? "●●● 上書きする場合のみ入力" : "キーを貼り付け"}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">LLM 設定</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {candLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {candErr && <span className="text-amber-500/90">候補取得: {candErr}</span>}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  void loadCandidates();
                }}
                disabled={candLoading}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                LLM 一覧を更新
              </Button>
            </div>
          </div>
          {phase8 && (
            <CardDescription className="text-xs text-muted-foreground/90">
              検出:{" "}
              {phase8.ollama_detected
                ? `Ollama · ポート ${
                    phase8.ollama_port ?? "—"
                  } · ${phase8.ollama_base_url ?? "—"}`
                : "Ollama: 未検出"}
              {phase8.ollama_error ? `（${phase8.ollama_error}）` : ""}
              {" · "}
              {phase8.lm_studio_detected
                ? `LM Studio (OpenAI) · ポート ${
                    phase8.lm_studio_port ?? "—"
                  } · ${phase8.lm_studio_base_url ?? "—"}`
                : "LM Studio: 未検出"}
              {phase8.lm_studio_error ? `（${phase8.lm_studio_error}）` : ""}
              {phase8.cloud_providers?.length
                ? ` · クラウド鍵: ${phase8.cloud_providers.join(", ")}`
                : ""}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="LLM プロバイダ（例: openai, anthropic, google, ollama, groq …。ローカル選択で自動設定）"
              value={editValues.llm_provider}
              onChange={(v) => setEditValues((p) => ({ ...p, llm_provider: v }))}
            />
            <Field
              label="出力言語"
              value={editValues.output_language}
              onChange={(v) => setEditValues((p) => ({ ...p, output_language: v }))}
            />
            <LlmModelSelectField
              label="深い思考モデル"
              className="md:col-span-1"
              pickKey={pickD}
              onPickKey={onPickDeep}
              customModelId={editValues.deep_think_llm}
              onCustomModelId={onCustomDeep}
              rows={modelRows}
            />
            <LlmModelSelectField
              label="速い思考モデル"
              pickKey={pickQ}
              onPickKey={onPickQuick}
              customModelId={editValues.quick_think_llm}
              onCustomModelId={onCustomQuick}
              rows={modelRows}
            />
            <LlmModelSelectField
              label="Guru モデル"
              pickKey={pickG}
              onPickKey={onPickGuru}
              customModelId={editValues.guru_llm}
              onCustomModelId={onCustomGuru}
              rows={modelRows}
            />
            <div className="md:col-span-2">
              <div className="text-xs font-medium text-muted-foreground">エンドポイント（上書き・表示用。保存で反映）</div>
              <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  className="font-mono text-xs"
                  value={editValues.ollama_base_url}
                  onChange={(e) => setEditValues((p) => ({ ...p, ollama_base_url: e.target.value }))}
                  placeholder="Ollama ベース URL (例: http://127.0.0.1:11434)"
                />
                <Input
                  className="font-mono text-xs"
                  value={editValues.openai_base_url}
                  onChange={(e) => setEditValues((p) => ({ ...p, openai_base_url: e.target.value }))}
                  placeholder="OpenAI 互換ベース（LM Studio は …/v1 まで。クラウドは空)"
                />
              </div>
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-xs"
                onClick={() => {
                  void handleConnectionTest();
                }}
                disabled={connTesting}
              >
                {connTesting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Wifi className="mr-1.5 h-3.5 w-3.5" />}
                接続テスト
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-xs"
                onClick={() => {
                  void handleExport();
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                設定をエクスポート
              </Button>
              <Button type="button" variant="secondary" size="sm" className="text-xs" onClick={handleImport}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                設定をインポート
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-xs"
                onClick={() => {
                  void handleLoadAudit();
                }}
              >
                <History className="mr-1.5 h-3.5 w-3.5" />
                監査ログ
              </Button>
            </div>
            <Field
              label="投資討議ラウンド"
              value={String(editValues.max_invest_debate_rounds)}
              onChange={(v) =>
                setEditValues((p) => ({ ...p, max_invest_debate_rounds: parseInt(v, 10) || 1 }))
              }
            />
            <Field
              label="リスク討議ラウンド"
              value={String(editValues.max_risk_debate_rounds)}
              onChange={(v) =>
                setEditValues((p) => ({ ...p, max_risk_debate_rounds: parseInt(v, 10) || 1 }))
              }
            />
            <Field
              label="ANTHROPIC_EFFORT（空でクリア:未設定）"
              value={editValues.anthropic_effort}
              onChange={(v) => setEditValues((p) => ({ ...p, anthropic_effort: v }))}
            />
            <Field
              label="OPENAI_REASONING_EFFORT"
              value={editValues.openai_reasoning_effort}
              onChange={(v) => setEditValues((p) => ({ ...p, openai_reasoning_effort: v }))}
            />
            <Field
              label="GOOGLE_THINKING_LEVEL"
              value={editValues.google_thinking_level}
              onChange={(v) => setEditValues((p) => ({ ...p, google_thinking_level: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {connResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">接続テスト</CardTitle>
            <CardDescription>直近の <code className="text-xs">POST /api/archon/llm/connection-test</code> 結果</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {connResults.map((r) => (
                <div
                  key={r.provider}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                    r.reachable
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-red-500/25 bg-red-500/5",
                  )}
                >
                  <span className="font-medium capitalize">{r.provider}</span>
                  <div className="text-right text-xs text-muted-foreground">
                    {r.reachable ? (
                      <>
                        {r.latency_ms != null && r.latency_ms > 0 && <span>{r.latency_ms} ms</span>}
                        {r.model_count != null && (
                          <span className="ml-1">· {r.model_count} モデル</span>
                        )}
                        {r.latency_ms === 0 && (r.model_count == null) && "鍵あり"}
                      </>
                    ) : (
                      <span className="text-amber-600/90">{(r.error || "").slice(0, 80)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">挙動オプション</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {(
            [
              ["enable_valuation_agent", "バリュエーション分析"],
              ["enable_memory", "メモリ（BM25）"],
              ["enable_reflection", "振り返り（reflection）"],
              ["allow_short", "ショート許可"],
            ] as const
          ).map(([k, la]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-border"
                checked={!!editValues[k as keyof typeof editValues]}
                onChange={(e) => setEditValues((p) => ({ ...p, [k]: e.target.checked }))}
              />
              {la}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">シミュレーション数値</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="初期現金"
            value={String(editValues.initial_cash)}
            onChange={(v) =>
              setEditValues((p) => ({ ...p, initial_cash: parseFloat(v) || 0 }))
            }
          />
          <Field
            label="マージン要件"
            value={String(editValues.margin_requirement)}
            onChange={(v) =>
              setEditValues((p) => ({ ...p, margin_requirement: parseFloat(v) || 0 }))
            }
          />
        </CardContent>
      </Card>

      {guruList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">有効な Guru</CardTitle>
            <CardDescription>Ultimate / Hedge 系の対象。チェックで有効化。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {guruList.map((g) => {
                const on = editValues.enabled_gurus.includes(g.key);
                return (
                  <Badge
                    key={g.key}
                    variant={on ? "default" : "outline"}
                    className={`cursor-pointer text-xs ${
                      on
                        ? "bg-archon-500/20 text-archon-300"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => toggleGuru(g.key)}
                  >
                    {g.display_name}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {analystList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">選択アナリスト（TA / Ultimate 系）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analystList.map((a) => {
                const on = editValues.selected_analysts.includes(a.key);
                return (
                  <Badge
                    key={a.key}
                    variant={on ? "default" : "outline"}
                    className={`cursor-pointer text-xs ${
                      on
                        ? "bg-archon-500/20 text-archon-300"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => toggleAnalyst(a.key)}
                  >
                    {a.name}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {showAudit && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">監査ログ（直近）</CardTitle>
              <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setShowAudit(false)}>
                閉じる
              </Button>
            </div>
            <CardDescription>設定更新・接続テスト等（サーバ <code className="text-xs">.results/audit_log.jsonl</code> へも追記）</CardDescription>
          </CardHeader>
          <CardContent>
            {auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">エントリなし</p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {auditLog.map((e, i) => (
                  <div
                    key={`${e.ts}-${i}`}
                    className="flex flex-col gap-1 rounded border border-border p-2 text-xs sm:flex-row sm:items-start sm:gap-2"
                  >
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(e.ts).toLocaleString()}
                    </span>
                    <span className="shrink-0 font-medium text-archon-400/90">{e.action}</span>
                    <span className="min-w-0 break-all text-muted-foreground">
                      {JSON.stringify(e.detail).slice(0, 240)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-archon-500 hover:bg-archon-600"
        >
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
          再読込
        </Button>
      </div>

      {config && (
        <p className="text-xs text-muted-foreground">
          現在: enabled_guru {config.enabled_gurus?.length} 名 / 選択
          {config.selected_analysts?.length} / TA
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
