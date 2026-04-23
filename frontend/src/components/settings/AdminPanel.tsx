import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Upload, History } from "lucide-react";
import { fetchJSON, postJSON } from "@/lib/api";
import type { AuditEntryV8 } from "@/types";

interface Props {
  onConfigReload: () => void;
}

export function AdminPanel({ onConfigReload }: Props) {
  const [auditLog, setAuditLog] = useState<AuditEntryV8[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  const handleExport = async () => {
    try {
      const data = await fetchJSON<Record<string, unknown>>("/api/archon/settings/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `archon-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const payload = JSON.parse(text) as Record<string, unknown>;
        await postJSON<{ status: string }>("/api/archon/settings/import", payload);
        onConfigReload();
      } catch (e) {
        console.error(e);
      }
    };
    input.click();
  };

  const handleLoadAudit = async () => {
    try {
      const entries = await fetchJSON<AuditEntryV8[]>("/api/archon/audit?limit=50");
      setAuditLog(entries);
      setShowAudit(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-foreground">④ 管理</h2>
      <details className="group">
        <summary className="cursor-pointer list-none rounded-lg border border-border/80 bg-slate-900/40 px-4 py-3 text-sm font-medium hover:bg-slate-800/50 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between">
            エクスポート / インポート / 監査
            <span className="text-xs text-muted-foreground group-open:hidden">（開く）</span>
            <span className="hidden text-xs text-muted-foreground group-open:inline">（閉じる）</span>
          </span>
        </summary>

        <div className="mt-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">設定のエクスポート / インポート</CardTitle>
              <CardDescription>API キー以外の設定を JSON で保存・復元（`.results` 監査はサーバ側）</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                エクスポート
              </Button>
              <Button variant="outline" size="sm" onClick={handleImport}>
                <Upload className="mr-2 h-4 w-4" />
                インポート
              </Button>
              <Button variant="outline" size="sm" onClick={handleLoadAudit}>
                <History className="mr-2 h-4 w-4" />
                監査ログ
              </Button>
            </CardContent>
          </Card>

          {showAudit && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">監査ログ（直近 50 件）</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowAudit(false)}>
                    閉じる
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {auditLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">エントリなし</p>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {auditLog.map((e, i) => (
                      <div
                        key={`${e.ts}-${i}`}
                        className="flex flex-col gap-1 rounded border border-border p-2 text-xs sm:flex-row sm:items-start sm:gap-2"
                      >
                        <span className="shrink-0 text-muted-foreground">
                          {new Date(e.ts).toLocaleString()}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {e.action}
                        </Badge>
                        <span className="min-w-0 break-all text-muted-foreground">
                          {JSON.stringify(e.detail).slice(0, 240)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </details>
    </div>
  );
}
