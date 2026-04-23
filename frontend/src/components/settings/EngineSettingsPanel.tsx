import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Guru, Analyst } from "@/types";

export interface EngineEditValues {
  output_language: string;
  max_invest_debate_rounds: number;
  max_risk_debate_rounds: number;
  anthropic_effort: string;
  openai_reasoning_effort: string;
  google_thinking_level: string;
  enable_valuation_agent: boolean;
  enable_memory: boolean;
  enable_reflection: boolean;
  allow_short: boolean;
  initial_cash: number;
  margin_requirement: number;
  enabled_gurus: string[];
  selected_analysts: string[];
}

interface Props {
  ev: EngineEditValues;
  onChange: (patch: Partial<EngineEditValues>) => void;
  guruList: Guru[];
  analystList: Analyst[];
}

const FEATURES: { key: keyof EngineEditValues; label: string }[] = [
  { key: "enable_valuation_agent", label: "バリュエーションエージェント" },
  { key: "enable_memory", label: "BM25 メモリ" },
  { key: "enable_reflection", label: "振り返り（reflection）" },
  { key: "allow_short", label: "空売り許可" },
];

export function EngineSettingsPanel({ ev, onChange, guruList, analystList }: Props) {
  const toggleGuru = (key: string) => {
    const s = new Set(ev.enabled_gurus);
    if (s.has(key)) s.delete(key);
    else s.add(key);
    onChange({ enabled_gurus: Array.from(s) });
  };
  const toggleAnalyst = (key: string) => {
    const s = new Set(ev.selected_analysts);
    if (s.has(key)) s.delete(key);
    else s.add(key);
    onChange({ selected_analysts: Array.from(s) });
  };

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-foreground">③ エンジン設定</h2>
      <details className="group" open>
        <summary className="cursor-pointer list-none rounded-lg border border-border/80 bg-slate-900/40 px-4 py-3 text-sm font-medium hover:bg-slate-800/50 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between">
            言語・討議・オプション・Guru / TA
            <span className="text-xs text-muted-foreground group-open:hidden">（開く）</span>
            <span className="hidden text-xs text-muted-foreground group-open:inline">（閉じる）</span>
          </span>
        </summary>

        <div className="mt-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">基本</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label="出力言語"
                value={ev.output_language}
                onChange={(v) => onChange({ output_language: v })}
              />
              <Field
                label="投資討議ラウンド"
                value={String(ev.max_invest_debate_rounds)}
                onChange={(v) => onChange({ max_invest_debate_rounds: parseInt(v, 10) || 1 })}
              />
              <Field
                label="リスク討議ラウンド"
                value={String(ev.max_risk_debate_rounds)}
                onChange={(v) => onChange({ max_risk_debate_rounds: parseInt(v, 10) || 1 })}
              />
              <Field
                label="ANTHROPIC_EFFORT（空で未設定）"
                value={ev.anthropic_effort}
                onChange={(v) => onChange({ anthropic_effort: v })}
              />
              <Field
                label="OPENAI_REASONING_EFFORT"
                value={ev.openai_reasoning_effort}
                onChange={(v) => onChange({ openai_reasoning_effort: v })}
              />
              <Field
                label="GOOGLE_THINKING_LEVEL"
                value={ev.google_thinking_level}
                onChange={(v) => onChange({ google_thinking_level: v })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">有効化オプション</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              {FEATURES.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border border-border"
                    checked={Boolean(ev[key])}
                    onChange={(e) => onChange({ [key]: e.target.checked } as Partial<EngineEditValues>)}
                  />
                  {label}
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">財務パラメータ</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="初期現金（USD）"
                value={String(ev.initial_cash)}
                onChange={(v) => onChange({ initial_cash: parseFloat(v) || 0 })}
              />
              <Field
                label="マージン要件"
                value={String(ev.margin_requirement)}
                onChange={(v) => onChange({ margin_requirement: parseFloat(v) || 0 })}
              />
            </CardContent>
          </Card>

          {guruList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">有効な Guru</CardTitle>
                <CardDescription>クリックで有効/無効</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {guruList.map((g) => {
                    const on = ev.enabled_gurus.includes(g.key);
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
                <CardTitle className="text-base">TA / Ultimate アナリスト</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analystList.map((a) => {
                    const on = ev.selected_analysts.includes(a.key);
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
        </div>
      </details>
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
