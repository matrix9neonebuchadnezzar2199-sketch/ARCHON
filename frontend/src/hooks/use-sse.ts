import { useState, useCallback, useRef } from "react";
import { streamSSE } from "@/lib/api";
import type { SSEErrorEvent, SSEEvent, SSEProgressEvent, SSECompleteEvent } from "@/types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function parseSSEData(data: Record<string, unknown>): SSEEvent | null {
  if (!isRecord(data) || typeof data.type !== "string") {
    return null;
  }
  return data as unknown as SSEEvent;
}

/** LLM/HTTP の英語を UI 向け日本語に寄せる（中身の JSON はそのまま示さない想定） */
function humanizeLlmErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("401") ||
    m.includes("authentication") ||
    m.includes("bearer") ||
    m.includes("api key")
  ) {
    return "API キーが未設定、またはプロバイダと一致しません。リポジトリ直下の .env を確認し、必要なら docker compose 再ビルド、または 設定 → LLM プロバイダ / Ollama 利用を見直してください。";
  }
  return message;
}

interface UseSSEReturn {
  isRunning: boolean;
  progress: SSEProgressEvent[];
  result: Record<string, unknown> | null;
  error: string | null;
  run: (path: string, body: unknown) => Promise<void>;
  reset: () => void;
}

export function useSSE(): UseSSEReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SSEProgressEvent[]>([]);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);

  const reset = useCallback(() => {
    runId.current += 1;
    setIsRunning(false);
    setProgress([]);
    setResult(null);
    setError(null);
  }, []);

  const run = useCallback(
    async (path: string, body: unknown) => {
      const myRun = ++runId.current;
      setIsRunning(true);
      setProgress([]);
      setResult(null);
      setError(null);

      try {
        await streamSSE(
          path,
          body,
          (event) => {
            if (myRun !== runId.current) {
              return;
            }
            const data = event.data;
            if (!isRecord(data)) {
              return;
            }
            const ev = parseSSEData(data);
            if (!ev) {
              return;
            }
            switch (ev.type) {
              case "start":
                break;
              case "progress": {
                const p = ev as SSEProgressEvent;
                setProgress((prev) => [...prev, p]);
                break;
              }
              case "complete": {
                const c = ev as SSECompleteEvent;
                if ("data" in c && c.data) {
                  setResult(c.data as Record<string, unknown>);
                } else {
                  setResult({ result: c });
                }
                setIsRunning(false);
                break;
              }
              case "error": {
                const e = ev as SSEErrorEvent;
                setError(humanizeLlmErrorMessage(e.message));
                setIsRunning(false);
                break;
              }
              default:
                break;
            }
          },
          (err) => {
            if (myRun !== runId.current) {
              return;
            }
            setError(humanizeLlmErrorMessage(err.message));
            setIsRunning(false);
          },
        );
        if (myRun === runId.current) {
          setIsRunning(false);
        }
      } catch (err: unknown) {
        if (myRun === runId.current) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(humanizeLlmErrorMessage(msg));
          setIsRunning(false);
        }
      }
    },
    [],
  );

  return { isRunning, progress, result, error, run, reset };
}
