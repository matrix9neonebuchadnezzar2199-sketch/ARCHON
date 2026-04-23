import type { SSEProgressEvent } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  events: SSEProgressEvent[];
  isRunning: boolean;
}

export function SSEProgress({ events, isRunning }: Props) {
  if (events.length === 0 && !isRunning) {
    return null;
  }

  return (
    <ScrollArea className="h-48 rounded-md border border-border bg-card p-3">
      <div className="space-y-1 font-mono text-xs">
        {events.map((e, i) => (
          <div key={`${e.ticker ?? ""}-${e.status.slice(0, 20)}-${i}`} className="flex gap-2">
            <span className="text-muted-foreground shrink-0">[{e.agent}]</span>
            {e.ticker && <span className="text-archon-500 shrink-0">{e.ticker}</span>}
            <span className="text-foreground">{e.status}</span>
          </div>
        ))}
        {isRunning && (
          <div className="flex items-center gap-2 text-archon-500">
            <span className="animate-pulse">{"\u25cf"}</span> Running…
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
