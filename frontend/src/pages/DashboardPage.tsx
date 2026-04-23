import { useEffect, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchJSON } from "@/lib/api";
import type { HealthResponse } from "@/types";
import { Activity, Bot, Landmark, Zap } from "lucide-react";
import { EngineStatusDot } from "@/components/shared/EngineStatusDot";
import { PageDoc } from "@/components/shared/PageDoc";
import { getPageHelp } from "@/docs/pageHelps";

function formatHealthStatus(s: string | undefined) {
  if (s == null) return "確認中…";
  if (s === "ok") return "正常";
  if (s === "degraded") return "注意";
  if (s === "error") return "エラー";
  return s;
}

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    fetchJSON<HealthResponse>("/api/archon/health")
      .then(setHealth)
      .catch((e) => {
        console.error(e);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="mt-1 text-muted-foreground">ARCHON の全体状態</p>
      </div>

      <PageDoc markdown={getPageHelp("/")} title="この画面の説明（Markdown）" />

      <div className="grid gap-4 md:grid-cols-3">
        <EngineCard
          title="AI Hedge Fund"
          icon={<Landmark className="h-5 w-5" />}
          available={health?.engines.ai_hedge_fund ?? false}
          description="Guru 型エージェントとポートフォリオ系フロー"
        />
        <EngineCard
          title="トレーディングエージェント"
          icon={<Bot className="h-5 w-5" />}
          available={health?.engines.trading_agents ?? false}
          description="アナリスト、討議、リスク、最終判断"
        />
        <EngineCard
          title="Ultimate モード"
          icon={<Zap className="h-5 w-5" />}
          available={health?.engines.ultimate ?? false}
          description="Hedge Fund とトレーディングエージェントの融合"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" /> システム状態
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">バージョン</span>
            <span>{health?.version ?? "…"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ステータス</span>
            <Badge
              variant="outline"
              className={
                health?.status === "ok"
                  ? "border-green-500/30 bg-green-500/15 text-green-400"
                  : "border-red-500/30 bg-red-500/15 text-red-400"
              }
            >
              {formatHealthStatus(health?.status)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EngineCard({
  title,
  icon,
  available,
  description,
}: {
  title: string;
  icon: ReactNode;
  available: boolean;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="mb-1 flex items-center gap-2">
          <EngineStatusDot available={available} />
          <span className="text-xs text-muted-foreground">
            {available ? "利用可" : "未利用"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
