import { useState, useEffect, useCallback } from "react";
import { fetchJSON } from "@/lib/api";
import type { HealthResponse } from "@/types";

export function useHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [err, setErr] = useState<Error | null>(null);
  const refresh = useCallback(() => {
    fetchJSON<HealthResponse>("/api/archon/health")
      .then(setHealth)
      .catch((e) => setErr(e as Error));
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { health, error: err, refresh };
}
