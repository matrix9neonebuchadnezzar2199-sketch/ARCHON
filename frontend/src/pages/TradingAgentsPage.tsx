import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SSEProgress } from "@/components/shared/SSEProgress";
import { useSSE } from "@/hooks/use-sse";
import { fetchJSON } from "@/lib/api";
import { PageDoc } from "@/components/shared/PageDoc";
import { getPageHelp } from "@/docs/pageHelps";
import { Bot, Play, RotateCcw } from "lucide-react";
import type { Analyst } from "@/types";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

interface TAResult {
  decision?: unknown;
  reports?: Record<string, string>;
  debate?: { invest?: unknown; risk?: unknown };
}

function isTAResult(x: unknown): x is TAResult {
  return x !== null && typeof x === "object";
}

export default function TradingAgentsPage() {
  const [tickers, setTickers] = useState("AAPL");
  const [tradeDate, setTradeDate] = useState(
    new Date().toISOString().split("T")[0] ?? "2024-01-15",
  );
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const { isRunning, progress, result, error, run, reset } = useSSE();

  useEffect(() => {
    fetchJSON<{ analysts: Analyst[] }>("/api/ta/analysts")
      .then((d) => {
        setAnalysts(d.analysts);
      })
      .catch((e) => {
        console.error(e);
      });
  }, []);

  const handleRun = () => {
    const tickerList = tickers
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    void run("/api/ta/run", {
      tickers: tickerList,
      trade_date: tradeDate,
    });
  };

  const byTicker = useMemo(() => {
    if (!result || !("results" in result) || !isRecord(result.results)) {
      return null;
    }
    return result.results as Record<string, unknown>;
  }, [result]);

  const firstTicker = byTicker
    ? Object.keys(byTicker)[0]
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Bot className="h-8 w-8 text-archon-500" />
          トレーディングエージェント
        </h1>
        <p className="mt-1 text-muted-foreground">
          アナリストのレポート、投資討議、リスク、最終判断まで一連の流れ。
        </p>
      </div>

      <PageDoc markdown={getPageHelp("/trading-agents")} title="この画面の説明（Markdown）" />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                銘柄（カンマ区切り）
              </label>
              <Input
                value={tickers}
                onChange={(e) => {
                  setTickers(e.target.value);
                }}
                placeholder="例: AAPL, MSFT, NVDA"
                className="w-64"
                disabled={isRunning}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">取引日</label>
              <Input
                type="date"
                value={tradeDate}
                onChange={(e) => {
                  setTradeDate(e.target.value);
                }}
                className="w-44"
                disabled={isRunning}
              />
            </div>
            <Button
              onClick={handleRun}
              disabled={isRunning || !tickers.trim()}
              className="bg-archon-500 hover:bg-archon-600"
            >
              <Play className="mr-2 h-4 w-4" />
              {isRunning ? "実行中…" : "分析を実行"}
            </Button>
            {(result ?? error) && (
              <Button type="button" variant="outline" onClick={reset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                リセット
              </Button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {analysts.map((a) => (
              <Badge key={a.key} variant="outline" className="text-xs">
                {a.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <SSEProgress events={progress} isRunning={isRunning} />

      {error && (
        <Card className="border-red-500/30">
          <CardContent className="pt-6 text-sm text-red-400">エラー: {error}</CardContent>
        </Card>
      )}

      {byTicker && firstTicker && (
        <Card>
          <CardHeader>
            <CardTitle>分析結果</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={firstTicker} className="w-full">
              <TabsList className="flex flex-wrap h-auto min-h-9">
                {Object.keys(byTicker).map((ticker) => (
                  <TabsTrigger key={ticker} value={ticker}>
                    {ticker}
                  </TabsTrigger>
                ))}
              </TabsList>
              {Object.entries(byTicker).map(([ticker, raw]) => {
                if (!isTAResult(raw)) {
                  return null;
                }
                const data = raw;
                return (
                  <TabsContent key={ticker} value={ticker} className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">最終判断</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="whitespace-pre-wrap text-sm text-foreground">
                          {typeof data.decision === "string"
                            ? data.decision
                            : JSON.stringify(data.decision, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                    {data.reports && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">アナリストレポート</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ReportTabs reports={data.reports} idPrefix={ticker} />
                        </CardContent>
                      </Card>
                    )}
                    {data.debate?.invest != null && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">投資討議</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="max-h-48 overflow-y-auto text-xs whitespace-pre-wrap">
                            {JSON.stringify(data.debate.invest, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReportTabs({
  reports,
  idPrefix,
}: {
  reports: Record<string, string>;
  idPrefix: string;
}) {
  const keys = Object.keys(reports);
  const d0 = keys[0] ?? "fundamentals";
  return (
    <Tabs defaultValue={d0}>
      <TabsList className="h-auto min-h-8 flex-wrap">
        {keys.map((k) => (
          <TabsTrigger
            key={`${idPrefix}-rpt-${k}`}
            value={k}
            className="px-2 py-1 text-xs"
          >
            {k}
          </TabsTrigger>
        ))}
      </TabsList>
      {keys.map((k) => (
        <TabsContent key={`${idPrefix}-rptc-${k}`} value={k}>
          <pre className="max-h-64 overflow-y-auto text-xs whitespace-pre-wrap">
            {typeof reports[k] === "string"
              ? reports[k]
              : JSON.stringify(reports[k], null, 2)}
          </pre>
        </TabsContent>
      ))}
    </Tabs>
  );
}
