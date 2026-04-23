import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Signal } from "@/types";

const SIGNAL_STYLES: Record<Signal, string> = {
  bullish: "bg-green-500/15 text-green-400 border-green-500/30",
  bearish: "bg-red-500/15 text-red-400 border-red-500/30",
  neutral: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

export function SignalBadge({ signal }: { signal: Signal }) {
  return (
    <Badge variant="outline" className={cn("capitalize", SIGNAL_STYLES[signal])}>
      {signal}
    </Badge>
  );
}
