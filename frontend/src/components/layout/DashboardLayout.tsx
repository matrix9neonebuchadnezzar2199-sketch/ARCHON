import { Outlet } from "react-router-dom";
import { LlmKeyBanner } from "@/components/shared/LlmKeyBanner";
import { Sidebar } from "./Sidebar";

export function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar />
      <main className="min-h-0 flex-1 overflow-y-auto p-6">
        <LlmKeyBanner />
        <Outlet />
      </main>
    </div>
  );
}
