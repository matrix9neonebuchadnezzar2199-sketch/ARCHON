import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BacktestPortfolioValue } from "@/types";

interface Props {
  data: BacktestPortfolioValue[];
  initialCapital: number;
}

export function EquityChart({ data, initialCapital }: Props) {
  if (data.length === 0) return null;

  const finalValue = data[data.length - 1]?.value ?? initialCapital;
  const isPositive = finalValue >= initialCapital;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={isPositive ? "#22c55e" : "#ef4444"}
              stopOpacity={0.3}
            />
            <stop
              offset="95%"
              stopColor={isPositive ? "#22c55e" : "#ef4444"}
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          domain={["auto", "auto"]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: "#94a3b8" }}
          formatter={(value) => {
            const n = typeof value === "number" ? value : Number(value);
            return [
              `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
              "Portfolio",
            ];
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={isPositive ? "#22c55e" : "#ef4444"}
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#equityGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
