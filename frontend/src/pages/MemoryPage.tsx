import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchJSON, postJSON } from "@/lib/api";
import { PageDoc } from "@/components/shared/PageDoc";
import { getPageHelp } from "@/docs/pageHelps";
import { Brain, Search, Save, Download, Trash2, RefreshCw } from "lucide-react";
import type { MemoryEntry, MemoryStats, MemoryQueryMatch } from "@/types";

const MEMORY_NAMES = [
  { key: "bull_memory", label: "強気", color: "text-green-400" },
  { key: "bear_memory", label: "弱気", color: "text-red-400" },
  { key: "trader_memory", label: "トレーダー", color: "text-blue-400" },
  { key: "invest_judge_memory", label: "投資審査", color: "text-purple-400" },
  { key: "portfolio_manager_memory", label: "PM", color: "text-yellow-400" },
];

export default function MemoryPage() {
  const [memories, setMemories] = useState<Record<string, MemoryEntry[]>>({});
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [query, setQuery] = useState("");
  const [selectedMemory, setSelectedMemory] = useState("bull_memory");
  const [matches, setMatches] = useState<MemoryQueryMatch[]>([]);
  const [queryNote, setQueryNote] = useState("");
  const [loading, setLoading] = useState(false);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const [memData, statsData] = await Promise.all([
        fetchJSON<{ memories: Record<string, MemoryEntry[]> }>("/api/memory/"),
        fetchJSON<MemoryStats>("/api/memory/stats"),
      ]);
      setMemories(memData.memories);
      setStats(statsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMemories();
  }, []);

  const handleQuery = async () => {
    if (!query.trim()) return;
    try {
      const data = await postJSON<{
        matches: MemoryQueryMatch[];
        note?: string;
      }>("/api/memory/query", { memory_name: selectedMemory, query, n_matches: 3 });
      setMatches(data.matches);
      setQueryNote(data.note ?? "");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    try {
      await postJSON("/api/memory/save", {});
      await loadMemories();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoad = async () => {
    try {
      await postJSON("/api/memory/load", {});
      await loadMemories();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClear = async (name?: string) => {
    const url = name
      ? `/api/memory/clear?memory_name=${encodeURIComponent(name)}`
      : "/api/memory/clear";
    try {
      await fetch(url, { method: "DELETE" });
      await loadMemories();
    } catch (e) {
      console.error(e);
    }
  };

  const totalEntries = Object.values(memories).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Brain className="h-8 w-8 text-archon-500" />
            メモリ
          </h1>
          <p className="mt-1 text-muted-foreground">
            TradingAgents の BM25 メモリ。全 {totalEntries} 件。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadMemories} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            更新
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            ディスクに保存
          </Button>
          <Button variant="outline" size="sm" onClick={handleLoad}>
            <Download className="mr-2 h-4 w-4" />
            ディスクから読込
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleClear()}>
            <Trash2 className="mr-2 h-4 w-4" />
            全削除
          </Button>
        </div>
      </div>

      <PageDoc markdown={getPageHelp("/memory")} title="この画面の説明（Markdown）" />

      {stats && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          {MEMORY_NAMES.map((m) => (
            <Card key={m.key}>
              <CardContent className="pt-3 pb-2">
                <p className={`text-xs font-medium ${m.color}`}>{m.label}</p>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    稼働: {stats.live[m.key] ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    保存: {stats.disk[m.key] ?? 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">メモリを検索（BM25）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">状況</label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="市場状況を記述…"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">メモリ種別</label>
              <select
                value={selectedMemory}
                onChange={(e) => setSelectedMemory(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                {MEMORY_NAMES.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => void handleQuery()}
              disabled={!query.trim()}
              className="bg-archon-500 hover:bg-archon-600"
            >
              <Search className="mr-2 h-4 w-4" />
              検索
            </Button>
          </div>

          {queryNote && <p className="text-xs text-yellow-400">{queryNote}</p>}

          {matches.length > 0 && (
            <div className="space-y-2">
              {matches.map((m, i) => (
                <div key={i} className="rounded-md border border-border p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      スコア: {(m.similarity_score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">状況:</span>{" "}
                    {m.matched_situation.slice(0, 300)}
                    {m.matched_situation.length > 300 ? "…" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-archon-400">推奨:</span>{" "}
                    {m.recommendation.slice(0, 300)}
                    {m.recommendation.length > 300 ? "…" : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">メモリの内容</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="bull_memory">
            <TabsList className="flex flex-wrap h-auto min-h-9">
              {MEMORY_NAMES.map((m) => (
                <TabsTrigger key={m.key} value={m.key} className="text-xs">
                  {m.label} ({(memories[m.key] ?? []).length})
                </TabsTrigger>
              ))}
            </TabsList>
            {MEMORY_NAMES.map((m) => {
              const entries = memories[m.key] ?? [];
              return (
                <TabsContent key={m.key} value={m.key}>
                  {entries.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                      まだエントリがありません。トレーディングエージェントで分析を実行してください。
                    </p>
                  ) : (
                    <ScrollArea className="max-h-80">
                      <div className="space-y-2">
                        {entries.map((e, i) => (
                          <div key={i} className="rounded-md border border-border p-2 text-xs">
                            <p className="text-muted-foreground line-clamp-2">
                              <span className="font-medium text-foreground">状:</span> {e.situation}
                            </p>
                            <p className="text-muted-foreground line-clamp-2 mt-1">
                              <span className={`font-medium ${m.color}`}>推:</span> {e.recommendation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
