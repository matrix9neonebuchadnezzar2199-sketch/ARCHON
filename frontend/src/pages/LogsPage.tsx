import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchJSON } from "@/lib/api";
import { FileText, RefreshCw, Trash2, ChevronRight, X } from "lucide-react";
import type { LogEntry, LogDetail } from "@/types";

const ENGINE_COLORS: Record<string, string> = {
  "trading-agents": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "ai-hedge-fund": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  ultimate: "bg-archon-500/15 text-archon-400 border-archon-500/30",
  archon: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  backtest: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const listUrl = filter
        ? `/api/logs/?engine=${encodeURIComponent(filter)}`
        : "/api/logs/";
      const [logData, countData] = await Promise.all([
        fetchJSON<{ logs: LogEntry[] }>(listUrl),
        fetchJSON<{ counts: Record<string, number> }>("/api/logs/count"),
      ]);
      setLogs(logData.logs);
      setCounts(countData.counts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, [filter]);

  const handleViewDetail = async (id: string) => {
    try {
      const detail = await fetchJSON<LogDetail>(`/api/logs/${encodeURIComponent(id)}`);
      setSelectedLog(detail);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/logs/${encodeURIComponent(id)}`, { method: "DELETE" });
      setSelectedLog(null);
      await loadLogs();
    } catch (e) {
      console.error(e);
    }
  };

  const totalCount = Object.values(counts).reduce((s, c) => s + c, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <FileText className="h-8 w-8 text-archon-500" />
            Logs
          </h1>
          <p className="mt-1 text-muted-foreground">
            {totalCount} run log{totalCount !== 1 ? "s" : ""} across all engines.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadLogs()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge
          variant={filter === null ? "default" : "outline"}
          className="cursor-pointer text-xs"
          onClick={() => setFilter(null)}
        >
          All ({totalCount})
        </Badge>
        {Object.entries(counts).map(([eng, cnt]) => (
          <Badge
            key={eng}
            variant={filter === eng ? "default" : "outline"}
            className={`cursor-pointer text-xs ${
              filter === eng ? "" : ENGINE_COLORS[eng] ?? "border-border"
            }`}
            onClick={() => setFilter((f) => (f === eng ? null : eng))}
          >
            {eng} ({cnt})
          </Badge>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Log Files</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No logs yet. Run an analysis to generate logs.
              </p>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-1">
                  {logs.map((log) => (
                    <button
                      key={log.id}
                      type="button"
                      onClick={() => void handleViewDetail(log.id)}
                      className={`w-full flex items-center justify-between rounded-md border p-2 text-left text-xs transition-colors hover:bg-secondary/50 ${
                        selectedLog?.id === log.id
                          ? "border-archon-500/50 bg-archon-500/10"
                          : "border-border"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${ENGINE_COLORS[log.engine] ?? "border-border"}`}
                          >
                            {log.engine}
                          </Badge>
                          <span className="font-medium">{log.ticker || "—"}</span>
                          <span className="text-muted-foreground">{log.date}</span>
                        </div>
                        <p className="text-muted-foreground truncate">
                          {(log.size_bytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Log Detail</span>
              {selectedLog && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-red-400 hover:text-red-300"
                    onClick={() => void handleDelete(selectedLog.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setSelectedLog(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedLog ? (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className={ENGINE_COLORS[selectedLog.engine] ?? "border-border"}
                    >
                      {selectedLog.engine}
                    </Badge>
                    <span className="text-muted-foreground">
                      {selectedLog.ticker} · {selectedLog.date}
                    </span>
                    <span className="text-muted-foreground">
                      {(selectedLog.size_bytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  {selectedLog.error ? (
                    <p className="text-sm text-red-400">{selectedLog.error}</p>
                  ) : (
                    <pre className="whitespace-pre-wrap text-xs text-foreground bg-slate-900/50 rounded-md p-3">
                      {JSON.stringify(selectedLog.content, null, 2)}
                    </pre>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <p className="py-16 text-center text-xs text-muted-foreground">
                Select a log from the list to view details.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
