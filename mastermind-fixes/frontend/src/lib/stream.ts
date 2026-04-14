/**
 * SSE / fetch streaming helper.
 * Reads a streaming fetch response and calls onChunk for each text chunk.
 * Works with FastAPI StreamingResponse (text/event-stream or text/plain).
 */
export async function readStream(
  response: Response,
  onChunk: (chunk: string) => void,
  onDone?: () => void
): Promise<void> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stream request failed ${response.status}: ${text}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No readable body on response");

  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });

    // Handle SSE format: lines starting with "data: "
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data && data !== "[DONE]") {
          onChunk(data);
        }
      } else if (line.trim()) {
        // Plain streaming (no SSE wrapper)
        onChunk(line);
      }
    }
  }

  onDone?.();
}


/**
 * Convenience wrapper: posts to a streaming endpoint and returns the
 * full accumulated string when the stream ends.
 */
export async function fetchStream(
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

  let result = "";
  await readStream(response, (chunk) => {
    result += chunk;
  });
  return result;
}
