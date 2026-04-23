import { Landmark } from "lucide-react";

export default function HedgeFundPage() {
  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
        <Landmark className="h-8 w-8 text-archon-500" />
        AI Hedge Fund
      </h1>
      <p className="text-muted-foreground">
        Parallel investor-style analysis. A dedicated flow UI can be embedded or linked from
        the vendored app when you run it separately.
      </p>
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        Coming in Phase 5
      </div>
    </div>
  );
}
