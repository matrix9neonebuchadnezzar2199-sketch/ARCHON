import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchJSON } from "@/lib/api";
import type { HealthResponse } from "@/types";
import { AlertCircle } from "lucide-react";

/**
 * クラウド LLM 用の API キーが未設定のとき、案内バナーを表示（Ollama 等はキー不要のため出ない）。
 */
export function LlmKeyBanner() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    fetchJSON<HealthResponse>("/api/archon/health")
      .then(setData)
      .catch(() => setData(null));
  }, [pathname]);

  const llm = data?.llm;
  if (llm?.api_key_configured !== false) {
    return null;
  }

  const env = llm.expected_api_key_env;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
      <div className="min-w-0">
        <p className="font-medium text-amber-100">LLM の API キーが未設定です</p>
        <p className="mt-1 text-xs text-amber-200/90">
          <strong>設定</strong> の「API キー」欄、または リポジトリ直下の{" "}
          <code className="rounded bg-slate-800 px-1">.env</code> に、現在のプロバイダ{" "}
          <span className="font-mono">（{llm.provider}）</span> 用の環境変数
          {env != null && (
            <>
              {" "}
              <code className="rounded bg-slate-800 px-1">{env}</code>
            </>
          )}
          を記入してください。Docker 利用時は <code className="rounded bg-slate-800 px-1">docker compose up
          --build</code>{" "}
          で再ビルド後、設定を反映してください。ローカル <span className="font-mono">Ollama</span> だけ使う場合は
          設定の「LLM プロバイダ」を <code className="rounded bg-slate-800 px-1">ollama</code> に切り替え
          てください（キー不要）。
        </p>
        <p className="mt-2">
          <Link to="/settings" className="text-xs font-medium text-archon-400 hover:underline">
            設定画面を開く →
          </Link>
        </p>
      </div>
    </div>
  );
}
