import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Zap,
  Landmark,
  Bot,
  TrendingUp,
  Briefcase,
  Brain,
  FileText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  "divider",
  { label: "Ultimate Mode", icon: Zap, path: "/ultimate" },
  { label: "AI Hedge Fund", icon: Landmark, path: "/hedge-fund" },
  { label: "Trading Agents", icon: Bot, path: "/trading-agents" },
  "divider",
  { label: "Backtest", icon: TrendingUp, path: "/backtest" },
  { label: "Portfolio", icon: Briefcase, path: "/portfolio" },
  "divider",
  { label: "Memory", icon: Brain, path: "/memory" },
  { label: "Logs", icon: FileText, path: "/logs" },
  { label: "Settings", icon: Settings, path: "/settings" },
] as const;

export function Sidebar() {
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-slate-950/80">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-archon-500 font-bold text-sm text-white">
          A
        </div>
        <span className="text-lg font-bold tracking-tight">ARCHON</span>
      </div>

      <Separator />

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item, i) => {
            if (item === "divider") {
              return <Separator key={`sep-${i}`} className="my-3" />;
            }
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-archon-500/15 text-archon-500"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">ARCHON v0.2.0</p>
        <p className="text-xs text-muted-foreground">Educational use only</p>
      </div>
    </aside>
  );
}
