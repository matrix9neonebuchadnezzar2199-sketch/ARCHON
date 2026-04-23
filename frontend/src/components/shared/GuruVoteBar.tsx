interface Props {
  bullish: number;
  bearish: number;
  neutral: number;
}

export function GuruVoteBar({ bullish, bearish, neutral }: Props) {
  const total = bullish + bearish + neutral || 1;
  const bullPct = Math.round((bullish / total) * 100);
  const bearPct = Math.round((bearish / total) * 100);
  const neutPct = 100 - bullPct - bearPct;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="text-green-400">{bullish} 強気</span>
        <span className="text-yellow-400">{neutral} 中立</span>
        <span className="text-red-400">{bearish} 弱気</span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-800">
        {bullPct > 0 && (
          <div className="bg-green-500 transition-all" style={{ width: `${bullPct}%` }} />
        )}
        {neutPct > 0 && (
          <div className="bg-yellow-500 transition-all" style={{ width: `${neutPct}%` }} />
        )}
        {bearPct > 0 && (
          <div className="bg-red-500 transition-all" style={{ width: `${bearPct}%` }} />
        )}
      </div>
    </div>
  );
}
