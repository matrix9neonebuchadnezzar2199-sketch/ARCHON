import { TrendingUp } from "lucide-react";

export default function BacktestPage() {
  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
        <TrendingUp className="h-8 w-8 text-archon-500" />
        Backtest
      </h1>
      <p className="text-muted-foreground">Historical runs. Phase 6.</p>
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        Coming in Phase 6
      </div>
    </div>
  );
}
