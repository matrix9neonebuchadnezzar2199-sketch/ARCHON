import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wifi, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import {
  LlmModelSelectField,
  buildModelRows,
  type RRow,
  type Meta,
  type LlmCandidatesData,
} from "@/components/settings/LlmModelSelect";
import type { ConnectionTestResult, LlmCandidatesResponse } from "@/types";
import { phase8ResponseToLegacyLlmData } from "@/lib/llmPhase8Adapters";
import { useMemo } from "react";

export type LocalTool = "ollama" | "lm-studio";

interface Props {
  tool: LocalTool;
  onToolChange: (t: LocalTool) => void;
  ollamaBaseUrl: string;
  onOllamaBaseUrlChange: (v: string) => void;
  openaiBaseUrl: string;
  onOpenaiBaseUrlChange: (v: string) => void;
  phase8: LlmCandidatesResponse | null;
  candLoading: boolean;
  onRefreshCandidates: () => void;
  deepModel: string;
  quickModel: string;
  guruModel: string;
  pickD: string;
  pickQ: string;
  pickG: string;
  onPickD: (k: string, id: string, m: Meta) => void;
  onPickQ: (k: string, id: string, m: Meta) => void;
  onPickG: (k: string, id: string, m: Meta) => void;
  onCustomD: (s: string) => void;
  onCustomQ: (s: string) => void;
  onCustomG: (s: string) => void;
  connResults: ConnectionTestResult[];
  connTesting: boolean;
  onConnectionTest: () => void;
}

export function LocalPanel({
  tool,
  onToolChange,
  ollamaBaseUrl,
  onOllamaBaseUrlChange,
  openaiBaseUrl,
  onOpenaiBaseUrlChange,
  phase8,
  candLoading,
  onRefreshCandidates,
  deepModel,
  quickModel,
  guruModel,
  pickD,
  pickQ,
  pickG,
  onPickD,
  onPickQ,
  onPickG,
  onCustomD,
  onCustomQ,
  onCustomG,
  connResults,
  connTesting,
  onConnectionTest,
}: Props) {
  const localRows: RRow[] = useMemo(() => {
    if (!phase8) return [];
    const legacy = phase8ResponseToLegacyLlmData(phase8);
    const localOnly: LlmCandidatesData = {
      local: legacy.local,
      cloud: { models: [] },
    };
    const all = buildModelRows(localOnly);
    if (tool === "ollama") return all.filter((r) => r.source === "ollama");
    return all.filter((r) => r.source === "lm_studio");
  }, [phase8, tool]);

  const detected = tool === "ollama" ? phase8?.ollama_detected : phase8?.lm_studio_detected;
  const detectedPort = tool === "ollama" ? phase8?.ollama_port : phase8?.lm_studio_port;
  const detectedUrl = tool === "ollama" ? phase8?.ollama_base_url : phase8?.lm_studio_base_url;
  const localConnResults = connResults.filter(
    (r) => r.provider === (tool === "ollama" ? "ollama" : "lm-studio"),
  );

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-foreground">② ローカル LLM の設定</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">LLM 管理ツール</CardTitle>
          <CardDescription>ローカルで使う LLM 管理ツールを選びます</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={tool} onValueChange={(v) => onToolChange(v as LocalTool)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ollama">Ollama</SelectItem>
              <SelectItem value="lm-studio">LM Studio</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex flex-wrap items-center gap-3">
            {detected ? (
              <Badge className="border-green-500/30 bg-green-500/15 text-green-400">
                検出済み
                {detectedPort != null && ` — ポート ${detectedPort}`}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                未検出 — {tool === "ollama" ? "Ollama" : "LM Studio"} を起動してから一覧を更新してください
              </Badge>
            )}
            {detectedUrl && (
              <span className="font-mono text-xs text-muted-foreground">{detectedUrl}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {tool === "ollama" ? "Ollama" : "LM Studio / OpenAI 互換"} ベース URL（上書きする場合）
            </label>
            {tool === "ollama" ? (
              <Input
                className="font-mono text-xs"
                value={ollamaBaseUrl}
                onChange={(e) => onOllamaBaseUrlChange(e.target.value)}
                placeholder="http://127.0.0.1:11434"
              />
            ) : (
              <Input
                className="font-mono text-xs"
                value={openaiBaseUrl}
                onChange={(e) => onOpenaiBaseUrlChange(e.target.value)}
                placeholder="http://127.0.0.1:1234/v1"
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">モデル選択</CardTitle>
              <CardDescription>
                ダウンロード済みモデルから選択
                {localRows.length > 0 && ` — ${localRows.length} 件`}
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onRefreshCandidates} disabled={candLoading}>
              {candLoading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              モデル一覧を更新
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {localRows.length === 0 && !candLoading && (
            <p className="text-sm text-muted-foreground">
              {detected
                ? "ツールは検出されましたがモデルがありません。ダウンロード後に「モデル一覧を更新」してください。"
                : "先にツールを起動してから「モデル一覧を更新」してください。"}
            </p>
          )}
          <LlmModelSelectField
            label="深い思考モデル（高精度・重い処理用）"
            pickKey={pickD}
            onPickKey={onPickD}
            customModelId={deepModel}
            onCustomModelId={onCustomD}
            rows={localRows}
          />
          <LlmModelSelectField
            label="速い思考モデル（軽量・高速処理用）"
            pickKey={pickQ}
            onPickKey={onPickQ}
            customModelId={quickModel}
            onCustomModelId={onCustomQ}
            rows={localRows}
          />
          <LlmModelSelectField
            label="Guru モデル（投資家ペルソナ用）"
            pickKey={pickG}
            onPickKey={onPickG}
            customModelId={guruModel}
            onCustomModelId={onCustomG}
            rows={localRows}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">接続テスト</CardTitle>
          <CardDescription>{tool === "ollama" ? "Ollama" : "LM Studio"} への到達性</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" variant="secondary" size="sm" onClick={onConnectionTest} disabled={connTesting}>
            {connTesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="mr-2 h-4 w-4" />
            )}
            ローカル接続テスト
          </Button>
          {localConnResults.length > 0 && (
            <div className="space-y-2">
              {localConnResults.map((r) => (
                <div
                  key={r.provider}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                    r.reachable
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-red-500/25 bg-red-500/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {r.reachable ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                    <span className="font-medium capitalize">{r.provider}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.reachable ? (
                      <>
                        {r.latency_ms != null && r.latency_ms > 0 && <span>{r.latency_ms} ms</span>}
                        {r.model_count != null && <span className="ml-2">{r.model_count} モデル</span>}
                      </>
                    ) : (
                      <span className="text-red-400">{(r.error || "").slice(0, 80)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
