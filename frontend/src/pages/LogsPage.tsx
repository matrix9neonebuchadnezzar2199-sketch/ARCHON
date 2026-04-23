import { FileText } from "lucide-react";

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
        <FileText className="h-8 w-8 text-archon-500" />
        Logs
      </h1>
      <p className="text-muted-foreground">Run logs. Phase 7.</p>
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        Coming in Phase 7
      </div>
    </div>
  );
}
