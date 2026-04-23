import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SSEProgress } from "@/components/shared/SSEProgress";
import { EquityChart } from "@/components/shared/EquityChart";
import { MetricCard } from "@/components/shared/MetricCard";
import { useSSE } from "@/hooks/use-sse";
import { fetchJSON } from "@/lib/api";
import { PageDoc } from "@/components/shared/PageDoc";
import { getPageHelp } from "@/docs/pageHelps";
import { TrendingUp, Play, RotateCcw } from "lucide-react";
import type { BacktestResult, BacktestPortfolioValue } from "@/types";

const FUNCTIONAL_EXCLUDE = new Set([
  "technical_analyst",
  "fundamentals_analyst",
  "growth_analyst",
  "news_sentiment_analyst",
  "sentiment_analyst",
  "valuation_analyst",
]);

export default function BacktestPage() {
  const [tickers, setTickers] = useState("AAPL,MSFT");
  const [startDate, setStartDate] = useState(
    (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return d.toISOString().split("T")[0] ?? "2024-11-23";
    })(),
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0] ?? "2024-12-31",
  );
  const [initialCapital, setInitialCapital] = useState("100000");
  const [allAnalysts, setAllAnalysts] = useState<string[]>([]);
  const [selectedAnalysts, setSelectedAnalysts] = useState<string[]>([]);
  const { isRunning, progress, result, error, run, reset } = useSSE();

  useEffect(() => {
    fetchJSON<{ analysts: string[] }>("/api/hf/analysts")
      .then((d) => {
        setAllAnalysts(d.analysts);
        const guruDefaults = d.analysts.filter((a) => !FUNCTIONAL_EXCLUDE.has(a));
        setSelectedAnalysts(guruDefaults);
      })
      .catch(console.error);
  }, []);

  const toggleAnalyst = (key: string) => {
    setSelectedAnalysts((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleRun = () => {
    const tickerList = tickers
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    void run("/api/backtest/run", {
      tickers: tickerList,
      start_date: startDate,
      end_date: endDate,
      initial_capital: parseFloat(initialCapital) || 100_000,
      selected_analysts: selectedAnalysts,
    });
  };

  const btResult = useMemo((): BacktestResult | null => {
    if (!result) return null;
    if (
      "performance_metrics" in result &&
      "portfolio_values" in result
    ) {
      return result as unknown as BacktestResult;
    }
    return null;
  }, [result]);

  const portfolioValues = useMemo((): BacktestPortfolioValue[] => {
    if (!btResult) return [];
    return btResult.portfolio_values ?? [];
  }, [btResult]);

  const metrics = btResult?.performance_metrics;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <TrendingUp className="h-8 w-8 text-archon-500" />
          バックテスト
        </h1>
        <p className="mt-1 text-muted-foreground">
          AI Hedge Fund のエージェントを使った過去シミュレーション。
        </p>
      </div>

      <PageDoc markdown={getPageHelp("/backtest")} title="この画面の説明（Markdown）" />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">銘柄</label>
              <Input
                value={tickers}
                onChange={(e) => setTickers(e.target.value)}
                placeholder="例: AAPL, MSFT"
                className="w-56"
                disabled={isRunning}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">開始</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
                disabled={isRunning}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">終了</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
                disabled={isRunning}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">初期資金（USD）</label>
              <Input
                value={initialCapital}
                onChange={(e) => setInitialCapital(e.target.value)}
                className="w-32"
                disabled={isRunning}
              />
            </div>
            <Button
              onClick={handleRun}
              disabled={isRunning || !tickers.trim() || selectedAnalysts.length === 0}
              className="bg-archon-500 hover:bg-archon-600"
            >
              <Play className="mr-2 h-4 w-4" />
              {isRunning ? "実行中…" : "バックテスト実行"}
            </Button>
            {(result ?? error) && (
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                リセット
              </Button>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              アナリスト（{selectedAnalysts.length} / {allAnalysts.length}）
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allAnalysts.map((a) => {
                const sel = selectedAnalysts.includes(a);
                return (
                  <Badge
                    key={a}
                    variant={sel ? "default" : "outline"}
                    className={`cursor-pointer text-xs capitalize ${
                      sel
                        ? "bg-archon-500/20 text-archon-400 border-archon-500/30 hover:bg-archon-500/30"
                        : "hover:bg-secondary"
                    }`}
                    onClick={() => !isRunning && toggleAnalyst(a)}
                  >
                    {a.replaceAll("_", " ")}
                  </Badge>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <SSEProgress events={progress} isRunning={isRunning} />

      {error && (
        <Card className="border-red-500/30">
          <CardContent className="pt-6 text-sm text-red-400">エラー: {error}</CardContent>
        </Card>
      )}

      {btResult && (
        <>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <MetricCard
              label="累積リターン"
              value={`${btResult.total_return_pct >= 0 ? "+" : ""}${btResult.total_return_pct.toFixed(2)}%`}
              positive={btResult.total_return_pct >= 0}
            />
            <MetricCard
              label="最終評価額"
              value={`$${btResult.final_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              sub={`初期 $${btResult.initial_capital.toLocaleString()}`}
            />
            <MetricCard
              label="取引日数"
              value={String(btResult.total_days)}
            />
            <MetricCard
              label="シャープレシオ"
              value={metrics?.sharpe_ratio != null ? metrics.sharpe_ratio.toFixed(2) : "—"}
              positive={metrics?.sharpe_ratio != null ? metrics.sharpe_ratio > 0 : undefined}
            />
            <MetricCard
              label="ソルティノ比"
              value={metrics?.sortino_ratio != null ? metrics.sortino_ratio.toFixed(2) : "—"}
              positive={metrics?.sortino_ratio != null ? metrics.sortino_ratio > 0 : undefined}
            />
            <MetricCard
              label="最大DD"
              value={
                metrics?.max_drawdown != null
                  ? `${metrics.max_drawdown.toFixed(2)}%`
                  : "—"
              }
              sub={metrics?.max_drawdown_date ?? undefined}
              positive={false}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">損益曲線</CardTitle>
            </CardHeader>
            <CardContent>
              <EquityChart
                data={portfolioValues}
                initialCapital={btResult.initial_capital}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
