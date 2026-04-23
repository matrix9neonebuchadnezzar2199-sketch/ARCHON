import { cn } from "@/lib/utils";

export function EngineStatusDot({ available }: { available: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        available ? "bg-green-500" : "bg-red-500",
      )}
      title={available ? "利用可能" : "未利用"}
    />
  );
}
