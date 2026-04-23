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
import { Wifi, Loader2, CheckCircle2, XCircle } from "lucide-react";
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

const CLOUD_PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "xai", label: "xAI (Grok)" },
  { value: "groq", label: "Groq" },
  { value: "deepseek", label: "DeepSeek" },
] as const;

type ProviderSecretKey =
  | "openai_api_key"
  | "anthropic_api_key"
  | "google_api_key"
  | "xai_api_key"
  | "groq_api_key"
  | "deepseek_api_key";

const PROVIDER_SECRETS: Record<string, { key: ProviderSecretKey; env: string }> = {
  openai: { key: "openai_api_key", env: "OPENAI_API_KEY" },
  anthropic: { key: "anthropic_api_key", env: "ANTHROPIC_API_KEY" },
  google: { key: "google_api_key", env: "GOOGLE_API_KEY" },
  xai: { key: "xai_api_key", env: "XAI_API_KEY" },
  groq: { key: "groq_api_key", env: "GROQ_API_KEY" },
  deepseek: { key: "deepseek_api_key", env: "DEEPSEEK_API_KEY" },
};

const DATA_SECRETS: { key: "financial_datasets_api_key" | "alpha_vantage_api_key"; env: string; label: string }[] = [
  { key: "financial_datasets_api_key", env: "FINANCIAL_DATASETS_API_KEY", label: "Financial Datasets" },
  { key: "alpha_vantage_api_key", env: "ALPHA_VANTAGE_API_KEY", label: "Alpha Vantage" },
];

interface Props {
  provider: string;
  onProviderChange: (p: string) => void;
  secrets: Record<string, string>;
  onSecretChange: (key: string, val: string) => void;
  secretsSet: Record<string, boolean>;
  phase8: LlmCandidatesResponse | null;
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

export function OnlinePanel({
  provider,
  onProviderChange,
  secrets,
  onSecretChange,
  secretsSet,
  phase8,
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
  const cloudRows: RRow[] = useMemo(() => {
    if (!phase8) return [];
    const legacy = phase8ResponseToLegacyLlmData(phase8);
    const cloudOnly: LlmCandidatesData = {
      local: {
        ollama: { ...legacy.local.ollama, ok: false, models: [] },
        lm_studio: { ...legacy.local.lm_studio, ok: false, models: [] },
      },
      cloud: legacy.cloud,
    };
    return buildModelRows(cloudOnly);
  }, [phase8]);

  const providerSecret = PROVIDER_SECRETS[provider];
  const cloudConnResults = connResults.filter(
    (r) => r.provider !== "ollama" && r.provider !== "lm-studio",
  );

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-foreground">② クラウドの設定</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">クラウドプロバイダ</CardTitle>
          <CardDescription>利用する LLM サービスを選択してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={provider} onValueChange={onProviderChange}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="プロバイダを選択" />
            </SelectTrigger>
            <SelectContent>
              {CLOUD_PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {providerSecret && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {CLOUD_PROVIDERS.find((p) => p.value === provider)?.label} API キー
                <span className="ml-1 text-[10px]">({providerSecret.env})</span>
                {secretsSet[providerSecret.env] ? (
                  <Badge variant="outline" className="ml-2 border-green-500/30 text-[10px] text-green-400">
                    設定済み
                  </Badge>
                ) : (
                  <Badge variant="outline" className="ml-2 border-orange-500/30 text-[10px] text-orange-400">
                    未設定
                  </Badge>
                )}
              </label>
              <Input
                type="password"
                value={secrets[providerSecret.key] ?? ""}
                onChange={(e) => onSecretChange(providerSecret.key, e.target.value)}
                autoComplete="off"
                placeholder={secretsSet[providerSecret.env] ? "変更する場合のみ入力" : "sk-..."}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DATA_SECRETS.map(({ key, env, label }) => (
              <div key={env} className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {label}
                  {secretsSet[env] ? (
                    <Badge variant="outline" className="ml-2 border-green-500/30 text-[10px] text-green-400">
                      設定済み
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2 text-[10px] text-muted-foreground">
                      任意
                    </Badge>
                  )}
                </label>
                <Input
                  type="password"
                  value={secrets[key] ?? ""}
                  onChange={(e) => onSecretChange(key, e.target.value)}
                  autoComplete="off"
                  placeholder={secretsSet[env] ? "変更する場合のみ入力" : ""}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">モデル選択</CardTitle>
          <CardDescription>{provider} で利用可能なモデルから選択（クラウド候補）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <LlmModelSelectField
            label="深い思考モデル（高精度・重い処理用）"
            pickKey={pickD}
            onPickKey={onPickD}
            customModelId={deepModel}
            onCustomModelId={onCustomD}
            rows={cloudRows}
          />
          <LlmModelSelectField
            label="速い思考モデル（軽量・高速処理用）"
            pickKey={pickQ}
            onPickKey={onPickQ}
            customModelId={quickModel}
            onCustomModelId={onCustomQ}
            rows={cloudRows}
          />
          <LlmModelSelectField
            label="Guru モデル（投資家ペルソナ用）"
            pickKey={pickG}
            onPickKey={onPickG}
            customModelId={guruModel}
            onCustomModelId={onCustomG}
            rows={cloudRows}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">接続テスト</CardTitle>
          <CardDescription>API キー有無とエンドポイント到達性の確認</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" variant="secondary" size="sm" onClick={onConnectionTest} disabled={connTesting}>
            {connTesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="mr-2 h-4 w-4" />
            )}
            クラウド接続テスト
          </Button>
          {cloudConnResults.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {cloudConnResults.map((r) => (
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
                  <span className="text-xs text-muted-foreground">
                    {r.reachable ? "API キー確認済み" : (r.error || "").slice(0, 50)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
