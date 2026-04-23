import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Verdict } from "@/types";
import { TrendingUp, TrendingDown, Minus, Check, X, type LucideIcon } from "lucide-react";

const ACTION_STYLES: Record<
  Verdict["action"],
  { color: string; bg: string; icon: LucideIcon }
> = {
  buy: { color: "text-green-400", bg: "bg-green-500/15 border-green-500/30", icon: TrendingUp },
  sell: { color: "text-red-400", bg: "bg-red-500/15 border-red-500/30", icon: TrendingDown },
  hold: { color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30", icon: Minus },
};

export function VerdictCard({ verdict, ticker }: { verdict: Verdict; ticker: string }) {
  const style = ACTION_STYLES[verdict.action] ?? ACTION_STYLES.hold;
  const Icon = style.icon;

  return (
    <Card className={cn("border", style.bg)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", style.color)} />
            {ticker} — {verdict.action.toUpperCase()}
          </span>
          <span className="text-xs text-muted-foreground">
            Confidence: {Math.round(verdict.confidence * 100)}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <Badge variant="outline" className="text-xs">
            Guru → {verdict.guru_lean}
          </Badge>
          <Badge variant="outline" className="text-xs">
            TA → {verdict.ta_lean}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              verdict.aligned
                ? "border-green-500/30 text-green-400"
                : "border-orange-500/30 text-orange-400",
            )}
          >
            {verdict.aligned ? (
              <>
                <Check className="mr-1 h-3 w-3" /> Aligned
              </>
            ) : (
              <>
                <X className="mr-1 h-3 w-3" /> Divergent
              </>
            )}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{verdict.reasoning}</p>
      </CardContent>
    </Card>
  );
}
