import { Zap } from "lucide-react";

export default function UltimatePage() {
  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
        <Zap className="h-8 w-8 text-archon-500" />
        Ultimate mode
      </h1>
      <p className="text-muted-foreground">
        Guru, debate, and memory fusion. Full flow in Phase 4.
      </p>
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        Coming in Phase 4
      </div>
    </div>
  );
}
