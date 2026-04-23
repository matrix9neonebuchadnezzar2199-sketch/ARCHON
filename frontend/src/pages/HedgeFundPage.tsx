import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SSEProgress } from "@/components/shared/SSEProgress";
import { SignalBadge } from "@/components/shared/SignalBadge";
import { useSSE } from "@/hooks/use-sse";
import { fetchJSON } from "@/lib/api";
import { Landmark, Play, RotateCcw } from "lucide-react";
import type { Signal } from "@/types";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

const FUNCTIONAL_EXCLUDE = new Set([
  "technical_analyst",
  "fundamentals_analyst",
  "growth_analyst",
  "news_sentiment_analyst",
  "sentiment_analyst",
  "valuation_analyst",
]);

export default function HedgeFundPage() {
  const [tickers, setTickers] = useState("AAPL");
  const today = new Date().toISOString().split("T")[0] ?? "2024-01-15";
  const [startDate, setStartDate] = useState(
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      return d.toISOString().split("T")[0];
    })(),
  );
  const [endDate, setEndDate] = useState(today);
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
    void run("/api/hf/run", {
      tickers: tickerList,
      start_date: startDate,
      end_date: endDate,
      selected_analysts: selectedAnalysts,
    });
  };

  const decisions = useMemo(() => {
    if (!result) return null;
    if ("decisions" in result) return result.decisions;
    return null;
  }, [result]);

  const analystSignals = useMemo(() => {
    if (!result) return null;
    if ("analyst_signals" in result && isRecord(result.analyst_signals)) {
      return result.analyst_signals as Record<string, unknown>;
    }
    return null;
  }, [result]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Landmark className="h-8 w-8 text-archon-500" />
          AI Hedge Fund
        </h1>
        <p className="mt-1 text-muted-foreground">
          13 famous investor personas + functional analysts analyzing stocks in parallel.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tickers</label>
              <Input
                value={tickers}
                onChange={(e) => setTickers(e.target.value)}
                placeholder="AAPL, MSFT"
                className="w-64"
                disabled={isRunning}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Start date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-44"
                disabled={isRunning}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">End date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-44"
                disabled={isRunning}
              />
            </div>
            <Button
              onClick={handleRun}
              disabled={isRunning || !tickers.trim() || selectedAnalysts.length === 0}
              className="bg-archon-500 hover:bg-archon-600"
            >
              <Play className="mr-2 h-4 w-4" />
              {isRunning ? "Running…" : "Run Hedge Fund"}
            </Button>
            {(result ?? error) && (
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Analysts ({selectedAnalysts.length}/{allAnalysts.length} selected)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allAnalysts.map((a) => {
                const isSelected = selectedAnalysts.includes(a);
                return (
                  <Badge
                    key={a}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer text-xs capitalize ${
                      isSelected
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
          <CardContent className="pt-6 text-sm text-red-400">Error: {error}</CardContent>
        </Card>
      )}

      {decisions != null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Portfolio Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-foreground">
              {typeof decisions === "string" ? decisions : JSON.stringify(decisions, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {analystSignals && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Analyst Signals ({Object.keys(analystSignals).length} analysts)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(analystSignals)[0]} className="w-full">
              <TabsList className="flex flex-wrap h-auto min-h-9">
                {Object.keys(analystSignals).map((key) => (
                  <TabsTrigger key={key} value={key} className="text-xs capitalize">
                    {key.replaceAll("_", " ")}
                  </TabsTrigger>
                ))}
              </TabsList>
              {Object.entries(analystSignals).map(([key, data]) => (
                <TabsContent key={key} value={key}>
                  <ScrollArea className="max-h-72">
                    {isRecord(data) ? (
                      <AnalystSignalView data={data} />
                    ) : (
                      <pre className="text-xs whitespace-pre-wrap">
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    )}
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AnalystSignalView({ data }: { data: Record<string, unknown> }) {
  if ("signal" in data) {
    return <SignalRow data={data} />;
  }
  return (
    <div className="space-y-3">
      {Object.entries(data).map(([ticker, val]) => (
        <div key={ticker} className="rounded-md border border-border p-3">
          <p className="text-xs font-medium mb-1">{ticker}</p>
          {isRecord(val) ? (
            <SignalRow data={val} />
          ) : (
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(val, null, 2)}</pre>
          )}
        </div>
      ))}
    </div>
  );
}

function SignalRow({ data }: { data: Record<string, unknown> }) {
  const signal = String(data.signal ?? "neutral").toLowerCase();
  const confidence = Number(data.confidence ?? 0);
  const reasoning = String(data.reasoning ?? "");
  const validSignal: Signal =
    signal === "bullish" || signal === "bearish" || signal === "neutral"
      ? signal
      : "neutral";
  const conf = confidence > 1 ? confidence / 100 : confidence;

  return (
    <div className="flex items-start gap-3">
      <SignalBadge signal={validSignal} />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground">
          Confidence: {Math.round(conf * 100)}%
        </span>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">{reasoning}</p>
      </div>
    </div>
  );
}
