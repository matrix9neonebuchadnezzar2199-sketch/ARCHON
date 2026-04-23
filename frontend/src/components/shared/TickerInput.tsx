import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TickerInputProps
  extends Omit<ComponentProps<"input">, "onChange" | "value"> {
  value: string;
  onChange: (v: string) => void;
}

export function TickerInput({ value, onChange, className, ...rest }: TickerInputProps) {
  return (
    <Input
      className={cn("w-64", className)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="例: AAPL, MSFT, NVDA"
      {...rest}
    />
  );
}
