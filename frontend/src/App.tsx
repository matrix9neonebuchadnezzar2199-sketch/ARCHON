import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardPage from "@/pages/DashboardPage";
import UltimatePage from "@/pages/UltimatePage";
import HedgeFundPage from "@/pages/HedgeFundPage";
import TradingAgentsPage from "@/pages/TradingAgentsPage";
import BacktestPage from "@/pages/BacktestPage";
import PortfolioPage from "@/pages/PortfolioPage";
import MemoryPage from "@/pages/MemoryPage";
import LogsPage from "@/pages/LogsPage";
import SettingsPage from "@/pages/SettingsPage";

export default function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/ultimate" element={<UltimatePage />} />
            <Route path="/hedge-fund" element={<HedgeFundPage />} />
            <Route path="/trading-agents" element={<TradingAgentsPage />} />
            <Route path="/backtest" element={<BacktestPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/memory" element={<MemoryPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
}
