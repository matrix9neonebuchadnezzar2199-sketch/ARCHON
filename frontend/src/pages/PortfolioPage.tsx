import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/shared/MetricCard";
import { fetchJSON } from "@/lib/api";
import { PageDoc } from "@/components/shared/PageDoc";
import { getPageHelp } from "@/docs/pageHelps";
import { Briefcase, RefreshCw, Trash2 } from "lucide-react";
import type { PortfolioSummary, PortfolioPosition } from "@/types";

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchJSON<PortfolioSummary>("/api/portfolio/");
      setPortfolio(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await fetch("/api/portfolio/reset", { method: "DELETE" });
      await load();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const positions: PortfolioPosition[] = portfolio?.positions ?? [];
  const hasPositions =
    positions.length > 0 && positions.some((p) => p.long_shares > 0 || p.short_shares > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Briefcase className="h-8 w-8 text-archon-500" />
            ポートフォリオ
          </h1>
          <p className="mt-1 text-muted-foreground">
            建玉と評価損益の概要。
            {portfolio?.last_updated && (
              <span className="ml-2 text-xs">
                最終更新: {new Date(portfolio.last_updated).toLocaleString("ja-JP")}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            更新
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <Trash2 className="mr-2 h-4 w-4" />
            リセット
          </Button>
        </div>
      </div>

      <PageDoc markdown={getPageHelp("/portfolio")} title="この画面の説明（Markdown）" />

      {portfolio && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
          <MetricCard
            label="総資産"
            value={`$${portfolio.total_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          />
          <MetricCard
            label="現金"
            value={`$${portfolio.cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          />
          <MetricCard
            label="建玉数"
            value={String(positions.filter((p) => p.long_shares > 0 || p.short_shares > 0).length)}
          />
        </div>
      )}

      {hasPositions ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">建玉</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 px-3">銘柄</th>
                    <th className="text-right py-2 px-3">買建</th>
                    <th className="text-right py-2 px-3">売建</th>
                    <th className="text-right py-2 px-3">価格</th>
                    <th className="text-right py-2 px-3">時価</th>
                    <th className="text-right py-2 px-3">含み損益</th>
                    <th className="text-right py-2 px-3">ウエイト</th>
                  </tr>
                </thead>
                <tbody>
                  {positions
                    .filter((p) => p.long_shares > 0 || p.short_shares > 0)
                    .map((p) => (
                      <tr key={p.ticker} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-2 px-3 font-medium">{p.ticker}</td>
                        <td className="py-2 px-3 text-right">{p.long_shares}</td>
                        <td className="py-2 px-3 text-right text-red-400">
                          {p.short_shares > 0 ? p.short_shares : "—"}
                        </td>
                        <td className="py-2 px-3 text-right">
                          ${p.current_price.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          ${p.market_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td
                          className={`py-2 px-3 text-right ${
                            p.unrealized_pnl >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {p.unrealized_pnl >= 0 ? "+" : ""}
                          ${p.unrealized_pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2 px-3 text-right">{p.weight_pct.toFixed(1)}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            建玉はありません。分析またはバックテストを実行すると反映されます。
          </CardContent>
        </Card>
      )}

      {portfolio?.engine_results && Object.keys(portfolio.engine_results).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">直近のエンジン結果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(portfolio.engine_results).map(([eng, summary]) => (
                <div key={eng} className="rounded-md border border-border p-3">
                  <Badge variant="outline" className="text-xs mb-1 capitalize">
                    {eng}
                  </Badge>
                  <p className="text-xs text-muted-foreground">{summary}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
