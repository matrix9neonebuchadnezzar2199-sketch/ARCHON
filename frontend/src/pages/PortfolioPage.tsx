import { Briefcase } from "lucide-react";

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
        <Briefcase className="h-8 w-8 text-archon-500" />
        Portfolio
      </h1>
      <p className="text-muted-foreground">Positions and P&L. Phase 6.</p>
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        Coming in Phase 6
      </div>
    </div>
  );
}
