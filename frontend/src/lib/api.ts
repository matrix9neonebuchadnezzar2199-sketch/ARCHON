const BASE = "";

export async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function postJSON<T>(path: string, body: unknown): Promise<T> {
  return fetchJSON<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * POST an SSE stream (fetch + ReadableStream). Parses `event` + `data` lines.
 */
export async function streamSSE(
  path: string,
  body: unknown,
  onEvent: (event: { type: string; data: Record<string, unknown> }) => void,
  onError?: (error: Error) => void,
): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    throw new Error(`SSE error: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        if (!part.trim()) {
          continue;
        }

        const lines = part.split("\n");
        let eventType = "message";
        let dataStr = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            dataStr += line.slice(6);
          }
        }

        if (dataStr) {
          try {
            const data = JSON.parse(dataStr) as Record<string, unknown>;
            onEvent({ type: eventType, data });
          } catch {
            // ignore non-JSON chunk
          }
        }
      }
    }
  } catch (err) {
    if (onError) {
      onError(err as Error);
    } else {
      throw err;
    }
  }
}
