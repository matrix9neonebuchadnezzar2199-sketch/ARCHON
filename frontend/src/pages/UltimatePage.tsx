import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SSEProgress } from "@/components/shared/SSEProgress";
import { VerdictCard } from "@/components/shared/VerdictCard";
import { GuruVoteBar } from "@/components/shared/GuruVoteBar";
import { SignalBadge } from "@/components/shared/SignalBadge";
import { useSSE } from "@/hooks/use-sse";
import { fetchJSON } from "@/lib/api";
import { Zap, Play, RotateCcw, Users, MessageSquare } from "lucide-react";
import type { Guru, Analyst, TickerFusion, Signal } from "@/types";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

export default function UltimatePage() {
  const [tickers, setTickers] = useState("AAPL");
  const [tradeDate, setTradeDate] = useState(
    new Date().toISOString().split("T")[0] ?? "2024-01-15",
  );
  const [gurus, setGurus] = useState<Guru[]>([]);
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const { isRunning, progress, result, error, run, reset } = useSSE();

  useEffect(() => {
    fetchJSON<{ gurus: Guru[] }>("/api/ultimate/gurus")
      .then((d) => setGurus(d.gurus))
      .catch(console.error);
    fetchJSON<{ analysts: Analyst[] }>("/api/ultimate/analysts")
      .then((d) => setAnalysts(d.analysts))
      .catch(console.error);
  }, []);

  const handleRun = () => {
    const tickerList = tickers
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    void run("/api/ultimate/run", {
      tickers: tickerList,
      trade_date: tradeDate,
    });
  };

  const fusion = useMemo(() => {
    if (!result || !("fusion" in result) || !isRecord(result.fusion)) return null;
    return result.fusion as Record<string, TickerFusion>;
  }, [result]);

  const tickerKeys = fusion ? Object.keys(fusion) : [];
  const firstTicker = tickerKeys[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Zap className="h-8 w-8 text-archon-500" />
          Ultimate Mode
        </h1>
        <p className="mt-1 text-muted-foreground">
          13 Guru investors + TradingAgents debate → fused verdict per ticker.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Tickers (comma separated)
              </label>
              <Input
                value={tickers}
                onChange={(e) => setTickers(e.target.value)}
                placeholder="AAPL, MSFT, NVDA"
                className="w-64"
                disabled={isRunning}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Trade date</label>
              <Input
                type="date"
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
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
              {isRunning ? "Running…" : "Run Ultimate"}
            </Button>
            {(result ?? error) && (
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground mr-1">Gurus:</span>
              {gurus.map((g) => (
                <Badge key={g.key} variant="outline" className="text-xs capitalize">
                  {g.display_name}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground mr-1">Analysts:</span>
              {analysts.map((a) => (
                <Badge key={a.key} variant="outline" className="text-xs">
                  {a.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <SSEProgress events={progress} isRunning={isRunning} />

      {error && (
        <Card className="border-red-500/30">
          <CardContent className="pt-6 text-sm text-red-400">Error: {error}</CardContent>
        </Card>
      )}

      {fusion && firstTicker && (
        <Tabs defaultValue={firstTicker} className="w-full">
          <TabsList className="flex flex-wrap h-auto min-h-9">
            {tickerKeys.map((t) => (
              <TabsTrigger key={t} value={t}>
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          {tickerKeys.map((ticker) => {
            const f = fusion[ticker];
            if (!f) return null;
            return (
              <TabsContent key={ticker} value={ticker} className="space-y-4">
                <VerdictCard verdict={f.verdict} ticker={ticker} />

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Guru Vote Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GuruVoteBar
                      bullish={f.guru_bull_count}
                      bearish={f.guru_bear_count}
                      neutral={f.guru_neutral_count}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Guru Signals ({f.guru_bull_count + f.guru_bear_count + f.guru_neutral_count})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-64">
                      <div className="space-y-2">
                        {(["bullish", "bearish", "neutral"] as const).map((camp) =>
                          (f.guru_signals[camp] || []).map((entry, idx) => (
                            <div
                              key={`${camp}-${idx}`}
                              className="flex items-start gap-3 rounded-md border border-border p-2"
                            >
                              <SignalBadge signal={entry.signal as Signal} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium capitalize">
                                    {entry.guru.replaceAll("_", " ")}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round(entry.confidence * 100)}%
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {entry.reasoning}
                                </p>
                              </div>
                            </div>
                          )),
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">TradingAgents Decision</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm text-foreground">
                      {typeof f.ta_decision === "string"
                        ? f.ta_decision
                        : JSON.stringify(f.ta_decision, null, 2)}
                    </pre>
                  </CardContent>
                </Card>

                {f.ta_reports && Object.keys(f.ta_reports).length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Analyst Reports</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue={Object.keys(f.ta_reports)[0]}>
                        <TabsList className="h-auto min-h-8 flex-wrap">
                          {Object.keys(f.ta_reports).map((k) => (
                            <TabsTrigger key={k} value={k} className="px-2 py-1 text-xs">
                              {k}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        {Object.entries(f.ta_reports).map(([k, v]) => (
                          <TabsContent key={k} value={k}>
                            <pre className="max-h-48 overflow-y-auto text-xs whitespace-pre-wrap">
                              {typeof v === "string" ? v : JSON.stringify(v, null, 2)}
                            </pre>
                          </TabsContent>
                        ))}
                      </Tabs>
                    </CardContent>
                  </Card>
                )}

                {f.ta_debate && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Debate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="invest">
                        <TabsList>
                          <TabsTrigger value="invest" className="text-xs">Investment</TabsTrigger>
                          <TabsTrigger value="risk" className="text-xs">Risk</TabsTrigger>
                        </TabsList>
                        <TabsContent value="invest">
                          <pre className="max-h-48 overflow-y-auto text-xs whitespace-pre-wrap">
                            {JSON.stringify(f.ta_debate.invest, null, 2)}
                          </pre>
                        </TabsContent>
                        <TabsContent value="risk">
                          <pre className="max-h-48 overflow-y-auto text-xs whitespace-pre-wrap">
                            {JSON.stringify(f.ta_debate.risk, null, 2)}
                          </pre>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
