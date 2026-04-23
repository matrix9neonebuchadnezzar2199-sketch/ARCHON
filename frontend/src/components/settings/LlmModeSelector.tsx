import { Cloud, Server } from "lucide-react";
import { cn } from "@/lib/utils";

export type LlmMode = "online" | "local";

interface Props {
  value: LlmMode;
  onChange: (mode: LlmMode) => void;
}

const OPTIONS: { mode: LlmMode; icon: typeof Cloud; label: string; desc: string }[] = [
  {
    mode: "online",
    icon: Cloud,
    label: "オンライン（クラウド API）",
    desc: "OpenAI、Anthropic、Google、xAI、Groq、DeepSeek 等のクラウドサービスを利用",
  },
  {
    mode: "local",
    icon: Server,
    label: "ローカル（Ollama / LM Studio）",
    desc: "自分の PC 上で動作する LLM を利用。API キー不要",
  },
];

export function LlmModeSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-foreground">① LLM 接続方式</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ mode, icon: Icon, label, desc }) => {
          const active = value === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onChange(mode)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 text-left transition-all",
                active
                  ? "border-archon-500 bg-archon-500/10 ring-1 ring-archon-500/40"
                  : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  active ? "bg-archon-500/20 text-archon-400" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                      active
                        ? "border-archon-500 bg-archon-500"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {active && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
